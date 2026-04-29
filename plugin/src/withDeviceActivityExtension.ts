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

    const mainBundleId =
      cfg.ios?.bundleIdentifier ??
      project.getBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', 'Release')
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
    attachGroupToProjectRoot(project, pbxGroup.uuid)

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
    const name = target?.name?.replace(/"/g, '')
    if (name === EXTENSION_TARGET_NAME) {
      return true
    }
  }
  return false
}

const attachGroupToProjectRoot = (
  project: {
    hash: { project: { objects: Record<string, Record<string, unknown>> } }
    addToPbxGroup: (childUuid: string, parentUuid: string) => void
  },
  childUuid: string,
): void => {
  const groups = project.hash.project.objects.PBXGroup ?? {}
  for (const groupKey of Object.keys(groups)) {
    if (groupKey.endsWith('_comment')) continue
    const group = groups[groupKey] as
      | { name?: string; path?: string }
      | undefined
    if (group && group.name === undefined && group.path === undefined) {
      project.addToPbxGroup(childUuid, groupKey)
      return
    }
  }
}

export default withDeviceActivityExtension
