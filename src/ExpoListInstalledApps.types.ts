/**
 * Metadata about an installed app.
 *
 * Currently only populated on Android. On iOS, `listInstalledApps` returns `[]`
 * because Apple does not expose a public API to enumerate installed apps. iOS
 * consumers should use `canOpenApp(scheme)` together with schemes declared in
 * `LSApplicationQueriesSchemes`. Real iOS enumeration is planned for a future
 * milestone via `FamilyActivityPicker`.
 */
export type InstalledApp = {
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

export enum AppType {
  USER = 'user',
  SYSTEM = 'system',
  ALL = 'all',
}

export enum UniqueBy {
  NONE = 'none', // Return all launcher activities (may include duplicates per package)
  PACKAGE = 'package', // Return one entry per package name (default)
}

/**
 * Describes what app-detection capabilities the current platform supports.
 *
 * - `canListInstalledApps`: whether `listInstalledApps()` returns a real list.
 *   `false` on iOS (Apple offers no public enumeration API).
 * - `canCheckUrlScheme`: whether `canOpenApp(scheme)` works.
 * - `urlSchemeLimit`: maximum number of schemes the platform will probe.
 *   `null` means no limit. iOS caps `LSApplicationQueriesSchemes` at ~50.
 * - `requiresSchemeDeclaration`: on iOS, schemes must be pre-declared in
 *   `Info.plist` under `LSApplicationQueriesSchemes` or `canOpenURL` silently
 *   returns `false`. Use the bundled Expo config plugin to inject them.
 * - `requiresRuntimePermission`: Android API 30+ requires the
 *   `QUERY_ALL_PACKAGES` permission to enumerate apps.
 * - `familyControlsAvailable`: iOS 16+ FamilyControls framework is usable.
 *   Always `false` on Android/web. Even when `true`, Screen Time APIs require
 *   the `com.apple.developer.family-controls` entitlement to actually work.
 */
export type PlatformCapabilities = {
  platform: 'ios' | 'android' | 'web'
  canListInstalledApps: boolean
  canCheckUrlScheme: boolean
  urlSchemeLimit: number | null
  requiresSchemeDeclaration: boolean
  requiresRuntimePermission: boolean
  familyControlsAvailable: boolean
}

/**
 * Status of the iOS FamilyControls authorization. Returned by
 * `getFamilyControlsAuthorizationStatus()`.
 *
 * - `approved`: user granted Screen Time access.
 * - `denied`: user denied Screen Time access.
 * - `notDetermined`: authorization has not been requested yet.
 * - `unavailable`: platform does not support FamilyControls (Android, web,
 *   or iOS < 16).
 * - `unknown`: an authorization status was returned that this version of the
 *   module does not recognize.
 */
export type AuthorizationStatus =
  | 'approved'
  | 'denied'
  | 'notDetermined'
  | 'unavailable'
  | 'unknown'
