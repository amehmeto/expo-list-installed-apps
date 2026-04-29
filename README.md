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

| Feature                                   | Android | iOS                                             |
| ----------------------------------------- | ------- | ----------------------------------------------- |
| List all installed apps                   | Full    | Not possible (Apple privacy) — returns `[]`     |
| Detect specific app by URL scheme         | M2      | M2                                              |
| User-driven app selection (system picker) | N/A     | M3 (requires Apple Family Controls entitlement) |
| App metadata (name, icon, version)        | Full    | M4 (extension-only, limited resolution)         |

iOS cannot enumerate every installed app — Apple has no public API for that, by design. iOS support therefore takes a different shape than Android:

- **M2** — `canOpenApp(scheme)` to check if a known app is installed via URL scheme (Android via `PackageManager`, iOS via `UIApplication.canOpenURL`).
- **M3** — `FamilyActivityPicker` view component for user-driven selection plus app shielding via `ManagedSettings`.
- **M4** — Extension-based name/icon resolution and scheduled blocking.

On iOS, `listInstalledApps()` returns `[]` so cross-platform consumers can import the module without crashing. iOS detection lives in `canOpenApp(scheme)` (M2) and the `FamilyActivityPicker` view (M3); name resolution lands in M4 via a `DeviceActivityReport` extension.

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

The picker's selection consists of opaque `ApplicationToken`s — bundle IDs and app names are not exposed to your main app. Only counts (`applicationCount`, `categoryCount`, `webDomainCount`) cross the JS bridge today; resolving tokens to names or acting on the selection requires a `DeviceActivityReport` extension (M4).

On Android (and iOS < 16) `FamilyActivityPicker` renders an empty `View` so the import is safe in cross-platform code. Branch on `getPlatformCapabilities().familyControlsAvailable` if you need to hide the UI entirely.

## Notes

- This module uses native code and does not support web.
- On iOS, `listInstalledApps()` currently returns `[]` — see [Platform Support](#platform-support).
- For more details, see the source files in the `src/` directory.

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
