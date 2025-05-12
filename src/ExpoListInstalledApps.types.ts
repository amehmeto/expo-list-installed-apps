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
}

export enum AppType {
  USER = 'user',
  SYSTEM = 'system',
  ALL = 'all',
}
