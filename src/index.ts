// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import {
  AppType,
  AuthorizationStatus,
  InstalledApp,
  PlatformCapabilities,
  UniqueBy,
} from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'

export {
  AppType,
  AuthorizationStatus,
  InstalledApp,
  PlatformCapabilities,
  UniqueBy,
} from './ExpoListInstalledApps.types'

export async function listInstalledApps(
  options: {
    type?: AppType
    uniqueBy?: UniqueBy
  } = { type: AppType.ALL, uniqueBy: UniqueBy.PACKAGE },
): Promise<InstalledApp[]> {
  const apps = (await ExpoListInstalledAppsModule.listInstalledApps(
    options?.type ?? AppType.ALL,
    options?.uniqueBy ?? UniqueBy.PACKAGE,
  )) as Promise<InstalledApp[]>
  // Check if the result is an array
  if (!Array.isArray(apps)) {
    return []
  }
  return apps || []
}

export async function canOpenApp(scheme: string): Promise<boolean> {
  if (typeof scheme !== 'string' || scheme.trim() === '') return false
  const result = await ExpoListInstalledAppsModule.canOpenApp(scheme)
  return result === true
}

export async function getPlatformCapabilities(): Promise<PlatformCapabilities> {
  return await ExpoListInstalledAppsModule.getPlatformCapabilities()
}

const AUTHORIZATION_STATUSES: ReadonlySet<AuthorizationStatus> = new Set([
  'approved',
  'denied',
  'notDetermined',
  'unavailable',
  'unknown',
])

export async function requestFamilyControlsAuthorization(): Promise<boolean> {
  if (
    typeof ExpoListInstalledAppsModule.requestFamilyControlsAuthorization !==
    'function'
  ) {
    return false
  }
  const result =
    await ExpoListInstalledAppsModule.requestFamilyControlsAuthorization()
  return result === true
}

export function getFamilyControlsAuthorizationStatus(): AuthorizationStatus {
  if (
    typeof ExpoListInstalledAppsModule.getFamilyControlsAuthorizationStatus !==
    'function'
  ) {
    return 'unavailable'
  }
  const result =
    ExpoListInstalledAppsModule.getFamilyControlsAuthorizationStatus()
  return AUTHORIZATION_STATUSES.has(result as AuthorizationStatus)
    ? (result as AuthorizationStatus)
    : 'unknown'
}
