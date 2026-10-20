/**
 * Behav Design System: Color Tokens
 * Precisely matched to the Behav UI Showcase reference design.
 */

export const colors = {
  // Deep dark backgrounds with subtle charcoal-green undertones
  background: {
    base: '#0B0F0D',         // Canvas background (near-black with deep sage undertone)
    surface: '#111613',      // Primary surface (panels, navigation bar, headers)
    card: '#141A16',         // Standard card background
    elevated: '#171E19',     // Elevated card / modal surface
    highlight: '#1F2922',    // Active / pressed state
    glass: 'rgba(17, 22, 19, 0.88)',

    border: '#1B241E',       // Ultra-clean 1px panel border
    borderSubtle: '#161D18', // Hairline dividers
    borderFocus: '#4ADE80',  // Active accent outline
  },

  // Primary Progress Accent: Muted Sage & Mint Green
  primary: {
    base: '#4ADE80',         // Vibrant muted sage green (within-limit / streaks)
    light: '#86EFAC',        // Soft bright green
    mint: '#5EEAD4',         // Soft mint highlight
    emerald: '#10B981',      // Confirmed abstinence green
    dark: '#143322',         // Deep green container background
    faint: 'rgba(74, 222, 128, 0.12)', // Subtle badge fill
    border: 'rgba(74, 222, 128, 0.28)', // Badge border
    glow: 'rgba(74, 222, 128, 0.4)',
  },

  // Signature Warm Cream / Peach / Ivory (from showcase buttons & quotes)
  warm: {
    cream: '#F3E8D8',        // Signature primary action button fill ("Save Entry", "Keep Going")
    creamLight: '#FAF4EB',   // Highlight / text on dark
    creamDark: '#12100E',    // Dark contrast text for cream buttons
    card: '#1B1713',         // Motivation card background with warm peach/amber tint
    border: '#332A22',       // Warm card border
    peach: '#FDBA74',        // Peach accent for subtle badges
  },

  // Semantic & Category Accents
  accents: {
    coral: '#F87171',        // Lapses / over-limit / events (Cigarettes, Over Limit)
    coralFaint: 'rgba(248, 113, 113, 0.14)',
    coralBorder: 'rgba(248, 113, 113, 0.32)',

    amber: '#FBBF24',        // Pending daily reviews / caution / Junk Food
    amberFaint: 'rgba(251, 191, 36, 0.12)',
    amberBorder: 'rgba(251, 191, 36, 0.28)',

    cyan: '#38BDF8',         // Screen time / productivity
    cyanFaint: 'rgba(56, 189, 248, 0.12)',
    cyanBorder: 'rgba(56, 189, 248, 0.28)',

    blue: '#38BDF8',         // Compatibility alias
    blueFaint: 'rgba(56, 189, 248, 0.12)',
    blueBorder: 'rgba(56, 189, 248, 0.28)',

    rose: '#FB7185',         // Alcohol / Masturbation / sensitive behaviors
    roseFaint: 'rgba(251, 113, 133, 0.12)',
    roseBorder: 'rgba(251, 113, 133, 0.28)',

    purple: '#A78BFA',       // Mindfulness / advanced analytics
    purpleFaint: 'rgba(167, 139, 250, 0.12)',
    purpleBorder: 'rgba(167, 139, 250, 0.28)',

    gray: '#64748B',
    grayFaint: 'rgba(100, 116, 139, 0.12)',
  },

  // Typography Palette: Warm ivory rather than harsh cold white
  text: {
    primary: '#F4F5F2',      // Warm ivory title and metric text
    secondary: '#A1B1A7',    // Sage-tinted body & secondary descriptions
    muted: '#617167',        // Timestamps, hints, inactive labels
    faint: '#3D4942',        // Disabled text / subtle markers
    inverse: '#0B0F0D',      // Dark text on bright backgrounds
    cream: '#F3E8D8',        // Warm quote / branding text
  },

  // Semantic Goal & Streak status
  status: {
    withinLimit: '#4ADE80',
    overLimit: '#F87171',
    pending: '#FBBF24',
    notLogged: '#435148',
    confirmedZero: '#10B981',
  }
};
