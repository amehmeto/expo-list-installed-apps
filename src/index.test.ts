import { AppType, UniqueBy } from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'
import {
  DEFAULT_IOS_APP_CATALOG,
  DEFAULT_IOS_APP_SCHEMES,
  canOpenApp,
  getFamilyControlsAuthorizationStatus,
  getPlatformCapabilities,
  getResolvedApps,
  listInstalledApps,
  requestFamilyControlsAuthorization,
} from './index'

// Mock the native module
jest.mock('./ExpoListInstalledAppsModule', () => ({
  listInstalledApps: jest.fn(),
  canOpenApp: jest.fn(),
  getPlatformCapabilities: jest.fn(),
  requestFamilyControlsAuthorization: jest.fn(),
  getFamilyControlsAuthorizationStatus: jest.fn(),
  getResolvedApps: jest.fn(),
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

describe('canOpenApp', () => {
  beforeEach(() => {
    ExpoListInstalledAppsModule.canOpenApp.mockClear()
  })

  it('returns false for an empty string without calling the native module', async () => {
    const result = await canOpenApp('')
    expect(result).toBe(false)
    expect(ExpoListInstalledAppsModule.canOpenApp).not.toHaveBeenCalled()
  })

  it('returns false for whitespace-only input without calling the native module', async () => {
    const result = await canOpenApp('   ')
    expect(result).toBe(false)
    expect(ExpoListInstalledAppsModule.canOpenApp).not.toHaveBeenCalled()
  })

  it('returns false for non-string input without calling the native module', async () => {
    const result = await canOpenApp(undefined as unknown as string)
    expect(result).toBe(false)
    expect(ExpoListInstalledAppsModule.canOpenApp).not.toHaveBeenCalled()
  })

  it('forwards the scheme to the native module and returns true when native returns true', async () => {
    ExpoListInstalledAppsModule.canOpenApp.mockResolvedValue(true)

    const result = await canOpenApp('instagram')

    expect(ExpoListInstalledAppsModule.canOpenApp).toHaveBeenCalledWith(
      'instagram',
    )
    expect(result).toBe(true)
  })

  it('strips a trailing :// from the scheme before forwarding', async () => {
    ExpoListInstalledAppsModule.canOpenApp.mockResolvedValue(true)

    await canOpenApp('maps://')

    expect(ExpoListInstalledAppsModule.canOpenApp).toHaveBeenCalledWith('maps')
  })

  it('returns false for a bare :// without forwarding', async () => {
    const result = await canOpenApp('://')
    expect(result).toBe(false)
    expect(ExpoListInstalledAppsModule.canOpenApp).not.toHaveBeenCalled()
  })

  it('returns false when the native module returns false', async () => {
    ExpoListInstalledAppsModule.canOpenApp.mockResolvedValue(false)

    const result = await canOpenApp('instagram')

    expect(result).toBe(false)
  })

  it('returns false when the native module returns null', async () => {
    ExpoListInstalledAppsModule.canOpenApp.mockResolvedValue(null)

    const result = await canOpenApp('instagram')

    expect(result).toBe(false)
  })

  it('returns false when the native module returns undefined', async () => {
    ExpoListInstalledAppsModule.canOpenApp.mockResolvedValue(undefined)

    const result = await canOpenApp('instagram')

    expect(result).toBe(false)
  })
})

describe('getPlatformCapabilities', () => {
  beforeEach(() => {
    ExpoListInstalledAppsModule.getPlatformCapabilities.mockClear()
  })

  it('passes through the iOS capabilities object', async () => {
    const iosCaps = {
      platform: 'ios',
      canListInstalledApps: false,
      canCheckUrlScheme: true,
      urlSchemeLimit: 50,
      requiresSchemeDeclaration: true,
      requiresRuntimePermission: false,
      familyControlsAvailable: true,
    }
    ExpoListInstalledAppsModule.getPlatformCapabilities.mockResolvedValue(
      iosCaps,
    )

    const result = await getPlatformCapabilities()

    expect(result).toEqual(iosCaps)
  })

  it('passes through the Android capabilities object', async () => {
    const androidCaps = {
      platform: 'android',
      canListInstalledApps: true,
      canCheckUrlScheme: true,
      urlSchemeLimit: null,
      requiresSchemeDeclaration: false,
      requiresRuntimePermission: true,
      familyControlsAvailable: false,
    }
    ExpoListInstalledAppsModule.getPlatformCapabilities.mockResolvedValue(
      androidCaps,
    )

    const result = await getPlatformCapabilities()

    expect(result).toEqual(androidCaps)
  })

  // Contract test: the keys returned by getPlatformCapabilities must match
  // the PlatformCapabilities type exactly. Renaming a field on either side
  // (Swift / Kotlin / TS) will break this test.
  it('exposes exactly the documented capability keys', async () => {
    ExpoListInstalledAppsModule.getPlatformCapabilities.mockResolvedValue({
      platform: 'ios',
      canListInstalledApps: false,
      canCheckUrlScheme: true,
      urlSchemeLimit: 50,
      requiresSchemeDeclaration: true,
      requiresRuntimePermission: false,
      familyControlsAvailable: true,
    })

    const result = await getPlatformCapabilities()

    expect(Object.keys(result).sort()).toEqual(
      [
        'canCheckUrlScheme',
        'canListInstalledApps',
        'familyControlsAvailable',
        'platform',
        'requiresRuntimePermission',
        'requiresSchemeDeclaration',
        'urlSchemeLimit',
      ].sort(),
    )
  })
})

describe('requestFamilyControlsAuthorization', () => {
  beforeEach(() => {
    ExpoListInstalledAppsModule.requestFamilyControlsAuthorization.mockClear()
  })

  it('returns true when the native module reports approved', async () => {
    ExpoListInstalledAppsModule.requestFamilyControlsAuthorization.mockResolvedValue(
      true,
    )
    const result = await requestFamilyControlsAuthorization()
    expect(result).toBe(true)
    expect(
      ExpoListInstalledAppsModule.requestFamilyControlsAuthorization,
    ).toHaveBeenCalledTimes(1)
  })

  it('returns false when the native module reports denied', async () => {
    ExpoListInstalledAppsModule.requestFamilyControlsAuthorization.mockResolvedValue(
      false,
    )
    const result = await requestFamilyControlsAuthorization()
    expect(result).toBe(false)
  })

  it('returns false when the native module returns a non-boolean value', async () => {
    ExpoListInstalledAppsModule.requestFamilyControlsAuthorization.mockResolvedValue(
      null,
    )
    const result = await requestFamilyControlsAuthorization()
    expect(result).toBe(false)
  })
})

describe('getFamilyControlsAuthorizationStatus', () => {
  beforeEach(() => {
    ExpoListInstalledAppsModule.getFamilyControlsAuthorizationStatus.mockClear()
  })

  it.each([
    ['approved'],
    ['denied'],
    ['notDetermined'],
    ['unavailable'],
    ['unknown'],
  ])('passes through the %s status', (status) => {
    ExpoListInstalledAppsModule.getFamilyControlsAuthorizationStatus.mockReturnValue(
      status,
    )
    expect(getFamilyControlsAuthorizationStatus()).toBe(status)
  })

  it('returns "unknown" when the native module returns an unrecognized status', () => {
    ExpoListInstalledAppsModule.getFamilyControlsAuthorizationStatus.mockReturnValue(
      'gibberish',
    )
    expect(getFamilyControlsAuthorizationStatus()).toBe('unknown')
  })
})

describe('DEFAULT_IOS_APP_CATALOG', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DEFAULT_IOS_APP_CATALOG)).toBe(true)
    expect(DEFAULT_IOS_APP_CATALOG.length).toBeGreaterThan(0)
  })

  it('has fully populated entries', () => {
    for (const app of DEFAULT_IOS_APP_CATALOG) {
      expect(app.appName.length).toBeGreaterThan(0)
      expect(app.scheme.length).toBeGreaterThan(0)
      expect(app.bundleId.length).toBeGreaterThan(0)
    }
  })

  it('uses bare lowercase schemes with no "://"', () => {
    for (const app of DEFAULT_IOS_APP_CATALOG) {
      expect(app.scheme).toBe(app.scheme.toLowerCase())
      expect(app.scheme).not.toContain('://')
    }
  })

  it('has unique schemes', () => {
    const schemes = DEFAULT_IOS_APP_CATALOG.map((a) => a.scheme)
    expect(new Set(schemes).size).toBe(schemes.length)
  })

  it('has unique bundleIds', () => {
    const ids = DEFAULT_IOS_APP_CATALOG.map((a) => a.bundleId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('stays under the iOS LSApplicationQueriesSchemes limit', () => {
    expect(DEFAULT_IOS_APP_SCHEMES.length).toBeLessThanOrEqual(50)
  })
})

describe('getResolvedApps', () => {
  beforeEach(() => {
    ExpoListInstalledAppsModule.getResolvedApps.mockClear()
  })

  it('passes through the array returned by the native module', async () => {
    const resolved = [
      {
        packageName: 'com.example.one',
        appName: 'Example One',
        versionName: '',
        versionCode: 0,
        firstInstallTime: 0,
        lastUpdateTime: 0,
        icon: '',
        apkDir: '',
        size: 0,
        activityName: '',
      },
    ]
    ExpoListInstalledAppsModule.getResolvedApps.mockResolvedValue(resolved)
    const result = await getResolvedApps()
    expect(result).toEqual(resolved)
  })

  it('returns [] when the native module returns null', async () => {
    ExpoListInstalledAppsModule.getResolvedApps.mockResolvedValue(null)
    expect(await getResolvedApps()).toEqual([])
  })

  it('returns [] when the native module returns a non-array value', async () => {
    ExpoListInstalledAppsModule.getResolvedApps.mockResolvedValue({})
    expect(await getResolvedApps()).toEqual([])
  })

  it('returns [] when the native module does not implement the function', async () => {
    const original = ExpoListInstalledAppsModule.getResolvedApps
    ;(
      ExpoListInstalledAppsModule as unknown as Record<string, unknown>
    ).getResolvedApps = undefined
    expect(await getResolvedApps()).toEqual([])
    ;(
      ExpoListInstalledAppsModule as unknown as Record<string, unknown>
    ).getResolvedApps = original
  })
})
