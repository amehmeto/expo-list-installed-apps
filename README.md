# expo-list-installed-apps

A React Native module to list installed applications on the device. Supports only Android platform.

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

## Notes

- This module uses native code and will not work on web platforms.
- For more details, see the source files in the `src/` directory.

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
