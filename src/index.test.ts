import {
  AUTHORIZATION_STATUSES,
  AppType,
  UniqueBy,
} from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'
import {
  canOpenApp,
  getFamilyControlsAuthorizationStatus,
  getPlatformCapabilities,
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

  it('should filter out items that do not match the InstalledApp shape', async () => {
    const validApp = mockApps[0]
    const garbage = [
      validApp,
      null,
      'oops',
      { packageName: 'incomplete' },
      { ...validApp, versionCode: 'should-be-number' },
    ]
    ExpoListInstalledAppsModule.listInstalledApps.mockResolvedValue(garbage)

    const result = await listInstalledApps()

    expect(result).toEqual([validApp])
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
    // Intentionally violating the public type to verify the runtime guard.
    // @ts-expect-error consumers may pass garbage in plain JS
    const result = await canOpenApp(undefined)
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

  // Driven by AUTHORIZATION_STATUSES so adding a status updates both the
  // runtime check and this test in lockstep.
  it.each(AUTHORIZATION_STATUSES)('passes through the %s status', (status) => {
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
