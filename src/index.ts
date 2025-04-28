// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import {
  AppType,
  ChangeEventPayload,
  ExpoListInstalledAppsViewProps,
  InstalledApp,
} from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'

export async function listInstalledApps(options?: {
  type?: AppType
}): Promise<InstalledApp[]> {
  return ExpoListInstalledAppsModule.listInstalledApps(
    options?.type ?? AppType.ALL,
  ) as Promise<InstalledApp[]>
}

export { ExpoListInstalledAppsViewProps, ChangeEventPayload }
