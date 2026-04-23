# iOS Support: App Discovery & Usage Restriction

## What Are We Building?

We want to bring two capabilities to iOS:

1. **See installed apps** — Let users browse and select apps installed on their device
2. **Block/restrict app usage** — Like [Freedom](https://freedom.to), block selected apps on a schedule with a shield overlay

On Android, `PackageManager` gives us a full list of every installed app with all metadata. iOS is fundamentally different — Apple does not allow any app to silently scan what's installed. Instead, Apple provides the **Screen Time API** (introduced iOS 15, expanded iOS 16) which takes a privacy-first approach.

---

## How It Actually Works on iOS

Apple's Screen Time API has three frameworks that work together:

```
┌──────────────────────┐     ┌────────────────────────┐     ┌──────────────────────┐
│   FamilyControls     │     │   ManagedSettings      │     │   DeviceActivity     │
│                      │     │                        │     │                      │
│  "WHO can be         │     │  "WHAT restrictions    │     │  "WHEN do            │
│   controlled?"       │     │   are applied?"        │     │   restrictions       │
│                      │     │                        │     │   activate?"         │
│  - Authorization     │     │  - Shield apps         │     │                      │
│  - App picker UI     │     │  - Block categories    │     │  - Scheduled blocks  │
│  - User consent      │     │  - Block web domains   │     │  - Usage thresholds  │
│                      │     │  - Custom shield UI    │     │  - Activity reports  │
└──────────────────────┘     └────────────────────────┘     └──────────────────────┘
```

### Can we see ALL installed apps?

**No — not programmatically.** There is no iOS API that returns a list of all installed apps. Apple blocks this intentionally for privacy.

**But — the user can select apps.** Apple provides `FamilyActivityPicker`, a system UI that displays every installed app and category on the device. The user manually selects which apps they want to manage. This is how Freedom, Opal, ScreenZen, and every other iOS app blocker works.

The catch: selections come back as **opaque tokens** (random identifiers), not bundle IDs or app names. The tokens work for blocking but you cannot read which app a token represents from your main app.

### Can we block apps like Freedom?

**Yes.** This is exactly what the Screen Time API is designed for. The flow:

```
User selects apps        Tokens stored in          System blocks app
via Apple's picker  -->  ManagedSettingsStore  -->  launches with a
                         shield.applications        shield overlay
```

The shield is enforced at the OS level — even if your app is killed, the block stays active.

---

## The Complete Freedom-Like Flow

Here is the end-to-end architecture for a working app blocker:

```
STEP 1: AUTHORIZATION
┌─────────────────────────────────────────────┐
│  Request FamilyControls permission          │
│  AuthorizationCenter.requestAuthorization(  │
│    for: .individual    // iOS 16+           │
│  )                                          │
│  User authenticates with Face ID / passcode │
└─────────────────────────────────────────────┘
                    ↓
STEP 2: APP SELECTION
┌─────────────────────────────────────────────┐
│  Show FamilyActivityPicker (system UI)      │
│  User sees ALL installed apps & categories  │
│  User selects apps to block                 │
│  Returns: Set<ApplicationToken> (opaque)    │
└─────────────────────────────────────────────┘
                    ↓
STEP 3: APPLY SHIELD (IMMEDIATE BLOCK)
┌─────────────────────────────────────────────┐
│  let store = ManagedSettingsStore()         │
│  store.shield.applications = selectedTokens │
│  // Apps are now blocked instantly          │
└─────────────────────────────────────────────┘
                    ↓
STEP 4: SCHEDULE (OPTIONAL - TIME-BASED)
┌─────────────────────────────────────────────┐
│  DeviceActivitySchedule(                    │
│    intervalStart: 9:00 AM,                  │
│    intervalEnd: 5:00 PM,                    │
│    repeats: true                            │
│  )                                          │
│  Block only during work hours, etc.         │
└─────────────────────────────────────────────┘
                    ↓
STEP 5: SHIELD APPEARS WHEN USER OPENS BLOCKED APP
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────┐        │
│  │     🚫  App is Restricted      │        │
│  │                                 │        │
│  │  "Focus time — come back at    │        │
│  │   5:00 PM"                     │        │
│  │                                 │        │
│  │  [ OK ]    [ Unlock 2 min ]    │        │
│  └─────────────────────────────────┘        │
│  Fully customizable via ShieldConfiguration │
└─────────────────────────────────────────────┘
```

---

## What Data Can We Get on Each Platform?

| Data                                  | Android           | iOS                                        |
| ------------------------------------- | ----------------- | ------------------------------------------ |
| List ALL installed apps automatically | Yes               | **No** — user must select via picker       |
| App name                              | Yes               | Only inside DeviceActivityReport extension |
| Package/Bundle ID                     | Yes               | Only inside DeviceActivityReport extension |
| App icon                              | Yes (base64)      | Only inside extension or picker UI         |
| Version info                          | Yes               | No                                         |
| Install/update time                   | Yes               | No                                         |
| App size                              | Yes               | No                                         |
| Block/shield apps                     | No (not built-in) | **Yes** — OS-level enforcement             |
| Scheduled blocking                    | No (not built-in) | **Yes** — survives app kill                |
| Usage monitoring                      | No (not built-in) | **Yes** — via DeviceActivity               |

**Key insight:** Android is better at _listing_ apps. iOS is better at _blocking_ apps. The module should leverage each platform's strengths.

---

## Required Apple Entitlement

The `com.apple.developer.family-controls` entitlement is **mandatory**. Without it, all Screen Time APIs silently fail.

| Environment         | Approval Needed? | How to Get It                                                                                                          |
| ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Development (Xcode) | No               | Enable in Signing & Capabilities                                                                                       |
| TestFlight          | No               | Works with dev entitlement                                                                                             |
| App Store           | **Yes**          | [Request from Apple](https://developer.apple.com/contact/request/family-controls-distribution) — takes weeks to months |

You need separate approval for **each bundle ID** (main app + each extension = 4 approvals minimum).

---

## Existing Reference: react-native-device-activity

The [`react-native-device-activity`](https://github.com/kingstinct/react-native-device-activity) library already implements Screen Time APIs for React Native. Key learnings from their approach:

- Uses an **Expo config plugin** to auto-inject 3 extension targets (ActivityMonitor, ShieldAction, ShieldConfiguration)
- Requires `appleTeamId` and `appGroup` in plugin config
- Uses App Groups (shared UserDefaults) for communication between main app and extensions
- Hard limit of **20 concurrent monitors**
- Token size can be very large when using `includeEntireCategory` — use token ID references instead
- FamilyActivityPicker is "prone to crashing, especially when browsing larger categories"
- Selection view provides two modes: sheet (system Cancel/Done) and inline

We can reference this library's architecture but build our own Expo-native implementation.

---

## Implementation Milestones

### Milestone 1: iOS Module Foundation

**Goal:** Module compiles on iOS without crashes. Cross-platform apps can install the package.

| Task                                                       | Files                                   | Status                 |
| ---------------------------------------------------------- | --------------------------------------- | ---------------------- |
| Create CocoaPods podspec                                   | `ios/ExpoListInstalledApps.podspec`     | [#17](../../issues/17) |
| Create Swift module (returns `[]` for `listInstalledApps`) | `ios/ExpoListInstalledAppsModule.swift` | [#18](../../issues/18) |
| Register iOS in Expo module config                         | `expo-module.config.json`               | [#19](../../issues/19) |
| Add iOS CI build job                                       | `.github/workflows/ci.yml`              | [#20](../../issues/20) |
| Update documentation                                       | `README.md`, `CLAUDE.md`                | [#21](../../issues/21) |

**Risk:** Low. Returns empty array — matches existing TypeScript fallback.

---

### Milestone 2: App Detection Utilities

**Goal:** Provide `canOpenApp()` to check if specific apps are installed (works on both platforms), and `getPlatformCapabilities()` so consumers know what each platform supports.

| Task                                   | Files                                   | Status                 |
| -------------------------------------- | --------------------------------------- | ---------------------- |
| Add `canOpenApp()` function            | iOS Swift + Android Kotlin + TypeScript | [#22](../../issues/22) |
| Add `getPlatformCapabilities()`        | iOS Swift + Android Kotlin + TypeScript | [#23](../../issues/23) |
| Document platform differences on types | `src/ExpoListInstalledApps.types.ts`    | [#24](../../issues/24) |
| Configure URL schemes in example app   | `example/app.json`                      | [#25](../../issues/25) |

**How `canOpenApp` works:**

- **iOS:** `UIApplication.shared.canOpenURL()` — requires each scheme declared in `LSApplicationQueriesSchemes` (max ~50)
- **Android:** `PackageManager.resolveActivity()` — no limit

**Risk:** Medium. iOS URL scheme limit means you can only check ~50 known apps.

---

### Milestone 3: FamilyControls — App Selection & Blocking

**Goal:** Users can select apps via Apple's picker, authorize Screen Time access, and block selected apps with a shield.

| Task                                     | Files                                   | Status                 |
| ---------------------------------------- | --------------------------------------- | ---------------------- |
| Implement authorization flow             | `ios/ExpoListInstalledAppsModule.swift` | [#26](../../issues/26) |
| Create FamilyActivityPicker view         | `ios/FamilyActivityPickerView.swift`    | [#27](../../issues/27) |
| Add FamilyControls frameworks to podspec | `ios/ExpoListInstalledApps.podspec`     | [#28](../../issues/28) |
| Configure entitlement in example app     | `example/app.json`                      | [#29](../../issues/29) |

**New APIs exposed:**

```typescript
// Authorization
requestFamilyControlsAuthorization(): Promise<boolean>
getFamilyControlsAuthorizationStatus(): Promise<AuthorizationStatus>

// App selection (renders Apple's system picker)
<FamilyActivityPickerView onSelectionChange={handleSelection} />

// Blocking
shieldApps(selectionId: string): Promise<void>
unshieldApps(selectionId: string): Promise<void>
```

**How blocking works:**

1. User taps a button → `FamilyActivityPicker` appears (Apple's UI showing all apps)
2. User selects apps → opaque tokens stored via App Groups
3. Call `shieldApps()` → `ManagedSettingsStore.shield.applications = tokens`
4. When user tries to open a blocked app → system shows shield overlay
5. Shield persists even if your app is killed (OS-level enforcement)

**Risks:**

- **High:** Apple entitlement required for App Store distribution (weeks to months for approval)
- **Medium:** Requires iOS 16+ for individual authorization
- **Medium:** `FamilyActivityPicker` can crash with large categories (known Apple bug)
- Selected apps are opaque tokens — you cannot display app names in your own UI without Milestone 4

---

### Milestone 4: Extensions — Shield Customization & App Name Resolution

**Goal:** Customize the shield overlay, handle shield button actions, resolve opaque tokens to actual app names, and enable scheduled blocking.

| Task                                                        | Files                                   | Status                 |
| ----------------------------------------------------------- | --------------------------------------- | ---------------------- |
| Create DeviceActivityMonitor extension (scheduled blocking) | `ios/DeviceActivityReportExtension/`    | [#30](../../issues/30) |
| Create Expo config plugin for extension injection           | `plugin/withDeviceActivityExtension.js` | [#31](../../issues/31) |
| Add `getResolvedApps()` to read app names from extension    | `ios/ExpoListInstalledAppsModule.swift` | [#32](../../issues/32) |
| Configure App Groups                                        | `example/app.json`                      | [#33](../../issues/33) |

**Extension targets needed (3 total):**

| Extension                 | Purpose            | What It Does                                                                  |
| ------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| **DeviceActivityMonitor** | Scheduled blocking | `intervalDidStart()` applies shields, `intervalDidEnd()` removes them         |
| **ShieldConfiguration**   | Custom shield UI   | Returns custom title, subtitle, icon, button labels for the blocking overlay  |
| **ShieldAction**          | Button behavior    | Handles "OK" (keep blocked) and "Unlock 2 min" (temporary access) button taps |

**Scheduled blocking flow:**

```typescript
// Block social media apps every weekday 9am-5pm
startMonitoring('work-focus', {
  intervalStart: { hour: 9, minute: 0 },
  intervalEnd: { hour: 17, minute: 0 },
  repeats: true,
  selectionId: 'social-apps', // from FamilyActivityPicker
})
```

**Architecture — how extensions communicate:**

```
Main App ←──App Groups (shared UserDefaults)──→ Extensions
           ↑                                      ↑
    Stores tokens,                         Reads tokens,
    schedule config                        applies shields,
                                           resolves names
```

**Risks:**

- **Very High:** 3 extension targets must be injected via Expo config plugin during `expo prebuild`
- **High:** Each extension needs its own entitlement approval from Apple (4 total)
- **High:** Extensions have 5 MB memory limit — crash if exceeded
- **Medium:** `bundleIdentifier` resolution inside extensions is unreliable
- **Medium:** Only 20 concurrent DeviceActivity monitors allowed

---

## Risk Summary

| Risk                                                 | Impact                      | Likelihood | Milestones | Mitigation                                                           |
| ---------------------------------------------------- | --------------------------- | ---------- | ---------- | -------------------------------------------------------------------- |
| Apple entitlement approval takes months or is denied | Blocks App Store release    | Medium     | 3, 4       | Ship M1-2 first; dev builds work without approval                    |
| No public API to enumerate all installed apps        | Core feature gap vs Android | Certain    | All        | Use FamilyActivityPicker for user-driven selection                   |
| Opaque tokens — can't show app names in own UI       | UX limitation               | Certain    | 3          | Resolve in M4 extension; document limitation                         |
| `expo prebuild` wipes extension targets              | Blocks M4 entirely          | High       | 4          | Write Expo config plugin (reference: `react-native-device-activity`) |
| FamilyActivityPicker crashes with large categories   | Bad UX                      | Medium     | 3          | Provide fallback inline picker view                                  |
| Extension 5 MB memory limit                          | Random crashes              | Medium     | 4          | Minimize data in extensions; use token ID references                 |
| iOS 16+ requirement for individual auth              | Excludes older devices      | Certain    | 3, 4       | `#available` guards; graceful degradation on iOS 15                  |
| macOS CI runners cost 10x Linux                      | Increased CI costs          | Certain    | 1          | Run iOS job only when `ios/` files change                            |
| 20 monitor limit per app                             | Limits concurrent schedules | Low        | 4          | Document; design around limit                                        |

---

## Recommended Delivery Order

| Phase       | Milestones | Can Ship Independently? | Apple Approval Needed? |
| ----------- | ---------- | ----------------------- | ---------------------- |
| **Phase 1** | M1 + M2    | Yes                     | No                     |
| **Phase 2** | M3         | Yes (after Phase 1)     | Yes — for App Store    |
| **Phase 3** | M4         | Yes (after Phase 2)     | Yes — 4 bundle IDs     |

**Phase 1** unblocks cross-platform users and provides `canOpenApp()` utility.
**Phase 2** delivers the core Freedom-like blocking experience.
**Phase 3** adds polish: custom shields, scheduled blocking, app name resolution.

---

## References

- **WWDC22:** [What's new in Screen Time API](https://developer.apple.com/videos/play/wwdc2022/110336/) — iOS 16 individual authorization, named stores, DeviceActivityReport ([YouTube](https://www.youtube.com/watch?v=tOEFMkx_d2E))
- **WWDC21:** [Meet the Screen Time API](https://developer.apple.com/videos/play/wwdc2021/10123/) — Original introduction of FamilyControls, ManagedSettings, DeviceActivity
- **Apple Docs:** [FamilyControls](https://developer.apple.com/documentation/familycontrols) | [ManagedSettings](https://developer.apple.com/documentation/managedsettings) | [DeviceActivity](https://developer.apple.com/documentation/deviceactivity)
- **Entitlement Request:** [Requesting the Family Controls Entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)
- **Developer Guide:** [A Developer's Guide to Apple's Screen Time APIs](https://medium.com/@juliusbrussee/a-developers-guide-to-apple-s-screen-time-apis-familycontrols-managedsettings-deviceactivity-e660147367d7)
- **Known Issues:** [State of the Screen Time API 2024](https://riedel.wtf/state-of-the-screen-time-api-2024/)
- **RN Reference:** [react-native-device-activity](https://github.com/kingstinct/react-native-device-activity) — Existing React Native implementation with Expo config plugin
- **Sample Project:** [ScreenBreak](https://github.com/christianp-622/ScreenBreak) — iOS 16 Screen Time API demo
