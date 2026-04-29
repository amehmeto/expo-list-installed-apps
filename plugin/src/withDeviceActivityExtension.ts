import {
  ConfigPlugin,
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
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
    const mainTargetName = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName: cfg.modRequest.projectName!,
    }).target.name as string

    const existing = project.pbxTargetByName(EXTENSION_TARGET_NAME)
    if (existing) {
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
    const resourceFiles: string[] = []
    const supportFiles = ['Info.plist', `${EXTENSION_TARGET_NAME}.entitlements`]

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
      resourceFiles,
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid,
    )

    const pbxGroup = project.addPbxGroup(
      [...sourceFiles, ...supportFiles],
      EXTENSION_TARGET_NAME,
      EXTENSION_TARGET_NAME,
    )

    const groups = project.hash.project.objects.PBXGroup
    Object.keys(groups).forEach((groupKey) => {
      if (
        groups[groupKey].name === undefined &&
        groups[groupKey].path === undefined
      ) {
        project.addToPbxGroup(pbxGroup.uuid, groupKey)
      }
    })

    const copyFilesBuildPhase = project.addBuildPhase(
      [`${EXTENSION_TARGET_NAME}.appex`],
      'PBXCopyFilesBuildPhase',
      'Embed App Extensions',
      project.getFirstTarget().uuid,
      'app_extension',
    )
    copyFilesBuildPhase.buildPhase.dstSubfolderSpec = 13

    const configurations = project.pbxXCBuildConfigurationSection()
    Object.keys(configurations).forEach((key) => {
      const buildSettings = configurations[key].buildSettings
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

    const mainTargetUuid = project.pbxTargetByName(mainTargetName).uuid
    project.addTargetDependency(mainTargetUuid, [target.uuid])

    return cfg
  })

export default withDeviceActivityExtension
