// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import { AppType, InstalledApp } from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'

export async function listInstalledApps(
  options: {
    type?: AppType
  } = { type: AppType.ALL },
): Promise<InstalledApp[]> {
  const apps = (await ExpoListInstalledAppsModule.listInstalledApps(
    options?.type ?? AppType.ALL,
  )) as Promise<InstalledApp[]>
  // Check if the result is an array
  if (!Array.isArray(apps)) {
    return []
  }
  return apps || []
}
