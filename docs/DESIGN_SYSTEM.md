# Behav Design System — v1 Dark Theme Specification

**Authoritative Visual & Design System Guide for Behav**  
*Last updated: October 2026*

---

## A. Brand Identity & Purpose

Behav is an offline-first behavior-tracking mobile application designed to help individuals recognize subconscious patterns, track undesirable behaviors, break destructive cycles, and make sustainable progress without shame, guilt, or judgment.

### Core Visual Principles

1. **Premium & Distinctive**: Technical depth, focused typography, and deliberate contrast inspired by precision tools.
2. **Minimal & Calm**: A dark canvas that reduces cognitive load and visual noise. No distracting neon glows, heavy gradients, or cluttered widgets.
3. **Intentional & Functional**: Every pixel, token, and spacing value serves a specific communicative function.
4. **Encouraging Without Childishness**: Positive reinforcement through clean Electric Mint progress indicators, avoiding cartoonish celebration or patronizing gamification.
5. **Non-Judgmental & Neutral**: When habit occurrences are logged, Signal Amber clearly reports recorded activity without moralizing, red alarms, or negative punishment.

---

## B. Official Brand Palette

Behav uses an approved 5-color core palette. These hex values are permanent and must never be altered without explicit product owner approval.

| Token | Hex | Role | Semantics & Meaning |
|---|---|---|---|
| `brand.obsidian` | `#101412` | Primary Canvas / Background | Deep, warm charcoal-black canvas. Creates focus and depth. |
| `brand.graphite` | `#222925` | Elevated Surfaces & Cards | Elevated dark surface for cards, dock, and sheets. |
| `brand.mint` | `#B9F6CA` | Primary Brand Accent | Electric Mint. Represents progress, awareness, and green days. |
| `brand.amber` | `#FF9F43` | Activity & Attention Indicator | Signal Amber. Communicates recorded habit activity calmly. |
| `brand.ivory` | `#F4F2EA` | High-Emphasis Text & Content | Warm Ivory. Provides crisp, readable contrast without harsh white glare. |

---

## C. Semantic Color Tokens (Dark Theme Default)

Dark mode is the **official, default, and only active theme** of Behav. Components must consume semantic tokens from `src/theme/tokens.ts` (`colors.*`), never raw hex codes.

```ts
import { colors, spacing, radii, typography, shadows } from '@/theme';
```

### 1. Canvas & Surface Elevation
| Token | Hex | Description / Usage |
|---|---|---|
| `colors.bg` | `#101412` | Main screen background canvas (Obsidian). |
| `colors.surface` | `#222925` | Standard card and container surface (Graphite). |
| `colors.surfaceElevated` | `#222925` | Elevated sheets, navigation dock, floating dialogs. |
| `colors.surfaceSubtle` | `#181E1B` | Recessed wells, input background, secondary chips. |
| `colors.surfaceHover` | `#2A342F` | Pressed touch states and touchable feedback. |
| `colors.border` | `#2E3933` | Primary card and component boundaries. |
| `colors.borderSubtle` | `#222B26` | Hairline dividers and inner separators. |

### 2. Typography
| Token | Hex | Minimum Contrast on `#101412` | Purpose |
|---|---|---|---|
| `colors.textPrimary` | `#F4F2EA` | **16.8 : 1** (AAA) | Headings, primary labels, counts, active values. |
| `colors.textSecondary` | `#9EAAA3` | **7.9 : 1** (AAA) | Descriptive copy, units, timestamps, subtitles. |
| `colors.textTertiary` | `#6B7771` | **4.6 : 1** (AA) | Quiet captions, subtle meta details. |
| `colors.textInverse` | `#101412` | **15.4 : 1** on Mint | Dark Obsidian text placed on Electric Mint buttons. |

### 3. Primary Actions & Accents
| Token | Hex | Usage |
|---|---|---|
| `colors.primary` | `#B9F6CA` | Electric Mint primary action button background. |
| `colors.primaryHover` | `#A0E8B4` | Pressed state for primary action buttons. |
| `colors.primaryLight` | `#183424` | Muted dark-mint tint for subtle button backgrounds. |
| `colors.accentPrimary` | `#B9F6CA` | Electric Mint accent for icons, active navigation tabs, progress. |
| `colors.accentPrimarySubtle` | `#183424` | Subtle dark-mint container background for badges & chips. |
| `colors.accentActivity` | `#FF9F43` | Signal Amber for habit activity, alerts, and limit indicators. |
| `colors.accentActivitySubtle` | `#3B2613` | Subtle dark-amber background for notice callouts and pills. |

### 4. Status & Calendar Indicators
| Token | Hex | Meaning |
|---|---|---|
| `colors.statusGreenDay` | `#B9F6CA` | Green Day: All tracked bad habits had quantity = 0. |
| `colors.statusHabitActivity` | `#FF9F43` | Logged Day: One or more tracked habits had recorded quantity > 0. |
| `colors.statusNeutralDot` | `#343E38` | Future / unrecorded calendar date dot. |

### 5. Charts & Analytics
| Token | Hex | Usage |
|---|---|---|
| `colors.chartTrack` | `#181E1B` | Empty bar column track. |
| `colors.chartBar` | `#1A3826` | Standard historical habit bar fill. |
| `colors.chartBarActive` | `#B9F6CA` | Selected or today's active bar fill. |
| `colors.chartBarAlert` | `#FF9F43` | Over-limit or attention bar fill. |
| `colors.chartLimitDot` | `#FF9F43` | Daily target indicator dot. |

### 6. Utility & Error (Destructive Only)
| Token | Hex | Usage |
|---|---|---|
| `colors.danger` | `#E05353` | Permanent delete confirmation, destructive actions. |
| `colors.dangerLight` | `#2E1818` | Destructive error banner background. |
| `colors.dangerText` | `#FF8585` | Error validation message text. |

---

## D. Component Usage Rules

### 1. Buttons (`src/components/common/Button.tsx`)
- **Primary**: Background `colors.primary` (`#B9F6CA`), text `colors.textInverse` (`#101412`). Used strictly for the single primary call to action on a screen or modal.
- **Secondary**: Background `colors.surfaceSubtle` (`#181E1B`), border `colors.border` (`#2E3933`), text `colors.textPrimary` (`#F4F2EA`).
- **Ghost**: Transparent background, text `colors.textPrimary` or `colors.accentPrimary`.
- **Danger**: Background `colors.danger` (`#E05353`), text `#FFFFFF`. Reserved exclusively for irreversible data loss actions (e.g., permanent behavior deletion).

### 2. Cards & Containers (`src/components/common/Card.tsx`)
- Cards use `backgroundColor: colors.surface` (`#222925` Graphite) with `borderColor: colors.borderSubtle` (`#222B26`) or `colors.border` (`#2E3933`).
- Sub-containers or recessed wells within a card use `backgroundColor: colors.surfaceSubtle` (`#181E1B`).

### 3. Floating Navigation Dock (`src/app/(tabs)/_layout.tsx`)
- Outer container uses `backgroundColor: 'transparent'` with `pointerEvents="box-none"`, allowing content to scroll smoothly under the floating bar.
- Dock capsule uses a translucent dark glassmorphic styling (`rgba(26, 33, 29, 0.78)`), subtle glass specular border (`rgba(255, 255, 255, 0.14)`), and elevation blur shadows.
- **Icon-Only Layout**: Text labels are eliminated to prioritize a minimal, calm, and uncluttered mobile interface.
- Active tab pill uses an illuminated translucent mint halo (`rgba(185, 246, 202, 0.14)`) with an Electric Mint icon (`colors.accentPrimary` `#B9F6CA`).
- Inactive tabs display muted icons (`colors.textSecondary` `#9EAAA3`) with full accessibility labels preserved for screen readers.

### 4. Calendar Dot Matrix (`src/app/(tabs)/index.tsx`)
- Unrecorded / Future dates: `colors.statusNeutralDot` (`#343E38`).
- Green Days (all habits = 0): `colors.statusGreenDay` (`#B9F6CA`).
- Habit Activity Days (any habit > 0): `colors.statusHabitActivity` (`#FF9F43`).
- Today ring: 1.5dp border with `colors.textPrimary` (`#F4F2EA`).

### 5. Dialogs, Sheets & Modals
- Modal overlay backdrop uses `rgba(0, 0, 0, 0.75)` for deep, distraction-free focus.
- Modal sheet container uses `backgroundColor: colors.surfaceElevated` (`#222925`).
- Text inputs use `backgroundColor: colors.surfaceSubtle` (`#181E1B`), `color: colors.textPrimary`, `borderColor: colors.border`, and `placeholderTextColor: colors.textTertiary`.

---

## E. Habit & Streak Semantics

Business logic and color representation are tightly coupled:
1. **Green Day**: All tracked bad habits have recorded quantity = 0 for that calendar date. Missing dates are **never** inferred as green. Represented with **Electric Mint** (`#B9F6CA`).
2. **Activity Day**: Any tracked habit has recorded quantity > 0 for that date. Represented with **Signal Amber** (`#FF9F43`).
3. **Streak**: Consecutive calendar days that are strictly Green Days.
4. **Never Shame**: Red is prohibited from ordinary logging or streak break indicators. Setbacks are part of habit recovery; amber neutrally indicates activity.

---

## F. Accessibility & Quality Standards

1. **WCAG Contrast**:
   - Normal text must exceed 4.5:1 against its background.
   - Large text and high-emphasis controls must exceed 3:1.
   - Primary text (`#F4F2EA` on `#101412`) achieves **16.8:1**.
   - Secondary text (`#9EAAA3` on `#101412`) achieves **7.9:1**.
   - Primary button (`#101412` on `#B9F6CA`) achieves **15.4:1**.
2. **No Status Through Color Alone**: Always accompany color dots with date context, textual labels ("Green day", "Logged"), or accessibility labels.
3. **Android System Areas**:
   - Status bar: Light style icons (`<StatusBar style="light" />`) on dark canvas.
   - Navigation bar: Background `#101412`, light content icons.
   - Dock clearance: Respects `useSafeAreaInsets().bottom` dynamically.

---

## G. Mandatory Rules for Future Development

1. **Dark Theme Exclusivity**: Dark theme is the app's default and only theme. Do not add light theme toggles or scattered light colors.
2. **No Raw Hex Values**: Never introduce arbitrary hex codes into screen or component files. Import `colors` from `@/theme`.
3. **Reuse Existing Semantic Tokens**: Do not invent parallel color tokens for one-off screens.
4. **Elevation Hierarchy**: Canvas is Obsidian (`#101412`), elevated surfaces are Graphite (`#222925`), and inner wells are `#181E1B`.
5. **Brand Color Fidelity**: Never alter `#101412`, `#222925`, `#B9F6CA`, `#FF9F43`, or `#F4F2EA`.
6. **No Red for Habit Setbacks**: Keep red reserved for permanent destructive deletion.
7. **Consistent Streak Colors**: Calendar dots, stats cards, and charts must agree on mint vs. amber.
8. **Check Touch Targets**: All interactive elements must maintain a minimum 44×44dp touch target on Android.
9. **Zero White Flashes**: Keep `app.json`, splash screens, and `_layout.tsx` background synchronized to `#101412`.
10. **Review Design System First**: Consult this document before creating new UI components.

---

## H. Checklist for Adding a New Screen or Component

Before considering any new screen or component complete:
- [ ] Wrapped in `ScreenWrapper` with dark-mode status bar.
- [ ] Uses `colors.bg` for canvas and `colors.surface` / `colors.surfaceElevated` for cards.
- [ ] Uses `colors.textPrimary` for titles and `colors.textSecondary` for descriptions.
- [ ] Primary buttons use `colors.primary` with `colors.textInverse` label.
- [ ] Text inputs use `colors.surfaceSubtle` with `colors.border` and `colors.textTertiary` placeholders.
- [ ] Tested for keyboard overlap, small screens, and gesture navigation.
- [ ] Confirmed zero hardcoded `#` hex codes.
- [ ] Passes `npm run type-check`.
