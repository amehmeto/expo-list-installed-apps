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
