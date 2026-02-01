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
} from 'expo-list-installed-apps'

async function getApps() {
  const apps: InstalledApp[] = await listInstalledApps({ type: AppType.ALL })
  console.log(apps)
}
```

## API

### listInstalledApps(options?: { type?: AppType }): Promise<InstalledApp[]>

Lists installed applications on the device.

#### Parameters

- `options.type` (optional):
  - `AppType.ALL` (default): List all apps
  - `AppType.SYSTEM`: List only system apps
  - `AppType.USER`: List only user-installed apps

#### Returns

- `Promise<InstalledApp[]>`: An array of installed app objects.

### Types

#### AppType

- `ALL`
- `SYSTEM`
- `USER`

#### InstalledApp

An object representing an installed application. See `ExpoListInstalledApps.types.ts` for the full type definition.

## Notes

- This module uses native code and will not work on web platforms.
- For more details, see the source files in the `src/` directory.

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
