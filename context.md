# Behav — Project Context

## Product identity
- **Name:** Behav
- **Purpose:** A private, personal Android app for tracking behaviors, reviewing patterns, and making progress toward personal goals.
- **Primary user:** The owner of the phone; this is a personal-use MVP, not a social or multi-user product.
- **Product principle:** Make recording a behavior fast, reviewing it understandable, and personal data portable.

## Product vision
Behav should feel calm, soft, welcoming, and lightweight. It should help the user notice patterns without shaming them or turning self-improvement into a game. The experience should be simple enough to use every day.

## Visual direction
Use the supplied reference image as visual inspiration, not as a screen to copy literally:
- Warm ivory / cream background.
- Soft pastel gradients and gentle sky-like imagery used sparingly.
- Rounded cards, generous spacing, soft shadows, and restrained borders.
- Periwinkle / cornflower blue for primary actions.
- Muted lavender, peach, and sage accents.
- Dark warm-gray text with clear contrast.
- Friendly, polished typography and small, quiet labels.
- Bottom navigation with clear icons and a prominent quick-add action where appropriate.
- Calm visual hierarchy; avoid dense dashboards, excessive metrics, harsh black surfaces, neon colors, and generic enterprise-admin styling.

The reference image is an idea-capture app. Behav must adapt its softness and composition to behavior tracking rather than copy its content or labels.

## MVP principles
1. Local-first and offline-first.
2. No authentication, backend, cloud sync, or AI in the MVP.
3. Logging should take only a few taps.
4. A user must be able to correct mistakes.
5. Keep each behavior's records and goals distinct.
6. Make backup, restore, and historical import understandable and safe.
7. Prefer a small, maintainable implementation over premature abstraction.

## Core user needs
- Quickly record a behavior and its quantity/occurrence.
- Manage tracked behaviors and optional limits.
- Review prior dates and edit incorrect records.
- See simple trends and goal progress.
- Maintain independent goals/streaks where applicable.
- Export and restore personal data.
- Eventually import historical records from CSV exports of existing spreadsheets.

## Technical direction
- Expo + React Native + TypeScript.
- Requested Expo SDK: **58**.
- Expo Router for navigation.
- Expo SQLite for persistent local records.
- Expo-supported file/document APIs for import/export and backup.
- Keep calculations on-device.

SDK/package compatibility must be verified against the current Expo documentation when installing packages. Do not silently switch SDK versions without explaining why and asking first.

## Development workflow
The owner wants to learn by building the app themselves with step-by-step guidance. Explain important choices and keep changes incremental. Do not replace the whole project with a large generated implementation. Inspect existing files before editing and preserve working code unless a change is necessary.

## Out of scope for the MVP
- Accounts and sign-in.
- Server-side database or cloud sync.
- AI coaching.
- Social sharing, followers, leaderboards, or public profiles.
- Complex gamification.
- Paid subscriptions or ads.
