import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

import withDeviceActivityExtension, {
  stripQuotes,
} from '../withDeviceActivityExtension'
import { EXTENSION_TARGET_NAME } from '../deviceActivityTemplates'

type Mod = (input: {
  modRequest: {
    nextMod: (config: unknown) => unknown
    platformProjectRoot: string
  }
  modResults: unknown
  ios?: { bundleIdentifier?: string }
  [key: string]: unknown
}) => Promise<{ modResults: unknown }> | { modResults: unknown }

type ConfigWithMods = {
  ios?: { bundleIdentifier?: string }
  mods?: {
    ios?: {
      dangerous?: Mod
      xcodeproj?: Mod
    }
  }
}

const APP_GROUP = 'group.example.test'
const identityNext = <T>(c: T): T => c

describe('stripQuotes', () => {
  it('strips paired surrounding quotes', () => {
    expect(stripQuotes('"com.foo.bar"')).toBe('com.foo.bar')
  })

  it('leaves unquoted strings unchanged', () => {
    expect(stripQuotes('com.foo.bar')).toBe('com.foo.bar')
  })

  it('returns empty string for null/undefined', () => {
    expect(stripQuotes(undefined)).toBe('')
    expect(stripQuotes(null)).toBe('')
  })

  it('only strips anchored quotes, not interior ones', () => {
    expect(stripQuotes('"foo"bar"')).toBe('foo"bar')
  })
})

describe('withDeviceActivityExtension — file generation', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdae-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes the four extension files into ios/<TARGET>/', async () => {
    const config = withDeviceActivityExtension(
      {} as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods
    const dangerous = config.mods?.ios?.dangerous as Mod
    expect(dangerous).toBeDefined()

    await dangerous({
      modRequest: { nextMod: identityNext, platformProjectRoot: tmpDir },
      modResults: {},
    })

    const targetDir = path.join(tmpDir, EXTENSION_TARGET_NAME)
    expect(fs.existsSync(targetDir)).toBe(true)
    expect(
      fs.existsSync(path.join(targetDir, 'DeviceActivityReportExtension.swift')),
    ).toBe(true)
    expect(
      fs.existsSync(path.join(targetDir, 'TotalActivityReport.swift')),
    ).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'Info.plist'))).toBe(true)
    expect(
      fs.existsSync(
        path.join(targetDir, `${EXTENSION_TARGET_NAME}.entitlements`),
      ),
    ).toBe(true)
  })

  it('bakes the App Group identifier into TotalActivityReport.swift', async () => {
    const config = withDeviceActivityExtension(
      {} as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods
    const dangerous = config.mods?.ios?.dangerous as Mod

    await dangerous({
      modRequest: { nextMod: identityNext, platformProjectRoot: tmpDir },
      modResults: {},
    })

    const swift = fs.readFileSync(
      path.join(tmpDir, EXTENSION_TARGET_NAME, 'TotalActivityReport.swift'),
      'utf8',
    )
    expect(swift).toContain(`static let appGroup = "${APP_GROUP}"`)
  })
})

describe('withDeviceActivityExtension — Xcode project mutation', () => {
  type FakeProject = {
    hash: { project: { objects: Record<string, Record<string, unknown>> } }
    addTarget: jest.Mock
    addBuildPhase: jest.Mock
    addPbxGroup: jest.Mock
    addToPbxGroup: jest.Mock
    getFirstProject: jest.Mock
    getBuildProperty: jest.Mock
    pbxXCBuildConfigurationSection: jest.Mock
  }

  const buildProjectMock = (
    overrides: Partial<{
      bundleIdReturn: string
      existingTargets: Record<string, Record<string, unknown>>
    }> = {},
  ): FakeProject => {
    const buildSettings: Record<string, string> = {
      PRODUCT_NAME: `"${EXTENSION_TARGET_NAME}"`,
    }
    const configurations: Record<string, { buildSettings: typeof buildSettings }> = {
      'config-uuid': { buildSettings },
    }
    return {
      hash: {
        project: {
          objects: {
            PBXNativeTarget: overrides.existingTargets ?? {},
            PBXGroup: {},
          },
        },
      },
      addTarget: jest.fn(() => ({ uuid: 'target-uuid' })),
      addBuildPhase: jest.fn(),
      addPbxGroup: jest.fn(() => ({ uuid: 'group-uuid' })),
      addToPbxGroup: jest.fn(),
      getFirstProject: jest.fn(() => ({
        firstProject: { mainGroup: 'main-group-uuid' },
      })),
      getBuildProperty: jest.fn(
        () => overrides.bundleIdReturn ?? 'com.example.app',
      ),
      pbxXCBuildConfigurationSection: jest.fn(() => configurations),
    }
  }

  const runXcodeMod = (
    config: ConfigWithMods,
    project: FakeProject,
  ): Promise<{ modResults: unknown }> | { modResults: unknown } => {
    const xcodeproj = config.mods?.ios?.xcodeproj as Mod
    return xcodeproj({
      modRequest: { nextMod: identityNext, platformProjectRoot: '' },
      modResults: project,
      ios: config.ios,
    })
  }

  it('creates the extension target with bundle id derived from cfg.ios.bundleIdentifier', async () => {
    const project = buildProjectMock()
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    expect(project.addTarget).toHaveBeenCalledWith(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      `com.example.app.${EXTENSION_TARGET_NAME}`,
    )
  })

  it('strips surrounding quotes from getBuildProperty fallback', async () => {
    const project = buildProjectMock({
      bundleIdReturn: '"com.example.quoted"',
    })
    const config = withDeviceActivityExtension(
      {} as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    expect(project.addTarget).toHaveBeenCalledWith(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      `com.example.quoted.${EXTENSION_TARGET_NAME}`,
    )
  })

  it('attaches the new PBXGroup to the project main group via getFirstProject', async () => {
    const project = buildProjectMock()
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    expect(project.getFirstProject).toHaveBeenCalled()
    expect(project.addToPbxGroup).toHaveBeenCalledWith(
      'group-uuid',
      'main-group-uuid',
    )
  })

  it('wires Sources, Frameworks, and Resources build phases', async () => {
    const project = buildProjectMock()
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    const phaseTypes = project.addBuildPhase.mock.calls.map((call) => call[1])
    expect(phaseTypes).toEqual([
      'PBXSourcesBuildPhase',
      'PBXFrameworksBuildPhase',
      'PBXResourcesBuildPhase',
    ])
  })

  it('sets MARKETING_VERSION and CURRENT_PROJECT_VERSION on the extension build settings', async () => {
    const project = buildProjectMock()
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    const configurations = project.pbxXCBuildConfigurationSection.mock.results[0]
      .value as Record<string, { buildSettings: Record<string, string> }>
    const buildSettings = configurations['config-uuid'].buildSettings
    expect(buildSettings.MARKETING_VERSION).toBe('1.0')
    expect(buildSettings.CURRENT_PROJECT_VERSION).toBe('1')
    expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('16.0')
    expect(buildSettings.GENERATE_INFOPLIST_FILE).toBe('NO')
    expect(buildSettings.SKIP_INSTALL).toBe('YES')
  })

  it('is idempotent — second run with target already present makes no calls', async () => {
    const project = buildProjectMock({
      existingTargets: {
        'existing-uuid': { name: `"${EXTENSION_TARGET_NAME}"` },
      },
    })
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    expect(project.addTarget).not.toHaveBeenCalled()
    expect(project.addBuildPhase).not.toHaveBeenCalled()
    expect(project.addPbxGroup).not.toHaveBeenCalled()
    expect(project.addToPbxGroup).not.toHaveBeenCalled()
  })

  it('detects existing target whose name has no surrounding quotes', async () => {
    const project = buildProjectMock({
      existingTargets: {
        'existing-uuid': { name: EXTENSION_TARGET_NAME },
      },
    })
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    expect(project.addTarget).not.toHaveBeenCalled()
  })

  it('skips _comment keys when looking for the existing target', async () => {
    const project = buildProjectMock({
      existingTargets: {
        'some-uuid_comment': { name: EXTENSION_TARGET_NAME },
      },
    })
    const config = withDeviceActivityExtension(
      { ios: { bundleIdentifier: 'com.example.app' } } as never,
      { appGroup: APP_GROUP },
    ) as unknown as ConfigWithMods

    await runXcodeMod(config, project)

    // The _comment key shouldn't trigger early-return.
    expect(project.addTarget).toHaveBeenCalled()
  })
})
