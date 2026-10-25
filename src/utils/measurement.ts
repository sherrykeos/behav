/**
 * Measurement Integrity Module for Behav
 * Defines canonical units, measurement categories, and quantity validation.
 */

export type MeasurementType = 'count' | 'duration' | 'volume' | 'custom';

export interface UnitDefinition {
  unit: string;
  type: MeasurementType;
  label: string;
  isDiscrete: boolean;
  canonicalUnit?: string;
}

export const CANONICAL_UNITS: Record<string, UnitDefinition> = {
  // Discrete Counts
  times: { unit: 'times', type: 'count', label: 'Times', isDiscrete: true },
  count: { unit: 'count', type: 'count', label: 'Count', isDiscrete: true },
  occurrences: { unit: 'occurrences', type: 'count', label: 'Occurrences', isDiscrete: true },
  cigarettes: { unit: 'cigarettes', type: 'count', label: 'Cigarettes', isDiscrete: true },
  cups: { unit: 'cups', type: 'count', label: 'Cups', isDiscrete: true },
  glasses: { unit: 'glasses', type: 'count', label: 'Glasses', isDiscrete: true },
  pages: { unit: 'pages', type: 'count', label: 'Pages', isDiscrete: true },
  pills: { unit: 'pills', type: 'count', label: 'Pills', isDiscrete: true },
  items: { unit: 'items', type: 'count', label: 'Items', isDiscrete: true },

  // Duration
  minutes: { unit: 'minutes', type: 'duration', label: 'Minutes', isDiscrete: false },
  hours: { unit: 'hours', type: 'duration', label: 'Hours', isDiscrete: false },
  seconds: { unit: 'seconds', type: 'duration', label: 'Seconds', isDiscrete: false },

  // Volume
  ml: { unit: 'ml', type: 'volume', label: 'Milliliters (mL)', isDiscrete: false },
  l: { unit: 'l', type: 'volume', label: 'Liters (L)', isDiscrete: false },
  oz: { unit: 'oz', type: 'volume', label: 'Ounces (fl oz)', isDiscrete: false },
};

/**
 * Returns the measurement type for a given unit string
 */
export function getMeasurementType(unit: string): MeasurementType {
  const normalized = (unit || '').trim().toLowerCase();
  return CANONICAL_UNITS[normalized]?.type || 'custom';
}

/**
 * Returns whether a given unit represents discrete integer counts
 */
export function isDiscreteUnit(unit: string): boolean {
  const normalized = (unit || '').trim().toLowerCase();
  if (CANONICAL_UNITS[normalized]) {
    return CANONICAL_UNITS[normalized].isDiscrete;
  }
  // Custom unit defaults to discrete if not standard continuous physical dimension
  return true;
}

/**
 * Validates a logged quantity against unit constraints
 */
export function validateQuantity(
  value: number,
  unit: string
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || isNaN(value)) {
    return { isValid: false, error: 'Quantity must be a valid number.' };
  }

  if (value <= 0) {
    return { isValid: false, error: 'Quantity must be greater than zero.' };
  }

  // Large overflow check (e.g. > 1,000,000 in a single log)
  if (value > 1_000_000) {
    return { isValid: false, error: 'Quantity exceeds maximum allowed limit (1,000,000).' };
  }

  return { isValid: true };
}

/**
 * Formats a quantity with its unit for display
 */
export function formatQuantityWithUnit(value: number, unit: string): string {
  const formattedNum = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formattedNum} ${unit}`;
}
