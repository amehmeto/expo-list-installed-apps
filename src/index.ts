// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import {
  AUTHORIZATION_STATUSES,
  AppType,
  type AuthorizationStatus,
  type InstalledApp,
  type PlatformCapabilities,
  UniqueBy,
} from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'

export {
  AppType,
  type AuthorizationStatus,
  type InstalledApp,
  type IosKnownApp,
  type PlatformCapabilities,
  UniqueBy,
} from './ExpoListInstalledApps.types'

export {
  DEFAULT_IOS_APP_CATALOG,
  DEFAULT_IOS_APP_SCHEMES,
} from './iosAppCatalog'

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

/**
 * Returns the apps resolved by the iOS DeviceActivityReportExtension from the
 * opaque tokens picked by `FamilyActivityPicker`.
 *
 * Returns `[]` on platforms where the extension is not registered (Android,
 * iOS < 16, or before the extension has been triggered for the first time).
 *
 * Only `appName` and `packageName` carry meaningful data:
 * - `appName` — `localizedDisplayName` from the extension; may be empty.
 * - `packageName` — `bundleIdentifier`; reported as empty for some apps by
 *   Apple's report API.
 *
 * Every other `InstalledApp` field (`versionName`, `versionCode`, `icon`, `size`,
 * `firstInstallTime`, `lastUpdateTime`, `apkDir`, `activityName`) is filled with
 * an empty default — the extension can't access that data (5 MB memory ceiling).
 * Treat empty values as "not available" rather than "the field is genuinely empty".
 *
 * The extension is OS-scheduled, not on-demand: expect a short delay between
 * a fresh selection and the first non-empty result.
 */
export async function getResolvedApps(): Promise<InstalledApp[]> {
  const apps = await callOptionalNative('getResolvedApps')
  if (!Array.isArray(apps)) {
    return []
  }
  return apps.filter(isInstalledApp)
}

/**
 * Returns the most recent error string the iOS DeviceActivityReportExtension
 * stashed in shared `UserDefaults` (e.g. JSON encode failures inside the
 * extension), or `null` if the extension has not reported an error.
 *
 * Use this when `getResolvedApps()` keeps returning `[]` and you want to
 * distinguish "extension hasn't run yet" from "extension ran but failed."
 * Always `null` on Android and iOS < 16.
 */
export async function getResolvedAppsError(): Promise<string | null> {
  const result = await callOptionalNative('getResolvedAppsError')
  return typeof result === 'string' ? result : null
}

/**
 * Makes the selection being edited in `FamilyActivityPicker` the saved one,
 * then drops the draft and the names `getResolvedApps()` resolved for the
 * previous selection. Does nothing when no draft exists, and on Android and
 * iOS < 16.
 */
export async function saveFamilyActivitySelectionDraft(): Promise<void> {
  await callOptionalNative('saveFamilyActivitySelectionDraft')
}

/**
 * Drops the selection being edited in `FamilyActivityPicker` and keeps the
 * saved one. Does nothing on Android and iOS < 16.
 */
export async function discardFamilyActivitySelectionDraft(): Promise<void> {
  await callOptionalNative('discardFamilyActivitySelectionDraft')
}

// Native functions that older builds, Android or iOS < 16 may not register.
// Resolves `undefined` when the function is absent.
async function callOptionalNative(name: string): Promise<unknown> {
  const fn: unknown = ExpoListInstalledAppsModule[name]
  if (typeof fn !== 'function') return undefined
  return fn.call(ExpoListInstalledAppsModule)
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
