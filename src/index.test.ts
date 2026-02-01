import { AppType, UniqueBy } from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'
import { listInstalledApps } from './index'

// Mock the native module
jest.mock('./ExpoListInstalledAppsModule', () => ({
  listInstalledApps: jest.fn(),
}))

describe('listInstalledApps', () => {
  const mockApps = [
    {
      packageName: 'package.name',
      versionName: '1.0.0',
      versionCode: 24,
      firstInstallTime: 1672531199000,
      lastUpdateTime: 1672531199000,
      appName: 'System App',
      icon: 'base64encodedicon',
      apkDir: '/path/to/apk',
      size: 12345678,
      activityName: 'com.example.MainActivity',
    },
    {
      packageName: 'package.name2',
      versionName: '1.0.1',
      versionCode: 25,
      firstInstallTime: 1672531199000,
      lastUpdateTime: 1672531199000,
      appName: 'User App',
      icon: 'base64encodedicon2',
      apkDir: '/path/to/apk2',
      size: 23456789,
      activityName: 'com.example2.MainActivity',
    },
  ]

  beforeEach(() => {
    // Clear mock calls before each test
    ExpoListInstalledAppsModule.listInstalledApps.mockClear()
  })

  it('should call ExpoListInstalledAppsModule.listInstalledApps with default AppType.ALL and UniqueBy.PACKAGE', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(mockApps)

    const result = await listInstalledApps()

    expect(ExpoListInstalledAppsModule.listInstalledApps).toHaveBeenCalledWith(
      AppType.ALL,
      UniqueBy.PACKAGE,
    )
    expect(result).toEqual(mockApps)
  })

  it('should call ExpoListInstalledAppsModule.listInstalledApps with specified AppType', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(
      mockApps.filter((app) => app.appName === 'User App'),
    )

    const result = await listInstalledApps({ type: AppType.USER })

    expect(ExpoListInstalledAppsModule.listInstalledApps).toHaveBeenCalledWith(
      AppType.USER,
      UniqueBy.PACKAGE,
    )
    expect(result).toEqual(mockApps.filter((app) => app.appName === 'User App'))
  })

  it('should handle empty options by defaulting to AppType.ALL and UniqueBy.PACKAGE', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(mockApps)

    const result = await listInstalledApps({})

    expect(ExpoListInstalledAppsModule.listInstalledApps).toHaveBeenCalledWith(
      AppType.ALL,
      UniqueBy.PACKAGE,
    )
    expect(result).toEqual(mockApps)
  })

  it('should call ExpoListInstalledAppsModule.listInstalledApps with UniqueBy.NONE when specified', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(mockApps)

    const result = await listInstalledApps({ uniqueBy: UniqueBy.NONE })

    expect(ExpoListInstalledAppsModule.listInstalledApps).toHaveBeenCalledWith(
      AppType.ALL,
      UniqueBy.NONE,
    )
    expect(result).toEqual(mockApps)
  })

  it('should return a promise that resolves to an array of InstalledApp', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(mockApps)

    const result = await listInstalledApps()

    expect(result).toBeInstanceOf(Array)
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('packageName')
      expect(result[0]).toHaveProperty('versionName')
      expect(result[0]).toHaveProperty('versionCode')
      expect(result[0]).toHaveProperty('appName')
      expect(result[0]).toHaveProperty('size')
      expect(result[0]).toHaveProperty('icon')
      expect(result[0]).toHaveProperty('firstInstallTime')
      expect(result[0]).toHaveProperty('lastUpdateTime')
      expect(result[0]).toHaveProperty('apkDir')
      expect(result[0]).toHaveProperty('activityName')
    }
  })

  it('should handle errors from the native module', async () => {
    const errorMessage = 'Native module error'
    ExpoListInstalledAppsModule.listInstalledApps.mockRejectedValue(
      new Error(errorMessage),
    )

    await expect(listInstalledApps()).rejects.toThrow(errorMessage)
  })

  it('should return an empty array when no apps are installed', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue([])

    const result = await listInstalledApps()

    expect(result).toEqual([])
  })

  it('should return an empty array when the native module returns null', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(null)

    const result = await listInstalledApps()

    expect(result).toEqual([])
  })

  it('should return an empty array when the native module returns undefined', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(undefined)

    const result = await listInstalledApps()

    expect(result).toEqual([])
  })

  it('should return an empty array when the native module returns an empty string', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue('')

    const result = await listInstalledApps()

    expect(result).toEqual([])
  })

  it('should return an empty array when the native module returns a non-array value', async () => {
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue({})

    const result = await listInstalledApps()

    expect(result).toEqual([])
  })
})
