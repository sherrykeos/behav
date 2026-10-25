/**
 * Behav Design System Tokens
 * Derived from context.md and the design reference:
 * Warm ivory / cream base, soft lavender, peach, sage, and periwinkle accents.
 */

export const colors = {
  // Base Surfaces
  bg: '#FAF7F2',              // Warm ivory / cream background
  surface: '#FFFFFF',         // Crisp clean card surface
  surfaceSubtle: '#F4F0E8',   // Inner containers, pill tags, quiet backgrounds
  surfaceHover: '#EBE5D9',    // Pressed states
  border: '#E8E2D5',          // Subtle card and divider borders
  borderSubtle: '#F2ECE1',

  // Typography (accessible contrast on warm cream and white)
  textPrimary: '#201E26',     // Deep warm charcoal (>10:1 contrast)
  textSecondary: '#666272',   // Muted soft slate (>4.5:1 contrast)
  textTertiary: '#9692A2',    // Subtle timestamps and quiet captions
  textInverse: '#FFFFFF',

  // Primary Accent (Periwinkle / Cornflower Blue)
  primary: '#4865F4',         // Main action color
  primaryHover: '#3853E0',
  primaryLight: '#EEF2FF',    // Light periwinkle tint
  primarySubtle: '#5A75FA',

  // Soft Pastel Accents
  lavender: '#E8E4F8',        // Accent card / tag
  lavenderText: '#4D4080',
  sage: '#D9EDE3',            // Calm positive / completed status
  sageText: '#265C42',
  peach: '#FCE5D8',           // Warm notice / limit highlight
  peachText: '#874921',
  sky: '#E1EDF9',             // Calm header / ambient tint
  skyText: '#235077',

  // Feedback / Utility
  danger: '#E05353',
  dangerLight: '#FDECEC',
  dangerText: '#8E2828',
};

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
    shadowColor: '#2C2738',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: '#4865F4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
};
