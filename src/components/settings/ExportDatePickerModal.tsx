import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { toDayString, formatFriendlyDate } from '@/utils/date';
import type { RecordBounds } from '@/db';

interface ExportDatePickerModalProps {
  visible: boolean;
  recordBounds: RecordBounds;
  onClose: () => void;
  onExport: (options: {
    startDate?: string;
    endDate?: string;
    format: 'json' | 'csv';
    filenameSummary: string;
  }) => Promise<void>;
}

type ExportMode = 'all' | 'range' | 'single';
type ExportFormat = 'json' | 'csv';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ExportDatePickerModal: React.FC<ExportDatePickerModalProps> = ({
  visible,
  recordBounds,
  onClose,
  onExport,
}) => {
  const { earliestDate, latestDate, recordedDates, totalEntries, recordedDaysCount } = recordBounds;
  const recordedDatesSet = useMemo(() => new Set(recordedDates), [recordedDates]);

  const today = useMemo(() => toDayString(), []);
  const effectiveLatest = latestDate || today;

  // Selected scope
  const [mode, setMode] = useState<ExportMode>('all');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [singleDate, setSingleDate] = useState<string>(effectiveLatest);
  const [startDate, setStartDate] = useState<string>(earliestDate || effectiveLatest);
  const [endDate, setEndDate] = useState<string>(effectiveLatest);
  const [isExporting, setIsExporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Reset or initialize state when opening
  useEffect(() => {
    if (visible) {
      setMode('all');
      setFormat('json');
      setValidationError(null);
      setIsExporting(false);

      const initialLatest = latestDate || today;
      const initialEarliest = earliestDate || initialLatest;
      setSingleDate(initialLatest);
      setStartDate(initialEarliest);
      setEndDate(initialLatest);

      // Default calendar view to month of latest recorded date
      if (initialLatest) {
        const [y, m] = initialLatest.split('-').map(Number);
        setCalendarDate(new Date(y, m - 1, 1));
      } else {
        setCalendarDate(new Date());
      }
    }
  }, [visible, earliestDate, latestDate, today]);

  // Determine earliest year and month
  const earliestYearMonth = useMemo(() => {
    if (!earliestDate) return null;
    const [y, m] = earliestDate.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [earliestDate]);

  // Determine latest year and month
  const latestYearMonth = useMemo(() => {
    const target = latestDate || today;
    const [y, m] = target.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [latestDate, today]);

  // Check if calendar can go back
  const canGoPrevMonth = useMemo(() => {
    if (!earliestYearMonth) return true;
    const currentYear = calendarDate.getFullYear();
    const currentMonth = calendarDate.getMonth();
    return (
      currentYear > earliestYearMonth.year ||
      (currentYear === earliestYearMonth.year && currentMonth > earliestYearMonth.month)
    );
  }, [calendarDate, earliestYearMonth]);

  // Check if calendar can go forward
  const canGoNextMonth = useMemo(() => {
    if (!latestYearMonth) return true;
    const currentYear = calendarDate.getFullYear();
    const currentMonth = calendarDate.getMonth();
    return (
      currentYear < latestYearMonth.year ||
      (currentYear === latestYearMonth.year && currentMonth < latestYearMonth.month)
    );
  }, [calendarDate, latestYearMonth]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate calendar days
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isPad: boolean;
      isBeforeRecordStart: boolean;
      isFuture: boolean;
      hasRecord: boolean;
      isSelected: boolean;
      isInRange: boolean;
      isRangeStart: boolean;
      isRangeEnd: boolean;
    }> = [];

    // Leading padding slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dayNumber: 0,
        dateString: '',
        isPad: true,
        isBeforeRecordStart: true,
        isFuture: false,
        hasRecord: false,
        isSelected: false,
        isInRange: false,
        isRangeStart: false,
        isRangeEnd: false,
      });
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${pad(month + 1)}-${pad(d)}`;
      const isBeforeRecordStart = !!(earliestDate && dateString < earliestDate);
      const isFuture = dateString > today;
      const hasRecord = recordedDatesSet.has(dateString);

      let isSelected = false;
      let isInRange = false;
      let isRangeStart = false;
      let isRangeEnd = false;

      if (mode === 'single') {
        isSelected = dateString === singleDate;
      } else if (mode === 'range') {
        isRangeStart = dateString === startDate;
        isRangeEnd = dateString === endDate;
        isSelected = isRangeStart || isRangeEnd;
        isInRange = dateString >= startDate && dateString <= endDate;
      } else if (mode === 'all') {
        isInRange = !!(earliestDate && dateString >= earliestDate && dateString <= effectiveLatest);
      }

      days.push({
        dayNumber: d,
        dateString,
        isPad: false,
        isBeforeRecordStart,
        isFuture,
        hasRecord,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
      });
    }

    return days;
  }, [calendarDate, earliestDate, effectiveLatest, mode, recordedDatesSet, singleDate, startDate, endDate, today]);

  // Handle day tap on calendar
  const handleDayPress = (day: typeof calendarGrid[0]) => {
    if (day.isPad) return;

    // Strict Validation: Cannot pick date before record start date
    if (day.isBeforeRecordStart) {
      setValidationError(
        `Record history starts on ${earliestDate ? formatFriendlyDate(earliestDate) : 'a later date'}. You cannot select dates prior to this.`
      );
      return;
    }

    // Strict Validation: Cannot pick future dates
    if (day.isFuture) {
      setValidationError('Cannot select a future date.');
      return;
    }

    if (mode === 'single') {
      // Strict Validation: in single date export, must pick a date where a record exists
      if (!day.hasRecord) {
        setValidationError(
          `No records found on ${formatFriendlyDate(day.dateString)}. Please select a date with recorded activity (marked with a green dot).`
        );
        return;
      }

      setSingleDate(day.dateString);
      setValidationError(null);
    } else if (mode === 'range') {
      // In range mode: toggle start and end date
      if (!startDate || (startDate && endDate && startDate !== endDate)) {
        setStartDate(day.dateString);
        setEndDate(day.dateString);
        setValidationError(null);
      } else if (startDate && (!endDate || startDate === endDate)) {
        if (day.dateString < startDate) {
          // If clicked before start, make it new start
          setStartDate(day.dateString);
          setValidationError(null);
        } else {
          setEndDate(day.dateString);
          // Check if range contains at least 1 record
          const hasRecordInRange = recordedDates.some(
            (d) => d >= startDate && d <= day.dateString
          );
          if (!hasRecordInRange) {
            setValidationError('The selected date range contains no recorded entries.');
          } else {
            setValidationError(null);
          }
        }
      }
    }
  };

  // Compute records count and active days in current selection
  const { selectedRecordsCount, selectedDaysCount, summaryLabel } = useMemo(() => {
    if (mode === 'all') {
      return {
        selectedRecordsCount: totalEntries,
        selectedDaysCount: recordedDaysCount,
        summaryLabel: earliestDate
          ? `${formatFriendlyDate(earliestDate)} to ${formatFriendlyDate(effectiveLatest)}`
          : 'All records',
      };
    }

    if (mode === 'single') {
      const hasRecord = recordedDatesSet.has(singleDate);
      return {
        selectedRecordsCount: hasRecord ? 1 : 0,
        selectedDaysCount: hasRecord ? 1 : 0,
        summaryLabel: formatFriendlyDate(singleDate),
      };
    }

    // Range mode
    const count = recordedDates.filter((d) => d >= startDate && d <= endDate).length;
    return {
      selectedRecordsCount: count,
      selectedDaysCount: count,
      summaryLabel: `${formatFriendlyDate(startDate)} – ${formatFriendlyDate(endDate)}`,
    };
  }, [mode, totalEntries, recordedDaysCount, earliestDate, effectiveLatest, singleDate, startDate, endDate, recordedDates, recordedDatesSet]);

  const canExport = useMemo(() => {
    if (totalEntries === 0) return false;
    if (validationError) return false;
    if (mode === 'single') {
      return recordedDatesSet.has(singleDate);
    }
    if (mode === 'range') {
      return selectedDaysCount > 0;
    }
    return true;
  }, [totalEntries, validationError, mode, singleDate, recordedDatesSet, selectedDaysCount]);

  const handleExportSubmit = async () => {
    if (!canExport) return;
    setIsExporting(true);
    setValidationError(null);

    try {
      let exportStart: string | undefined;
      let exportEnd: string | undefined;

      if (mode === 'single') {
        exportStart = singleDate;
        exportEnd = singleDate;
      } else if (mode === 'range') {
        exportStart = startDate;
        exportEnd = endDate;
      }

      await onExport({
        startDate: exportStart,
        endDate: exportEnd,
        format,
        filenameSummary:
          mode === 'all'
            ? 'all'
            : mode === 'single'
            ? singleDate
            : `${startDate}_to_${endDate}`,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to generate export file.');
    } finally {
      setIsExporting(false);
    }
  };

  const monthYearTitle = calendarDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Export Records</Text>
              <Text style={styles.subtitle}>Select timeframe and file format</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Record Horizon Information Box */}
            <View style={styles.horizonBox}>
              <Ionicons name="calendar-outline" size={18} color={colors.accentPrimary} />
              <View style={styles.horizonContent}>
                <Text style={styles.horizonLabel}>Database Record Span</Text>
                <Text style={styles.horizonDates}>
                  {earliestDate
                    ? `${formatFriendlyDate(earliestDate)} — ${formatFriendlyDate(effectiveLatest)}`
                    : 'No records logged yet'}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {totalEntries} logs • {recordedDaysCount} days
                </Text>
              </View>
            </View>

            {/* Mode Selector Tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'all' && styles.modeTabActive]}
                onPress={() => {
                  setMode('all');
                  setValidationError(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="infinite-outline"
                  size={16}
                  color={mode === 'all' ? '#101412' : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, mode === 'all' && styles.modeTabTextActive]}>
                  All Time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mode === 'range' && styles.modeTabActive]}
                onPress={() => {
                  setMode('range');
                  setValidationError(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={16}
                  color={mode === 'range' ? '#101412' : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, mode === 'range' && styles.modeTabTextActive]}>
                  Date Range
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mode === 'single' && styles.modeTabActive]}
                onPress={() => {
                  setMode('single');
                  setValidationError(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="today-outline"
                  size={16}
                  color={mode === 'single' ? '#101412' : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, mode === 'single' && styles.modeTabTextActive]}>
                  Single Day
                </Text>
              </TouchableOpacity>
            </View>

            {/* Validation Feedback Warning */}
            {validationError && (
              <View style={styles.validationBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.accentActivity} />
                <Text style={styles.validationText}>{validationError}</Text>
              </View>
            )}

            {/* Calendar View for Range or Single Date */}
            {mode !== 'all' && (
              <View style={styles.calendarContainer}>
                {/* Calendar Month Header */}
                <View style={styles.monthHeader}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    disabled={!canGoPrevMonth}
                    style={[styles.navBtn, !canGoPrevMonth && styles.navBtnDisabled]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={canGoPrevMonth ? colors.textPrimary : colors.textTertiary}
                    />
                  </TouchableOpacity>

                  <Text style={styles.monthTitle}>{monthYearTitle}</Text>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    disabled={!canGoNextMonth}
                    style={[styles.navBtn, !canGoNextMonth && styles.navBtnDisabled]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={canGoNextMonth ? colors.textPrimary : colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Weekday Row */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((w, idx) => (
                    <Text key={idx} style={styles.weekdayText}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarGrid.map((day, idx) => {
                    if (day.isPad) {
                      return <View key={idx} style={styles.daySlot} />;
                    }

                    const isDisabled = day.isBeforeRecordStart || day.isFuture;
                    const isSelected = day.isSelected;
                    const isInRange = day.isInRange && !isSelected;

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.daySlot,
                          isDisabled && styles.dayDisabled,
                          isInRange && styles.dayInRange,
                          isSelected && styles.daySelected,
                        ]}
                        disabled={isDisabled}
                        onPress={() => handleDayPress(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            isDisabled && styles.dayNumberDisabled,
                            isInRange && styles.dayNumberInRange,
                            isSelected && styles.dayNumberSelected,
                          ]}
                        >
                          {day.dayNumber}
                        </Text>
                        {day.hasRecord && (
                          <View
                            style={[
                              styles.recordDot,
                              isSelected && styles.recordDotSelected,
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}>
                    <View style={styles.legendDot} />
                    <Text style={styles.legendText}>Recorded Activity</Text>
                  </View>
                  <Text style={styles.legendHelper}>
                    {mode === 'single'
                      ? 'Tap any active date to select'
                      : 'Tap start date then end date'}
                  </Text>
                </View>
              </View>
            )}

            {/* Selection Summary Pill */}
            <View style={styles.summaryPill}>
              <View style={styles.summaryLeft}>
                <Ionicons name="filter-outline" size={16} color={colors.accentPrimary} />
                <View>
                  <Text style={styles.summaryScopeTitle}>Export Scope</Text>
                  <Text style={styles.summaryScopeDates}>{summaryLabel}</Text>
                </View>
              </View>
              <View style={styles.summaryCountBadge}>
                <Text style={styles.summaryCountText}>
                  {selectedDaysCount} {selectedDaysCount === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>

            {/* Format Selection */}
            <View style={styles.formatSection}>
              <Text style={styles.sectionLabel}>Export Format</Text>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatOption, format === 'json' && styles.formatOptionActive]}
                  onPress={() => setFormat('json')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="code-slash-outline"
                    size={18}
                    color={format === 'json' ? colors.accentPrimary : colors.textSecondary}
                  />
                  <View style={styles.formatInfo}>
                    <Text
                      style={[
                        styles.formatTitle,
                        format === 'json' && styles.formatTitleActive,
                      ]}
                    >
                      JSON Backup (.json)
                    </Text>
                    <Text style={styles.formatDesc}>Canonical BHFile v1 format</Text>
                  </View>
                  {format === 'json' && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accentPrimary} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatOption, format === 'csv' && styles.formatOptionActive]}
                  onPress={() => setFormat('csv')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="grid-outline"
                    size={18}
                    color={format === 'csv' ? colors.accentPrimary : colors.textSecondary}
                  />
                  <View style={styles.formatInfo}>
                    <Text
                      style={[
                        styles.formatTitle,
                        format === 'csv' && styles.formatTitleActive,
                      ]}
                    >
                      CSV Table (.csv)
                    </Text>
                    <Text style={styles.formatDesc}>Spreadsheet compatible</Text>
                  </View>
                  {format === 'csv' && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accentPrimary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isExporting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, (!canExport || isExporting) && styles.btnDisabled]}
              onPress={handleExportSubmit}
              disabled={!canExport || isExporting}
              activeOpacity={0.7}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#101412" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={16} color="#101412" />
                  <Text style={styles.exportBtnText}>Export & Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
  },
  horizonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  horizonContent: {
    flex: 1,
  },
  horizonLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  horizonDates: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  badge: {
    backgroundColor: colors.accentPrimarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    fontSize: 11,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
    marginVertical: spacing.sm,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: colors.accentPrimary,
  },
  modeTabText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  modeTabTextActive: {
    color: '#101412',
    fontWeight: '600',
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.accentActivity,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginVertical: spacing.xs,
  },
  validationText: {
    ...typography.bodySmall,
    color: colors.peachText,
    flex: 1,
    fontSize: 12,
  },
  calendarContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.25,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  daySlot: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    position: 'relative',
    marginVertical: 1,
  },
  dayDisabled: {
    opacity: 0.18,
  },
  dayInRange: {
    backgroundColor: `${colors.accentPrimary}1A`,
    borderRadius: 0,
  },
  daySelected: {
    backgroundColor: colors.accentPrimary,
    borderRadius: radii.sm,
  },
  dayNumber: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontSize: 12,
  },
  dayNumberDisabled: {
    color: colors.textTertiary,
  },
  dayNumberInRange: {
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: '#101412',
    fontWeight: '700',
  },
  recordDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentPrimary,
    position: 'absolute',
    bottom: 2,
  },
  recordDotSelected: {
    backgroundColor: '#101412',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPrimary,
  },
  legendText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  legendHelper: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  summaryScopeTitle: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  summaryScopeDates: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  summaryCountBadge: {
    backgroundColor: colors.accentPrimarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  summaryCountText: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  formatSection: {
    marginVertical: spacing.sm,
    gap: 6,
  },
  sectionLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formatRow: {
    gap: 8,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  formatOptionActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: `${colors.accentPrimary}0D`,
  },
  formatInfo: {
    flex: 1,
  },
  formatTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
  formatTitleActive: {
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  formatDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSubtle,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  cancelText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  exportBtnText: {
    ...typography.labelLarge,
    color: '#101412',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
