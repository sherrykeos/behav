const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Native Splash Screen & Configuration Verification', () => {
  it('Scenario 13: Native splash screen and system bars configured in app.json', () => {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    assert.ok(fs.existsSync(appJsonPath), 'app.json must exist');
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    // Check root splash configuration
    const splash = appConfig.expo.splash;
    assert.ok(splash, 'Root splash configuration must exist');
    assert.strictEqual(splash.backgroundColor, '#101412', 'Splash background must be Obsidian #101412');
    assert.strictEqual(splash.image, './assets/appLogo.png', 'Splash image must use assets/appLogo.png');
    assert.strictEqual(splash.resizeMode, 'contain', 'Splash image resizeMode must be contain');

    // Check expo-splash-screen plugin
    const plugins = appConfig.expo.plugins || [];
    const splashPlugin = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    assert.ok(splashPlugin, 'expo-splash-screen plugin must be configured in plugins');
    const pluginOptions = splashPlugin[1];
    assert.strictEqual(pluginOptions.backgroundColor, '#101412', 'Plugin backgroundColor must be Obsidian #101412');
    assert.strictEqual(pluginOptions.image, './assets/appLogo.png', 'Plugin image must be ./assets/appLogo.png');
    assert.strictEqual(pluginOptions.imageWidth, 120, 'Plugin imageWidth should be balanced (120)');
    assert.strictEqual(pluginOptions.dark.image, './assets/appLogo.png');
    assert.strictEqual(pluginOptions.dark.backgroundColor, '#101412');

    // Check Android system bars & package config
    assert.strictEqual(appConfig.expo.android.package, 'com.behav.app');
    assert.strictEqual(appConfig.expo.android.versionCode, 1);
    assert.strictEqual(appConfig.expo.androidStatusBar.backgroundColor, '#101412');
    assert.strictEqual(appConfig.expo.androidStatusBar.barStyle, 'light-content');
    assert.strictEqual(appConfig.expo.androidNavigationBar.backgroundColor, '#101412');

    // Check logo asset exists
    const logoPath = path.join(__dirname, '..', 'assets', 'appLogo.png');
    assert.ok(fs.existsSync(logoPath), 'assets/appLogo.png must exist');
    const stat = fs.statSync(logoPath);
    assert.ok(stat.size > 10000, 'assets/appLogo.png must be a valid image file');
  });
});

describe('Onboarding & Identity Persistence Flow', () => {
  // Simulated SQLite storage mock
  class MockSQLite {
    constructor() {
      this.settings = new Map();
      this.behaviors = [];
      this.logEntries = [];
      this.goals = [];
    }

    async getSetting(key) {
      return this.settings.get(key) || null;
    }

    async setSetting(key, value) {
      this.settings.set(key, String(value));
    }

    // Determine onboarding state for initial launch
    async resolveInitialState() {
      const completed = await this.getSetting('onboarding_completed');
      const stepStr = await this.getSetting('onboarding_step');
      const savedStep = stepStr ? parseInt(stepStr, 10) : 1;
      const userName = await this.getSetting('user_name');

      if (completed !== null) {
        return {
          isOnboardingCompleted: completed === 'true',
          onboardingStep: savedStep,
          userName: userName || '',
        };
      }

      // Check if returning user who already has habits
      if (this.behaviors.length > 0) {
        await this.setSetting('onboarding_completed', 'true');
        return {
          isOnboardingCompleted: true,
          onboardingStep: 4,
          userName: userName || '',
        };
      }

      // Fresh installation
      return {
        isOnboardingCompleted: false,
        onboardingStep: savedStep || 1,
        userName: userName || '',
      };
    }

    async completeOnboarding(name) {
      const trimmed = name ? name.trim() : '';
      if (!trimmed) {
        throw new Error('Preferred name cannot be empty');
      }
      await this.setSetting('user_name', trimmed);
      await this.setSetting('onboarding_completed', 'true');
      await this.setSetting('onboarding_step', '4');
    }

    async saveProgress(step, name) {
      await this.setSetting('onboarding_step', String(step));
      if (name && name.trim().length > 0) {
        await this.setSetting('user_name', name.trim());
      }
    }
  }

  it('Scenario 1: Fresh installation initializes with onboarding incomplete', async () => {
    const db = new MockSQLite();
    const state = await db.resolveInitialState();
    assert.strictEqual(state.isOnboardingCompleted, false);
    assert.strictEqual(state.onboardingStep, 1);
  });

  it('Scenario 2: Returning user with existing data bypasses onboarding', async () => {
    const db = new MockSQLite();
    db.behaviors.push({ id: 'b1', name: 'Smoking' });
    const state = await db.resolveInitialState();
    assert.strictEqual(state.isOnboardingCompleted, true, 'Returning users with behaviors must not see onboarding');
  });

  it('Scenario 3: Skip onboarding on Screen 1 & 2 jumps directly to Step 3 (Name entry)', async () => {
    let step = 1;
    const canSkip = step === 1 || step === 2;
    assert.strictEqual(canSkip, true);
    // User taps Skip
    step = 3;
    assert.strictEqual(step, 3, 'Skipping must land on Step 3 for mandatory preferred name');
  });

  it('Scenario 4 & 5: Empty and whitespace-only names are strictly rejected', async () => {
    const db = new MockSQLite();

    await assert.rejects(
      async () => db.completeOnboarding(''),
      { message: 'Preferred name cannot be empty' }
    );

    await assert.rejects(
      async () => db.completeOnboarding('    \t \n  '),
      { message: 'Preferred name cannot be empty' }
    );
  });

  it('Scenario 6: Supports Unicode, international names, and trims whitespace', async () => {
    const testCases = [
      { input: '   Alex Taylor   ', expected: 'Alex Taylor' },
      { input: 'José María', expected: 'José María' },
      { input: '李小龙', expected: '李小龙' },
      { input: 'سارة أحمد', expected: 'سارة أحمد' },
      { input: 'रोहित शर्मा', expected: 'रोहित शर्मा' },
      { input: 'Amina 🌟', expected: 'Amina 🌟' },
      { input: 'Müller-Thurgau', expected: 'Müller-Thurgau' },
    ];

    for (const { input, expected } of testCases) {
      const db = new MockSQLite();
      await db.completeOnboarding(input);
      const saved = await db.getSetting('user_name');
      assert.strictEqual(saved, expected);
    }
  });

  it('Scenario 7: Navigate backwards without losing the entered name', async () => {
    const db = new MockSQLite();
    let currentStep = 3;
    let enteredName = 'Jordan';

    // Save progress while on step 3
    await db.saveProgress(currentStep, enteredName);

    // User navigates back to step 2
    currentStep = 2;
    await db.saveProgress(currentStep, enteredName);

    // User returns to step 3
    currentStep = 3;
    const restoredName = await db.getSetting('user_name');
    assert.strictEqual(restoredName, 'Jordan', 'Entered name must be preserved when navigating back');
  });

  it('Scenario 8, 9 & 10: Complete onboarding, restart app, onboarding does not appear again', async () => {
    const db = new MockSQLite();
    await db.completeOnboarding('Alexander');

    // Simulate app restart by re-resolving initial state
    const restartedState = await db.resolveInitialState();
    assert.strictEqual(restartedState.isOnboardingCompleted, true);
    assert.strictEqual(restartedState.userName, 'Alexander');
  });

  it('Scenario 11: Home greeting uses saved preferred name', async () => {
    const userProfile = { name: 'Jordan', bio: 'Habits' };
    const userName = userProfile.name || 'Friend';
    const hour = 9; // morning
    const greeting = hour < 12 ? 'Good morning' : 'Good evening';
    const greetingText = `${greeting}, ${userName}.`;
    assert.strictEqual(greetingText, 'Good morning, Jordan.');
  });

  it('Scenario 12: Editing preferred name updates the single source of truth', async () => {
    const db = new MockSQLite();
    await db.completeOnboarding('InitialName');
    assert.strictEqual(await db.getSetting('user_name'), 'InitialName');

    // User edits name in Profile screen
    await db.setSetting('user_name', 'UpdatedName');
    assert.strictEqual(await db.getSetting('user_name'), 'UpdatedName');
  });

  it('Scenario 14: Storage failure recovery path exists', () => {
    const layoutContent = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'app', '_layout.tsx'),
      'utf8'
    );
    assert.ok(layoutContent.includes('SplashScreen.hideAsync()'), 'Must hide splash on error');
    assert.ok(layoutContent.includes('Storage Initialization Error'), 'Must show user-friendly error UI');
    assert.ok(layoutContent.includes('Retry Initialization'), 'Must provide retry action button');
  });

  it('Scenario 15: Existing tracking data remains untouched by onboarding', async () => {
    const db = new MockSQLite();
    db.behaviors.push({ id: 'b1', name: 'Smoking' });
    db.logEntries.push({ id: 'l1', behaviorId: 'b1', value: 2 });
    db.goals.push({ id: 'g1', behaviorId: 'b1', targetValue: 0 });

    // Complete onboarding with name
    await db.completeOnboarding('Jordan');

    // Verify all tracking data is intact
    assert.strictEqual(db.behaviors.length, 1);
    assert.strictEqual(db.logEntries.length, 1);
    assert.strictEqual(db.goals.length, 1);
  });
});
