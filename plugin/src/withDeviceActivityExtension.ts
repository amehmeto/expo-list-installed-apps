import {
  ConfigPlugin,
  withDangerousMod,
  withXcodeProject,
} from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

import { templateFiles, EXTENSION_TARGET_NAME } from './deviceActivityTemplates'

type Options = { appGroup: string }

const withDeviceActivityExtension: ConfigPlugin<Options> = (
  config,
  { appGroup },
) => {
  let next = withExtensionFiles(config, { appGroup })
  next = withExtensionTarget(next, { appGroup })
  return next
}

const withExtensionFiles: ConfigPlugin<Options> = (config, { appGroup }) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot
      const targetDir = path.join(iosRoot, EXTENSION_TARGET_NAME)
      fs.mkdirSync(targetDir, { recursive: true })

      for (const [name, contents] of Object.entries(templateFiles(appGroup))) {
        fs.writeFileSync(path.join(targetDir, name), contents)
      }
      return cfg
    },
  ])

const withExtensionTarget: ConfigPlugin<Options> = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults

    if (extensionTargetExists(project)) {
      return cfg
    }

    // `getBuildProperty` returns the raw pbxproj string, which may include
    // surrounding double quotes (e.g. `"com.foo.bar"`). Strip them before
    // composing the extension bundle id so we don't end up with
    // `"com.foo".DeviceActivityReportExtension`.
    const rawBundleId =
      cfg.ios?.bundleIdentifier ??
      project.getBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', 'Release')
    const mainBundleId = stripQuotes(rawBundleId)
    const extensionBundleId = `${mainBundleId}.${EXTENSION_TARGET_NAME}`

    const sourceFiles = [
      'DeviceActivityReportExtension.swift',
      'TotalActivityReport.swift',
    ]
    const supportFiles = ['Info.plist', `${EXTENSION_TARGET_NAME}.entitlements`]

    // `addTarget('app_extension', ...)` creates the native target AND the
    // main app's "Copy Files" Embed-App-Extensions phase with the .appex
    // already wired in — do NOT add another PBXCopyFilesBuildPhase ourselves
    // or xcodebuild reports "Unexpected duplicate tasks".
    const target = project.addTarget(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      extensionBundleId,
    )

    project.addBuildPhase(
      sourceFiles,
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid,
    )
    project.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      target.uuid,
    )
    project.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid,
    )

    const pbxGroup = project.addPbxGroup(
      [...sourceFiles, ...supportFiles],
      EXTENSION_TARGET_NAME,
      EXTENSION_TARGET_NAME,
    )
    const mainGroupUuid = project.getFirstProject().firstProject.mainGroup
    project.addToPbxGroup(pbxGroup.uuid, mainGroupUuid)

    const configurations = project.pbxXCBuildConfigurationSection()
    Object.keys(configurations).forEach((key) => {
      const buildSettings = configurations[key]?.buildSettings
      if (
        buildSettings &&
        buildSettings.PRODUCT_NAME === `"${EXTENSION_TARGET_NAME}"`
      ) {
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0'
        buildSettings.SWIFT_VERSION = '5.9'
        buildSettings.CODE_SIGN_STYLE = 'Automatic'
        buildSettings.INFOPLIST_FILE = `"${EXTENSION_TARGET_NAME}/Info.plist"`
        buildSettings.CODE_SIGN_ENTITLEMENTS = `"${EXTENSION_TARGET_NAME}/${EXTENSION_TARGET_NAME}.entitlements"`
        buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`
        buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"'
        buildSettings.SKIP_INSTALL = 'YES'
        buildSettings.GENERATE_INFOPLIST_FILE = 'NO'
        // Match the Info.plist template's CFBundleShortVersionString / CFBundleVersion
        // so Xcode archive validation doesn't warn about extension/host version mismatch.
        buildSettings.MARKETING_VERSION = '1.0'
        buildSettings.CURRENT_PROJECT_VERSION = '1'
      }
    })

    return cfg
  })

const extensionTargetExists = (project: {
  hash: { project: { objects: Record<string, Record<string, unknown>> } }
}): boolean => {
  const targets = project.hash.project.objects.PBXNativeTarget ?? {}
  for (const key of Object.keys(targets)) {
    if (key.endsWith('_comment')) continue
    const target = targets[key] as { name?: string } | undefined
    const name = stripQuotes(target?.name)
    if (name === EXTENSION_TARGET_NAME) {
      return true
    }
  }
  return false
}

const stripQuotes = (value: string | undefined | null): string =>
  (value ?? '').replace(/^"|"$/g, '')

export default withDeviceActivityExtension
export { stripQuotes }
