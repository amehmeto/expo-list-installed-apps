import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

import type {
  ExportedConfig,
  ExportedConfigWithProps,
  Mod,
} from '@expo/config-plugins'
import type { ExpoConfig } from '@expo/config-types'

import withDeviceActivityExtension, {
  stripQuotes,
} from '../withDeviceActivityExtension'
import { EXTENSION_TARGET_NAME } from '../deviceActivityTemplates'

const APP_GROUP = 'group.example.test'

const baseConfig = (
  overrides: Partial<ExpoConfig> = {},
): ExpoConfig => ({
  name: 'test',
  slug: 'test',
  ...overrides,
})

// `withDangerousMod` / `withXcodeProject` add `mods` at runtime, so the
// returned value is structurally `ExportedConfig` even though `ConfigPlugin`
// declares the narrower `ExpoConfig`. `ExportedConfig` only adds an optional
// `mods?` field, so an `ExpoConfig` satisfies it structurally.
const runPlugin = (config: ExpoConfig = baseConfig()): ExportedConfig =>
  withDeviceActivityExtension(config, { appGroup: APP_GROUP })

async function runMod<T>(
  mod: Mod<T> | undefined,
  initial: T,
  rawConfig: ExpoConfig = baseConfig(),
  platformProjectRoot = '/',
): Promise<T | null> {
  if (!mod) return null
  const config: ExportedConfigWithProps<T> = {
    ...rawConfig,
    modResults: initial,
    modRequest: {
      projectRoot: '/',
      platformProjectRoot,
      modName: 'test',
      platform: 'ios',
      introspect: false,
    },
    modRawConfig: rawConfig,
  }
  const result = await mod(config)
  return result.modResults
}

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
    const result = runPlugin()
    await runMod(result.mods?.ios?.dangerous, {}, baseConfig(), tmpDir)

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
    const result = runPlugin()
    await runMod(result.mods?.ios?.dangerous, {}, baseConfig(), tmpDir)

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
    const configurations: Record<
      string,
      { buildSettings: typeof buildSettings }
    > = {
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
    project: FakeProject,
    config: ExpoConfig = baseConfig({
      ios: { bundleIdentifier: 'com.example.app' },
    }),
  ): Promise<FakeProject | null> | FakeProject | null =>
    runMod(
      runPlugin(config).mods?.ios?.xcodeproj as Mod<FakeProject> | undefined,
      project,
      config,
    )

  it('creates the extension target with bundle id derived from cfg.ios.bundleIdentifier', async () => {
    const project = buildProjectMock()
    await runXcodeMod(project)

    expect(project.addTarget).toHaveBeenCalledWith(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      `com.example.app.${EXTENSION_TARGET_NAME}`,
    )
  })

  it('strips surrounding quotes from getBuildProperty fallback', async () => {
    const project = buildProjectMock({ bundleIdReturn: '"com.example.quoted"' })
    await runXcodeMod(project, baseConfig())

    expect(project.addTarget).toHaveBeenCalledWith(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      `com.example.quoted.${EXTENSION_TARGET_NAME}`,
    )
  })

  it('attaches the new PBXGroup to the project main group via getFirstProject', async () => {
    const project = buildProjectMock()
    await runXcodeMod(project)

    expect(project.getFirstProject).toHaveBeenCalled()
    expect(project.addToPbxGroup).toHaveBeenCalledWith(
      'group-uuid',
      'main-group-uuid',
    )
  })

  it('wires Sources, Frameworks, and Resources build phases', async () => {
    const project = buildProjectMock()
    await runXcodeMod(project)

    const phaseTypes = project.addBuildPhase.mock.calls.map((call) => call[1])
    expect(phaseTypes).toEqual([
      'PBXSourcesBuildPhase',
      'PBXFrameworksBuildPhase',
      'PBXResourcesBuildPhase',
    ])
  })

  it('sets MARKETING_VERSION and CURRENT_PROJECT_VERSION on the extension build settings', async () => {
    const project = buildProjectMock()
    await runXcodeMod(project)

    const configurations = project.pbxXCBuildConfigurationSection.mock.results[0]
      .value as Record<string, { buildSettings: Record<string, string> }>
    const buildSettings = configurations['config-uuid'].buildSettings
    expect(buildSettings.MARKETING_VERSION).toBe('1.0')
    expect(buildSettings.CURRENT_PROJECT_VERSION).toBe('1')
    expect(buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe('16.0')
    expect(buildSettings.GENERATE_INFOPLIST_FILE).toBe('NO')
    expect(buildSettings.SKIP_INSTALL).toBe('YES')
  })

  it('writes PRODUCT_BUNDLE_IDENTIFIER unquoted', async () => {
    const project = buildProjectMock()
    await runXcodeMod(project)

    const configurations = project.pbxXCBuildConfigurationSection.mock.results[0]
      .value as Record<string, { buildSettings: Record<string, string> }>
    const buildSettings = configurations['config-uuid'].buildSettings
    expect(buildSettings.PRODUCT_BUNDLE_IDENTIFIER).toBe(
      `com.example.app.${EXTENSION_TARGET_NAME}`,
    )
    expect(buildSettings.PRODUCT_BUNDLE_IDENTIFIER).not.toMatch(/^"|"$/)
  })

  it('is idempotent — second run with target already present makes no calls', async () => {
    const project = buildProjectMock({
      existingTargets: {
        'existing-uuid': { name: `"${EXTENSION_TARGET_NAME}"` },
      },
    })
    await runXcodeMod(project)

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
    await runXcodeMod(project)

    expect(project.addTarget).not.toHaveBeenCalled()
  })

  it('skips _comment keys when looking for the existing target', async () => {
    const project = buildProjectMock({
      existingTargets: {
        'some-uuid_comment': { name: EXTENSION_TARGET_NAME },
      },
    })
    await runXcodeMod(project)

    // The _comment key shouldn't trigger early-return.
    expect(project.addTarget).toHaveBeenCalled()
  })
})
