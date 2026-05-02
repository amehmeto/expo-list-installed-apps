# expo-list-installed-apps

A React Native module to list installed applications on the device. Android has full support; iOS support is in active development — see [Platform Support](#platform-support) below.

## Installation

```sh
npm install expo-list-installed-apps
# or
yarn add expo-list-installed-apps
```

## Usage

```typescript
import {
  listInstalledApps,
  AppType,
  InstalledApp,
  UniqueBy,
} from 'expo-list-installed-apps'

async function getApps() {
  // Default: one entry per package (deduplicated)
  const apps: InstalledApp[] = await listInstalledApps({ type: AppType.ALL })
  console.log(apps)

  // Get all launcher activities (may include multiple entries per package)
  const allActivities: InstalledApp[] = await listInstalledApps({
    type: AppType.ALL,
    uniqueBy: UniqueBy.NONE,
  })
  console.log(allActivities)
}
```

## Platform Support

| Feature                                   | Android | iOS                                                                                   |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| List all installed apps                   | Full    | Not possible (Apple privacy) — returns `[]`                                           |
| Detect specific app by URL scheme         | M2      | M2                                                                                    |
| User-driven app selection (system picker) | N/A     | M3 (requires Apple Family Controls entitlement)                                       |
| App metadata (name, icon, version)        | Full    | M4 — names only via `getResolvedApps()`; bundle IDs may be empty; icons not supported |

iOS cannot enumerate every installed app — Apple has no public API for that, by design. iOS support therefore takes a different shape than Android:

- **M2** — `canOpenApp(scheme)` to check if a known app is installed via URL scheme (Android via `PackageManager`, iOS via `UIApplication.canOpenURL`).
- **M2.5** — `DEFAULT_IOS_APP_CATALOG` curates ~30 popular apps (`appName` + `scheme` + `bundleId`); opt in via the plugin's `useDefaultCatalog: true` to auto-declare every catalog scheme in `LSApplicationQueriesSchemes`.
- **M3** — `FamilyActivityPicker` view component for user-driven selection plus app shielding via `ManagedSettings`.
- **M4** — Extension-based name resolution: a `DeviceActivityReportExtension` (auto-injected by the config plugin) resolves opaque picker tokens into display names, surfaced as `getResolvedApps()`. Icon and version resolution remain out of scope (extension memory ceiling is 5 MB).

On iOS, `listInstalledApps()` returns `[]` so cross-platform consumers can import the module without crashing. iOS detection lives in `canOpenApp(scheme)` (M2), the `FamilyActivityPicker` view (M3), and `getResolvedApps()` (M4).

## API

### listInstalledApps(options?): Promise<InstalledApp[]>

Lists installed applications on the device.

#### Parameters

- `options.type` (optional):
  - `AppType.ALL` (default): List all apps
  - `AppType.SYSTEM`: List only system apps
  - `AppType.USER`: List only user-installed apps
- `options.uniqueBy` (optional):
  - `UniqueBy.PACKAGE` (default): Return one entry per package name (recommended for most use cases)
  - `UniqueBy.NONE`: Return all launcher activities (some apps may appear multiple times if they have multiple launcher activities)

#### Returns

- `Promise<InstalledApp[]>`: An array of installed app objects.

### Types

#### AppType

- `ALL`
- `SYSTEM`
- `USER`

#### UniqueBy

- `PACKAGE` - Deduplicate by package name (default)
- `NONE` - Return all launcher activities

#### InstalledApp

```typescript
type InstalledApp = {
  packageName: string
  versionName: string
  versionCode: number
  firstInstallTime: number
  lastUpdateTime: number
  appName: string
  icon: string // Base64 encoded image
  apkDir: string
  size: number // Size in bytes
  activityName: string // The launcher activity class name
}
```

### iOS default app catalog (M2.5)

Calling `canOpenApp(scheme)` on iOS only works if the scheme is pre-declared in `LSApplicationQueriesSchemes`. The bundled catalog ships ~30 popular apps so consumers don't have to hand-roll their own starter list.

Opt in via the config plugin — schemes get merged into `LSApplicationQueriesSchemes` automatically (deduped case-insensitively against any `urlSchemes` you also pass):

```jsonc
{
  "expo": {
    "plugins": [["expo-list-installed-apps", { "useDefaultCatalog": true }]]
  }
}
```

Then probe at runtime:

```typescript
import { canOpenApp, DEFAULT_IOS_APP_CATALOG } from 'expo-list-installed-apps'

const installed = await Promise.all(
  DEFAULT_IOS_APP_CATALOG.map(async (app) => ({
    ...app,
    isInstalled: await canOpenApp(app.scheme),
  })),
)
const onlyInstalled = installed.filter((app) => app.isInstalled)
```

Notes:

- Catalog ships **metadata only** — no icons (avoids brand-asset licensing and bundle bloat). Supply your own icons.
- `bundleId` is treated as a stable downstream identifier — entries are never renamed once published; new entries are appended instead.
- Schemes drift over time as vendors rebrand. The catalog is re-audited periodically; see the `Last audited` line in `src/iosAppCatalog.ts`.
- The plugin opt-in stays `false` by default to keep behavior identical for 0.2.x consumers upgrading.

### iOS FamilyControls (Screen Time API)

iOS 16+ exposes the FamilyControls authorization flow used by Screen Time-based blockers. This is the prerequisite for the upcoming `FamilyActivityPicker` and shielding APIs.

```typescript
import {
  requestFamilyControlsAuthorization,
  getFamilyControlsAuthorizationStatus,
} from 'expo-list-installed-apps'

const status = getFamilyControlsAuthorizationStatus()
// 'approved' | 'denied' | 'notDetermined' | 'unavailable' | 'unknown'

if (status === 'notDetermined') {
  const approved = await requestFamilyControlsAuthorization()
}
```

To enable the underlying entitlement (`com.apple.developer.family-controls`), opt in via the bundled config plugin and bump your iOS deployment target to 16.0:

```json
{
  "expo": {
    "plugins": [
      ["expo-list-installed-apps", { "ios": { "familyControls": true } }],
      ["expo-build-properties", { "ios": { "deploymentTarget": "16.0" } }]
    ]
  }
}
```

Notes:

- Consumers using `FamilyActivityPicker` or FamilyControls authorization must set their iOS deployment target to **16.0** or higher.
- Returns `false` / `'unavailable'` on Android and iOS < 16.
- `requestFamilyControlsAuthorization()` rejects on system errors (most commonly when the entitlement is missing from the build) and resolves `true`/`false` for the user's decision — always wrap the call in try/catch.
- App Store distribution requires Apple to approve the Family Controls entitlement separately. Development and TestFlight builds work with the dev provisioning profile.

#### App selection picker

Once authorized, render Apple's `FamilyActivityPicker` so the user can select apps, categories, and web domains to manage. The picker is exported from a sub-path so Android-only consumers don't pull in the iOS view manager:

```tsx
import { FamilyActivityPicker } from 'expo-list-installed-apps/picker'
;<FamilyActivityPicker
  style={{ flex: 1 }}
  headerTitle="Pick apps to manage"
  onSelectionCountsChange={({ nativeEvent }) => {
    console.log(nativeEvent.applicationCount, nativeEvent.categoryCount)
  }}
/>
```

The picker's selection consists of opaque `ApplicationToken`s — bundle IDs and app names are not exposed to your main app directly. Only counts (`applicationCount`, `categoryCount`, `webDomainCount`) cross the JS bridge synchronously; to resolve tokens to display names, use `getResolvedApps()` together with the bundled `DeviceActivityReportExtension` (M4 — see below).

On Android (and iOS < 16) `FamilyActivityPicker` renders an empty `View` so the import is safe in cross-platform code. Branch on `getPlatformCapabilities().familyControlsAvailable` if you need to hide the UI entirely.

#### Resolving picker tokens to app names (M4)

Apple only exposes `localizedDisplayName` (and sometimes `bundleIdentifier`) on `ApplicationToken` from inside a `DeviceActivityReportExtension`. The bundled config plugin auto-injects that extension target during `expo prebuild` and shares an App Group with the main app so resolved data can be read back via `getResolvedApps()`.

Opt in by adding an App Group and `deviceActivityReport: true` to the plugin options:

```jsonc
{
  "expo": {
    "plugins": [
      [
        "expo-list-installed-apps",
        {
          "ios": {
            "familyControls": true,
            "appGroups": ["group.your.bundle.id"],
            "deviceActivityReport": true
          }
        }
      ],
      ["expo-build-properties", { "ios": { "deploymentTarget": "16.0" } }]
    ]
  }
}
```

```ts
import { getResolvedApps, getResolvedAppsError } from 'expo-list-installed-apps'

const apps = await getResolvedApps()
// [{ appName: 'Mail', packageName: 'com.apple.mobilemail', ... }, ...]

// If the list keeps coming back empty, check whether the extension itself
// reported a failure (e.g. JSON encode error inside the report scene).
// Returns `null` when there's nothing to report; also `null` on Android / iOS < 16.
const lastError = await getResolvedAppsError()
```

Caveats:

- The extension is OS-scheduled, not on-demand — the first call after a fresh selection may return `[]`. Re-call after a few seconds, or render a `DeviceActivityReport` SwiftUI scene with the picker filter to nudge the OS to invoke the extension.
- `bundleIdentifier` is reported as `nil` for some apps inside the extension; in that case `packageName` will be empty and only `appName` is populated.
- Icon, version, and install-time fields are filled with empty defaults — extensions cap at 5 MB of memory, so we deliberately do not load app icons here.
- The App Group identifier you pass in `appGroups[0]` must be enabled for the bundle ID in your Apple Developer account; the same identifier is automatically applied to the extension target.
- Apple requires a separate entitlement approval for the extension's bundle ID before App Store distribution (your project will have **two** registered bundle IDs after enabling M4: the main app and `<main-bundle-id>.DeviceActivityReportExtension`). Development and TestFlight builds work with the dev provisioning profile.
- The extension's Swift sources, `Info.plist`, and entitlements are **regenerated by the config plugin on every `expo prebuild`** — hand-edits inside `ios/DeviceActivityReportExtension/` will be lost on the next prebuild. To customize the report logic, fork the plugin or the templates in `plugin/src/deviceActivityTemplates.ts`.

## Notes

- This module uses native code and does not support web.
- On iOS, `listInstalledApps()` currently returns `[]` — see [Platform Support](#platform-support).
- For more details, see the source files in the `src/` directory.

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
