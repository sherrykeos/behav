/**
 * Behav Design System: Typography Scale
 * High-legibility modern sans-serif with refined editorial hierarchy.
 */

export const typography = {
  // Hero numbers & huge streak displays (e.g. 12 Day Streak, 1 count)
  displayHero: {
    fontSize: 54,
    fontWeight: '700' as const,
    letterSpacing: -1.5,
    lineHeight: 60
  },
  displayLarge: {
    fontSize: 38,
    fontWeight: '700' as const,
    letterSpacing: -1,
    lineHeight: 44
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    lineHeight: 34
  },

  // Headings
  h1: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 32
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 26
  },
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22
  },

  // Body & Descriptions
  bodyLarge: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.1
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 19,
    letterSpacing: 0
  },
  bodyBold: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 19,
    letterSpacing: 0
  },

  // Small labels, timestamps & microcopy
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 15,
    letterSpacing: 0.1
  },
  captionBold: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 15,
    letterSpacing: 0.2
  },

  // Editorial quote style (e.g. "Awareness is the first step toward change.")
  quote: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontStyle: 'italic' as const,
    lineHeight: 19,
    letterSpacing: 0.1
  },

  serifFamily: 'serif',

  mono: {
    fontSize: 12,
    fontFamily: 'monospace'
  }
};
