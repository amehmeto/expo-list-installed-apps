// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import {
  AUTHORIZATION_STATUSES,
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

function isInstalledApp(value: unknown): value is InstalledApp {
  if (typeof value !== 'object' || value === null) return false
  return (
    'packageName' in value &&
    typeof value.packageName === 'string' &&
    'versionName' in value &&
    typeof value.versionName === 'string' &&
    'versionCode' in value &&
    typeof value.versionCode === 'number' &&
    'firstInstallTime' in value &&
    typeof value.firstInstallTime === 'number' &&
    'lastUpdateTime' in value &&
    typeof value.lastUpdateTime === 'number' &&
    'appName' in value &&
    typeof value.appName === 'string' &&
    'icon' in value &&
    typeof value.icon === 'string' &&
    'apkDir' in value &&
    typeof value.apkDir === 'string' &&
    'size' in value &&
    typeof value.size === 'number' &&
    'activityName' in value &&
    typeof value.activityName === 'string'
  )
}

export async function listInstalledApps(
  options: {
    type?: AppType
    uniqueBy?: UniqueBy
  } = { type: AppType.ALL, uniqueBy: UniqueBy.PACKAGE },
): Promise<InstalledApp[]> {
  const apps = await ExpoListInstalledAppsModule.listInstalledApps(
    options?.type ?? AppType.ALL,
    options?.uniqueBy ?? UniqueBy.PACKAGE,
  )
  if (!Array.isArray(apps)) {
    return []
  }
  return apps.filter(isInstalledApp)
}

export async function canOpenApp(scheme: string): Promise<boolean> {
  if (typeof scheme !== 'string') return false
  let trimmed = scheme.trim()
  if (trimmed.endsWith('://')) trimmed = trimmed.slice(0, -3)
  if (trimmed === '') return false
  const result = await ExpoListInstalledAppsModule.canOpenApp(trimmed)
  return result === true
}

export async function getPlatformCapabilities(): Promise<PlatformCapabilities> {
  return await ExpoListInstalledAppsModule.getPlatformCapabilities()
}

function isAuthorizationStatus(value: unknown): value is AuthorizationStatus {
  if (typeof value !== 'string') return false
  return AUTHORIZATION_STATUSES.some((status) => status === value)
}

/**
 * Requests Family Controls authorization (iOS 16+ only).
 *
 * Resolves to `true` when the user approves and `false` when the user declines
 * or the platform is unsupported. Rejects on system errors — most commonly
 * when the `com.apple.developer.family-controls` entitlement is missing from
 * the build. Always wrap the call in try/catch in production code.
 */
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
  return isAuthorizationStatus(result) ? result : 'unknown'
}
