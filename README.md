<div align="center">

  <img src="./assets/appLogo.png" alt="Behav Logo" width="120" height="120" style="border-radius: 28px;" />

  # Behav

  **Offline-first personal behavior tracking designed for awareness before change.**

  [![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](https://www.android.com/)
  [![Framework](https://img.shields.io/badge/Framework-Expo%20SDK%2058-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
  [![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Storage](https://img.shields.io/badge/Storage-Local%20SQLite%20(Offline)-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
  [![Theme](https://img.shields.io/badge/Theme-Obsidian%20%26%20Electric%20Mint-101412?style=flat-square)](./docs/DESIGN_SYSTEM.md)
  [![Tests](https://img.shields.io/badge/Tests-33%20Passed%20(8%20Suites)-brightgreen?style=flat-square)](#-automated-testing--verification)
  [![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#-proprietary--confidential)

  <p align="center">
    <a href="#-installation-android-apk">Installation (APK)</a> •
    <a href="#-philosophy">Philosophy</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-design-system--visual-identity">Design System</a> •
    <a href="#-architecture--data-flow">Architecture</a> •
    <a href="#-developer-setup">Developer Setup</a> •
    <a href="#-automated-testing--verification">Testing</a> •
    <a href="#-production--release-builds">Release</a>
  </p>

</div>

---

> **PROPRIETARY & CONFIDENTIAL**  
> This repository contains confidential, proprietary software, design systems, and analytical algorithms for Behav. It is not licensed for public distribution, redistribution, or open-source publication.

---

## 🌿 Philosophy

Most habit trackers are built around positive gamification, motivational pressure, and streak guilt. **Behav is fundamentally different.**

Behav is engineered specifically for **undesirable and compulsive behaviors** (e.g. smoking, drinking, compulsive screen time, or personal vices). Its foundational principles are:

* **Awareness before change**: You cannot change a pattern until you clearly recognize when, how, and why it happens.
* **Honesty over perfection**: A log of activity is a victory of awareness, not a failure of character.
* **Consistency over temporary hype**: Real reduction happens through patient observation, not abrupt emotional resolutions.
* **Progress without guilt**: No red sirens, negative buzzer sounds, or moralizing warnings. Recorded habits are shown in neutral Signal Amber, and clean days are highlighted in Electric Mint.
* **Zero surveillance**: Your behaviors belong to you alone. No accounts, no cloud sync, no metrics harvesting, and no external backends.

---

## ✨ Key Features

### 1. ⚡ Quick & Frictionless Logging
- Log daily quantities with a single tap or customize values directly from the Home screen.
- Flexible measurement units tailored to each behavior (counts, cigarettes, minutes, occurrences, drinks).
- Real-time aggregation ensuring log entries never duplicate or distort daily totals.

### 2. 📅 Dual-State Calendar & Green Days
- Clear visual distinction:
  - **Electric Mint (`#B9F6CA`)**: Clean days with zero recorded occurrences across all tracked habits.
  - **Signal Amber (`#FF9F43`)**: Days with logged activity, reported calmly without shame.
  - **Graphite (`#222925`)**: Unrecorded or future days.
- Rapid month-by-month navigation with live streak counters and monthly summaries.

### 3. 📊 Precision Analytics & Streak Engine
- **Mathematical streak integrity**: Missing calendar dates break streaks without artificial zero-filling.
- **Independent streak calculation**: Smoking-free and alcohol-free streaks are tracked autonomously so slipping in one habit never invalidates progress in another.
- **Distribution insights**: Breakdown of weekday vs. weekend spikes, 30-day moving averages, and monthly frequency matrices.

### 4. 🔒 Data Sovereignty & Canonical BHFile v1
- **100% Offline-First SQLite**: Uses transactional SQLite storage (`behav.db`) directly on your device.
- **Instant Full Backup**: 1-tap backup to canonical `BHFile v1` JSON format.
- **Non-Destructive Restore**: Validates imported schema, previews date ranges, detects potential collisions, and offers safe merge or replace modes.
- **CSV Data Export**: Export logs and behaviors to standard spreadsheets.

### 5. 🎯 Calm, Personalized Onboarding
- Minimal native Android launch screen in deep Obsidian `#101412` with the centered Behav symbol.
- 4-screen conversational introduction to Behav's philosophy.
- Dynamic preferred-name personalization supporting Unicode, international characters, and emojis.
- Resilient recovery handling for storage initialization and hardware back navigation.

---

## 🎨 Design System & Visual Identity

Behav follows a strict dark design system designed for visual comfort and high contrast without harsh glare:

| Token | Hex | Role | Contrast Ratio |
|---|---|---|---|
| **Obsidian** | `#101412` | Primary App Canvas | Foundation Dark |
| **Graphite** | `#222925` | Elevated Cards & Surfaces | Subdued Elevation |
| **Electric Mint** | `#B9F6CA` | Progress & Clean Days | Primary Accent |
| **Signal Amber** | `#FF9F43` | Recorded Habit Activity | Neutral Awareness |
| **Warm Ivory** | `#F4F2EA` | High-Emphasis Text | **16.8 : 1 (AAA)** |

> For comprehensive design guidelines, typography tokens, component spacing, and elevation rules, consult [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md).

---

## 🏗 Architecture & Data Flow

Behav enforces a strict unidirectional data flow ensuring database safety, analytical consistency, and clean separation of concerns:

```
┌────────────────────────────────────────────────────────┐
│                      UI Screens                        │
│       (Home, Behaviors, History, Insights, Profile)    │
└───────────────────────────▲────────────────────────────┘
                            │ Hooks & Context
┌───────────────────────────┴────────────────────────────┐
│                    BehaviorContext                     │
│         State Management & Transaction Dispatch        │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
┌───────────────┴──────────────┐ ┌───────┴───────────────┐
│       Analytics Engine       │ │ Database Repositories │
│   Green Days, Streaks, Trends│ │ Behaviors, Logs, Goals│
└──────────────────────────────┘ └───────────────▲───────┘
                                                 │
                                 ┌───────────────┴───────┐
                                 │   Expo SQLite Engine  │
                                 │       (behav.db)      │
                                 └───────────────────────┘
```

### Directory Structure

```
Behav/
├── assets/                 # App logo, splash art, and brand visuals
├── docs/                   # Authoritative architecture, design & file specs
│   ├── BHFILE_SPEC.md      # Locked BHFile v1 JSON specification
│   ├── DATA_INTEGRITY.md   # Data safety and migration verification
│   └── DESIGN_SYSTEM.md    # Color tokens and component design guidelines
├── src/
│   ├── app/                # Expo Router file-based screens & layouts
│   │   ├── (tabs)/         # Tab navigation: Home, Behaviors, Stats, Profile
│   │   ├── _layout.tsx     # Root layout, splash coordination & error boundary
│   │   └── onboarding.tsx  # Multi-step personalized onboarding flow
│   ├── components/         # Reusable UI component modules
│   │   ├── behaviors/      # Habit creation and configuration modals
│   │   ├── common/         # Buttons, Cards, Badges, ScreenWrappers
│   │   ├── logging/        # Rapid-entry and date-specific log dialogs
│   │   ├── onboarding/     # StepWelcome, StepPhilosophy, StepName, StepReady
│   │   ├── settings/       # Data sovereignty, backup, clear data modals
│   │   └── ui/             # Glassmorphic surfaces and micro-indicators
│   ├── context/            # React context bridging SQLite repositories to UI
│   ├── db/                 # SQLite migrations, schema definitions, and repositories
│   ├── services/           # Pure analytical calculations and streak algorithms
│   ├── theme/              # Color tokens, typography, radii, shadows
│   └── utils/              # BHFile v1 parsers, date arithmetic, file export
└── tests/                  # Automated unit, analytics, and navigation test suites
```

---

## 📲 Installation (Android APK)

Follow these steps to install and run Behav directly on your Android device:

### First-Time Installation
1. **Download the APK**: Visit the [Behav Releases](https://github.com/sherrykeos/behav/releases) page and download the latest `Behav-*.apk` file.
2. **Open the File**: Locate and open the downloaded APK from your browser downloads or file manager.
3. **Allow Installation**: If prompted by Android, enable **"Allow from this source"** for your browser or file manager to permit installing standalone applications.
4. **Install**: Tap **Install** and wait for the package installer to finish.
5. **Launch**: Open **Behav** and complete the personalized onboarding.

---

### 🔄 Updating Behav Safely
* **Install Over the Existing App**: Download and install the newer APK directly over your existing installation.
* ⚠️ **Do NOT uninstall the previous version**: Because Behav is an offline-first app that stores all habits, streaks, and logs locally in SQLite on your device, uninstalling the app may delete your local database.
* 💡 **Back Up First**: Always perform a quick backup before updating. Go to **Profile → Data Sovereignty & Backups → Instant Full Backup** to export your canonical `.json` backup in 1 tap.

---

### 📋 System Requirements
| Requirement | Specification |
|---|---|
| **Operating System** | Android 8.0 (API level 26) or higher |
| **Network** | Internet connection required only for downloading APK releases; **no internet connection required** for core habit tracking, logging, or analytics |
| **Storage** | ~40 MB available internal storage |
| **Permissions** | Storage access for exporting/importing JSON backups and CSV spreadsheets |

---

## 💻 Developer Setup

### Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Mobile Environment**:
  - Android device or Android Studio emulator with [Expo Go](https://expo.dev/go)
  - Or an EAS development build configured for Android

### Environment Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local Expo development server:**
   ```bash
   npx expo start
   ```

3. **Launch on Android:**
   - Press <kbd>a</kbd> in the terminal to launch on a connected Android device or running emulator.
   - Or scan the QR code with the **Expo Go** app on your physical Android device.

---

## 🧪 Automated Testing & Verification

Behav includes a comprehensive automated test suite utilizing Node's native test runner (`node:test`) and strict TypeScript typechecking:

### Type Checking
```bash
npm run type-check
```
*Validates the entire codebase with `tsc --noEmit`.*

### Running the Full Test Suite
```bash
npm test
```

### Test Coverage Highlights
* **Green Day Evaluation**: Verifies zero-consumption invariants across multiple tracked behaviors.
* **Streak Continuity & Invariants**: Tests month boundaries, year boundaries, leap years (e.g. Feb 28–29), and missing dates.
* **Habit-Free Independence**: Asserts that activity in one behavior never breaks clean streaks for unrelated habits.
* **Historical Benchmark Verification**: Mathematically reproduces analytics across 304+ recorded days using locked fixtures.
* **SQLite Persistence & Transactions**: Validates idempotent upserts, record preservation, and safe deletion.
* **Native Splash & Onboarding**: Validates Android `#101412` splash configurations, Unicode preferred-name validation, back-navigation state retention, and automatic returning-user bypass.

---

## 📱 Production & Release Builds

Behav is configured for **EAS Build** (Expo Application Services) under Android package identifier `com.behav.app`:

### Build an Android APK (Internal Preview / QA)
```bash
npx eas-cli build --platform android --profile preview
```

### Build a Production Android App Bundle (Google Play Release)
```bash
npx eas-cli build --platform android --profile production
```

Build Configurations:
- [`app.json`](./app.json): Contains package metadata, adaptive icons, system bar configuration, and splash screen specs.
- [`eas.json`](./eas.json): Specifies internal and production build profiles.

---

## 🛡 Privacy & Security Model

* **100% Local On-Device**: All habit definitions, timestamps, quantities, notes, and profile details are stored exclusively in your phone's SQLite database.
* **Zero Telemetry**: No third-party analytics trackers, crash report harvesting, or advertising SDKs are included.
* **Direct File System Backups**: Backups are written directly to your local file system or secure cloud drive of your choice using standard Android Document APIs.
* **Zero Accounts**: No email, passwords, phone numbers, or external authentication providers are required.

---


<br/>
**Copyright © 2026 Behav. All rights reserved.**

<div align="center">
  <p style="font-style:italic; color: #888888; margin-top: 1em;">build by sherrykeos</p>
</div>


<div align="center">
  <sub>Behav v1.0 • Built with focus, respect, and awareness.</sub>
</div>
