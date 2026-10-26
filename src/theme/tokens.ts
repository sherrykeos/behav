/**
 * Behav Design System Tokens — Behav v1 Brand System (Dark Theme Default)
 *
 * Core Brand Palette:
 * - brand.obsidian: #101412 (Primary brand dark, dark-mode foundation)
 * - brand.graphite:#222925 (Dark elevated surfaces, cards, navigation)
 * - brand.mint:     #B9F6CA (Electric Mint: primary accent, green days, progress)
 * - brand.amber:    #FF9F43 (Signal Amber: recorded habit activity, attention)
 * - brand.ivory:    #F4F2EA (Warm Ivory: primary text, high-emphasis content)
 */

export const brand = {
  obsidian: '#101412',
  mint: '#B9F6CA',
  amber: '#FF9F43',
  graphite: '#222925',
  ivory: '#F4F2EA',
} as const;

export interface ThemeColors {
  // Brand foundation
  brand: typeof brand;

  // Base Surfaces
  bg: string;              // Primary screen background
  surface: string;         // Card & component surfaces
  surfaceElevated: string; // Elevated cards, modals, popovers, navigation
  surfaceSubtle: string;   // Secondary containers, quiet chips, inner wells
  surfaceHover: string;    // Pressed & interactive active state
  border: string;          // Primary borders & dividers
  borderSubtle: string;    // Hairline dividers & soft outlines

  // Typography
  textPrimary: string;     // High-emphasis text (WCAG AAA >= 7:1)
  textSecondary: string;   // Readable muted text (WCAG AA >= 4.5:1)
  textTertiary: string;    // Quiet captions, timestamps
  textInverse: string;     // Contrast text on inverted surfaces

  // Primary Action
  primary: string;         // High-emphasis action background
  primaryHover: string;    // Pressed state for primary action
  primaryLight: string;    // Soft tint background for primary accent
  primarySubtle: string;

  // Brand Accents
  accentPrimary: string;       // Electric Mint #B9F6CA
  accentPrimaryDark: string;   // Accessible companion on dark surfaces
  accentPrimarySubtle: string; // Soft mint tint for pills & highlights
  accentActivity: string;      // Signal Amber #FF9F43 (recorded activity)
  accentActivityDark: string;  // Accessible companion on dark surfaces
  accentActivitySubtle: string;// Soft amber tint for pills & notices

  // Status Indicators
  statusGreenDay: string;         // Mint indicator for zero-consumption days
  statusGreenDayDark: string;     // Mint label for status
  statusHabitActivity: string;    // Amber indicator for recorded habit days
  statusHabitActivityDark: string;// Amber label for status
  statusNeutralDot: string;       // Future / unrecorded calendar day dot

  // Chart Tokens
  chartTrack: string;
  chartBar: string;
  chartBarActive: string;
  chartBarAlert: string;
  chartLimitDot: string;

  // Compatibility / Soft tags
  lavender: string;
  lavenderText: string;
  sage: string;
  sageText: string;
  peach: string;
  peachText: string;
  sky: string;
  skyText: string;

  // Utility / Destructive (reserved strictly for errors & destructive acts)
  danger: string;
  dangerLight: string;
  dangerText: string;
}

export const darkColors: ThemeColors = {
  brand,

  // Base Surfaces
  bg: '#101412',              // Obsidian (Primary app canvas)
  surface: '#222925',         // Graphite (Cards & elevated surfaces)
  surfaceElevated: '#222925', // Graphite (Navigation dock, cards, modals)
  surfaceSubtle: '#181E1B',   // Darker recessed wells, inner chips, input wells
  surfaceHover: '#2A342F',    // Pressed & interactive active state
  border: '#2E3933',          // Subtle visible border against graphite & obsidian
  borderSubtle: '#222B26',    // Hairline divider

  // Typography (Warm Ivory on Obsidian/Graphite, >13:1 contrast)
  textPrimary: '#F4F2EA',     // Warm Ivory (Primary light text)
  textSecondary: '#9EAAA3',   // Muted neutral (>5.5:1 contrast)
  textTertiary: '#6B7771',    // Quiet captions, timestamps
  textInverse: '#101412',     // Obsidian text on Electric Mint buttons

  // Primary Action (Electric Mint button with Obsidian text in dark mode)
  primary: '#B9F6CA',
  primaryHover: '#A0E8B4',
  primaryLight: '#183424',
  primarySubtle: '#A0E8B4',

  // Brand Accents
  accentPrimary: '#B9F6CA',       // Electric Mint
  accentPrimaryDark: '#B9F6CA',   // Mint is high-contrast on dark surfaces (>15:1)
  accentPrimarySubtle: '#183424', // Subtle mint tint
  accentActivity: '#FF9F43',      // Signal Amber
  accentActivityDark: '#FF9F43',  // Amber is high-contrast on dark surfaces (>9:1)
  accentActivitySubtle: '#3B2613',// Subtle amber tint

  // Status Indicators
  statusGreenDay: '#B9F6CA',      // Mint dot on calendar & badges
  statusGreenDayDark: '#B9F6CA',
  statusHabitActivity: '#FF9F43', // Amber dot for recorded activity
  statusHabitActivityDark: '#FF9F43',
  statusNeutralDot: '#343E38',    // Unrecorded / future calendar dot

  // Chart Tokens
  chartTrack: '#181E1B',
  chartBar: '#1A3826',
  chartBarActive: '#B9F6CA',
  chartBarAlert: '#FF9F43',
  chartLimitDot: '#FF9F43',

  // Compatibility / Soft tags
  lavender: '#181E1B',
  lavenderText: '#9EAAA3',
  sage: '#183424',
  sageText: '#B9F6CA',
  peach: '#3B2613',
  peachText: '#FF9F43',
  sky: '#181E1B',
  skyText: '#9EAAA3',

  // Utility / Destructive (reserved strictly for errors & destructive acts)
  danger: '#E05353',
  dangerLight: '#2E1818',
  dangerText: '#FF8585',
};

// Light theme definition preserved for token reference
export const lightColors: ThemeColors = {
  brand,

  bg: '#F4F2EA',
  surface: '#FAF8F2',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#ECE7DC',
  surfaceHover: '#E2DDD0',
  border: '#DDD7CA',
  borderSubtle: '#E8E3D7',

  textPrimary: '#101412',
  textSecondary: '#4A544F',
  textTertiary: '#7A857F',
  textInverse: '#F4F2EA',

  primary: '#101412',
  primaryHover: '#222925',
  primaryLight: '#D6F7E1',
  primarySubtle: '#222925',

  accentPrimary: '#B9F6CA',
  accentPrimaryDark: '#126137',
  accentPrimarySubtle: '#D6F7E1',
  accentActivity: '#FF9F43',
  accentActivityDark: '#9C4B00',
  accentActivitySubtle: '#FFEACC',

  statusGreenDay: '#B9F6CA',
  statusGreenDayDark: '#126137',
  statusHabitActivity: '#FF9F43',
  statusHabitActivityDark: '#9C4B00',
  statusNeutralDot: '#D0C9BA',

  chartTrack: '#ECE7DC',
  chartBar: '#D6F7E1',
  chartBarActive: '#126137',
  chartBarAlert: '#FF9F43',
  chartLimitDot: '#FF9F43',

  lavender: '#ECE7DC',
  lavenderText: '#4A544F',
  sage: '#D6F7E1',
  sageText: '#126137',
  peach: '#FFEACC',
  peachText: '#9C4B00',
  sky: '#ECE7DC',
  skyText: '#4A544F',

  danger: '#E05353',
  dangerLight: '#FDECEC',
  dangerText: '#8E2828',
};

// Dark mode is the app's default and only active theme
export const colors: ThemeColors = darkColors;

export function getThemeColors(): ThemeColors {
  return darkColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const typography = {
  titleLarge: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  titleMedium: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  titleSmall: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
    color: colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: colors.textTertiary,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
};

export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
