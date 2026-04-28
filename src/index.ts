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
  if (!Array.isArray(apps)) {
    return []
  }
  return apps || []
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

const AUTHORIZATION_STATUSES: ReadonlySet<AuthorizationStatus> = new Set([
  'approved',
  'denied',
  'notDetermined',
  'unavailable',
  'unknown',
])

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
  return AUTHORIZATION_STATUSES.has(result as AuthorizationStatus)
    ? (result as AuthorizationStatus)
    : 'unknown'
}
