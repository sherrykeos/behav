# Agent Instructions — Behav

These instructions apply to any coding agent or assistant working on Behav.



## Before making changes
1. Read `context.md` and `prd.md`.
2. Inspect the existing project structure and `package.json`.
3. Check the installed Expo SDK and package compatibility before adding dependencies.
4. Summarize the intended change and identify the files to touch before a large change.
5. Never overwrite or delete user work without a clear reason and explicit confirmation.

## Working style
- Teach while building: explain what a change does and why it is needed.
- Work in small, reviewable steps.
- Prefer straightforward TypeScript and readable React Native components.
- Avoid unnecessary dependencies, abstractions, global state libraries, or premature architecture.
- Do not generate a temporary/demo app instead of the requested product.
- Do not claim a command or test succeeded unless it was actually run and its result checked.
- When blocked, ask one clear question instead of making a consequential guess.

## Product and design rules
- Follow `context.md` and `prd.md`.
- Use the supplied reference image for soft visual direction: warm cream, pastel accents, rounded surfaces, gentle shadows, generous spacing, and a calm tone.
- Keep text readable and controls easy to tap on Android.
- Maintain accessible contrast; decorative softness must not reduce legibility.
- Avoid overcomplicated dashboards, excessive cards, neon palettes, heavy gradients, and visually noisy charts.
- Make quick logging the central interaction.
- Use neutral, non-shaming language for behavior tracking.

## Technical rules
- Use Expo, React Native, and TypeScript.
- Target **Expo SDK 58**, as explicitly requested by the owner. Verify current official compatibility and explain any blocker before changing the target.
- Use Expo Router for navigation.
- Use Expo SQLite for durable local data.
- Keep ordinary app functionality available offline.
- Do not add a backend, login, cloud sync, analytics tracking, or AI to the MVP.
- Do not hard-code secrets or collect unnecessary personal data.
- Validate user input and handle empty states, loading states, and errors.
- Database changes must be safe and versioned where needed.
- Destructive actions such as deleting records or replacing restored data need confirmation.
- Backups and imports must not silently overwrite data. Provide clear previews and outcomes.

## Data integrity
- Preserve dates, values, and behavior names during import.
- Do not infer the meaning of ambiguous spreadsheet notation. Ask the owner or preserve the raw value and flag it.
- Avoid duplicate imports where possible.
- Validate imported records and report skipped/invalid rows.
- Verify that exported files exist and contain the expected data before reporting success.
- Clearly explain that a local backup does not protect against losing the phone unless copied elsewhere.

## Quality checklist
Before calling a task complete:
- Run relevant lint/type-check/test commands if configured.
- Check Android layout and small-screen behavior where possible.
- Test empty, normal, and error states.
- Confirm that app restarts do not lose saved records.
- Report what changed, what was tested, and what remains.

# Agents.md — Behav: Anti-AI-Slop Design & Engineering Rules
These rules are mandatory. The goal is a thoughtful, usable product—not a generic AI-generated interface or a large pile of code that merely looks finished.
1. Product truth over demo theatre
- Build the real Behav product described in context.md and prd.md.
- Never substitute a temporary demo, fake dashboard, mock-only interaction, or static screen for working functionality.
- Every visible primary action must work. If a feature is not implemented, do not present it as functional; mark it clearly as unavailable or leave it out.
- Do not fabricate user records, streaks, analytics, success states, backup timestamps, or import results.
- Empty states must be honest, useful, and designed intentionally.
- Never claim tests, commands, builds, or device checks passed unless they were actually run and verified.
2. Design must have intent
- Treat the provided reference image as inspiration for warmth and composition, not as a template to copy.
- Behav's direction: warm cream/ivory surfaces, soft periwinkle, muted lavender, peach and sage accents, rounded shapes, gentle depth, generous spacing, calm typography, and quiet visual hierarchy.
- The product must feel specific to behavior tracking. Do not make it look like a generic finance dashboard, SaaS admin panel, AI chat app, or default component-library demo.
- Every screen must have one clear primary purpose and one obvious next action.
- Establish a small design system before styling multiple screens: colors, type scale, spacing scale, radii, elevation, icon sizes, and component states. Reuse tokens instead of inventing new values screen by screen.
- Use gradients, illustrations, blur, shadows, and decoration sparingly. They must support hierarchy, not hide weak layout.
- Use real, consistent icons from one icon family. Never mix emoji, random icon packs, and text glyphs as substitutes for interface icons.
- No arbitrary floating elements, decorative pills, meaningless badges, fake progress rings, or cards that exist only to fill space.
- No excessive gradients, glassmorphism, oversized headings, tiny low-contrast labels, or stacks of nested cards.
- Avoid making every element a rounded rectangle. Use contrast, spacing, alignment, and typography to create hierarchy.
- Animation is optional. If used, it must be brief, purposeful, performant, and respect reduced-motion preferences where feasible.
- Do not add imagery that competes with the data or slows down a frequently used logging screen.
3. Usability beats visual novelty
- Optimize the core loop: open app → log behavior quickly → understand today's status → leave.
- Frequent actions should require as few taps as practical.
- Use touch targets appropriate for Android, clear pressed/disabled/loading states, and readable text contrast.
- Respect safe areas, keyboard behavior, system navigation, and small-screen layouts.
- Use labels that make sense without relying on icons alone.
- Forms must have labels, validation, helpful errors, and sensible defaults.
- Destructive actions need confirmation and clear consequences.
- Provide loading, empty, success, and failure states where relevant; do not add state UI when it is not needed.
- Use neutral, non-shaming language. Never frame a missed goal as a moral failure or punish the user visually.
4. No placeholder copy or fake polish
Forbidden in production UI:
- “Lorem ipsum”, generic filler, unexplained abbreviations, and TODO text.
- Fake names, sample metrics, fake activity histories, or hard-coded chart values presented as the user's data.
- Generic slogans such as “Unlock your potential” unless there is a specific, justified product reason.
- Buttons that do nothing, dead links, decorative toggles, or controls without state.
- “Coming soon” cards used to make an incomplete screen look full.
- Repeated identical cards just to create visual density.
- Arbitrary percentages, streaks, counts, dates, or progress indicators.
  If development fixtures are necessary, isolate them from production data and make their use explicit.
5. Engineering discipline
- Read context.md and prd.md before implementing a feature.
- Inspect the existing code and package versions before changing anything.
- Make small, coherent changes that can be reviewed and tested. Do not rewrite entire files or restructure the app without a clear need.
- Explain the intended change before a broad refactor.
- Prefer simple, explicit, readable TypeScript over clever abstractions.
- Avoid premature architecture, excessive custom hooks, unnecessary context providers, over-generalized components, and dependencies added for trivial tasks.
- Do not duplicate business logic across screens. Put shared calculations and domain rules in a clear, testable location.
- Keep UI components focused; split a component when it improves comprehension, reuse, or testing—not to satisfy an arbitrary file-size rule.
- Use strict types where practical. Avoid any, unsafe casts, swallowed errors, and broad catch blocks that hide failures.
- No dead code, unused imports, commented-out code dumps, unexplained magic numbers, or speculative features.
- Do not add dependencies until the built-in platform or existing dependency has been considered.
- Use the project's package manager and existing conventions.
- Do not silently change the requested Expo SDK 58 target. Verify compatibility using current official Expo documentation and explain any blocker before proposing a version change.
6. Data integrity is non-negotiable
- Behav is local-first and must work offline for core functionality.
- Persist real user data in SQLite; never treat component state as durable storage.
- Validate and normalize input at the boundary.
- Use safe, versioned database migrations when schema changes.
- Preserve historical timestamps and values accurately.
- Define date/time handling consistently and test date boundaries; avoid accidental timezone shifts.
- Never silently discard, merge, reinterpret, or overwrite records.
- CSV imports must have a preview, validation, duplicate handling, and a clear report of imported and skipped rows.
- Do not guess the meaning of ambiguous legacy notation. Preserve raw values or pause for the owner's clarification.
- JSON restore must validate the file and explain merge/replace behavior before applying changes.
- Export/backup actions must be verified; do not display success before the write succeeds.
- Explain that a backup stored only on the phone may be lost with the device.
- Do not log personal behavior data to console, analytics, or remote services unnecessarily.
7. Accessibility and inclusive quality
- Maintain readable contrast on pastel surfaces.
- Do not communicate status through color alone.
- Support system font scaling without clipping important content.
- Give interactive elements accessible labels and meaningful roles.
- Make keyboard focus and screen-reader behavior reasonable for supported components.
- Avoid shame-based wording, alarmist red states for ordinary setbacks, or manipulative streak mechanics.
8. Testing is part of implementation
For each meaningful feature:
- Test the normal path and at least one failure/empty path.
- Test persistence across app restart for data features.
- Test duplicate and invalid input for import/restore flows.
- Check small Android screens, keyboard overlap, and navigation behavior where possible.
- Run available type-check, lint, and test scripts; report exactly what ran and what did not.
- Fix root causes rather than hiding errors or weakening types.
- Never mark a feature complete solely because the screen renders.
9. Definition of done
A change is done only when:
1. It satisfies the relevant product requirement.
2. The interaction works end to end with real state/data.
3. It follows the agreed design system and improves or preserves usability.
4. It handles empty, invalid, and failure states appropriately.
5. It preserves existing data and unrelated functionality.
6. Relevant checks have been run, with results reported honestly.
7. The implementation has no known fake controls, placeholder metrics, or misleading success states.
10. Mandatory response format for coding work
When reporting a completed task, state briefly:
- Changed: files/features changed and why.
- Verified: commands/tests actually run and their outcomes.
- Not verified / remaining: anything not tested or not implemented.
- Next step: one sensible next action.
If uncertain about a product rule, data meaning, or destructive change, ask the owner before guessing.
