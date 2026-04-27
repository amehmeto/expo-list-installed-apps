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

Today (M1), `listInstalledApps()` is wired up on iOS and returns `[]` so cross-platform consumers can import the module without crashing. See `docs/ios-implementation-plan.md` for the full milestone breakdown.

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

To enable the underlying entitlement (`com.apple.developer.family-controls`), opt in via the bundled config plugin:

```json
{
  "expo": {
    "plugins": [
      ["expo-list-installed-apps", { "ios": { "familyControls": true } }]
    ]
  }
}
```

Notes:

- Returns `false` / `'unavailable'` on Android, web, and iOS < 16.
- App Store distribution requires Apple to approve the Family Controls entitlement separately. Development and TestFlight builds work with the dev provisioning profile.

## Notes

- This module uses native code and does not support web.
- On iOS, `listInstalledApps()` currently returns `[]` — see [Platform Support](#platform-support).
- For more details, see the source files in the `src/` directory.

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
