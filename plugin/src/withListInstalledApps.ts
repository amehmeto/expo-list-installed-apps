import {
  ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
} from '@expo/config-plugins'

import { DEFAULT_IOS_APP_SCHEMES } from './defaultCatalogSchemes'
import withDeviceActivityExtension from './withDeviceActivityExtension'

export type ListInstalledAppsPluginOptions = {
  urlSchemes?: string[]
  /**
   * When `true`, merges the bundled `DEFAULT_IOS_APP_CATALOG` schemes into
   * `LSApplicationQueriesSchemes`. Defaults to `false` to keep behavior
   * identical for consumers upgrading from 0.2.x.
   */
  useDefaultCatalog?: boolean
  ios?: {
    familyControls?: boolean
    appGroups?: string[]
    deviceActivityReport?: boolean
  }
}

const IOS_SCHEME_LIMIT = 50
const FAMILY_CONTROLS_ENTITLEMENT = 'com.apple.developer.family-controls'
const APP_GROUPS_ENTITLEMENT = 'com.apple.security.application-groups'
export const APP_GROUP_INFO_PLIST_KEY = 'EXListInstalledAppsAppGroup'

const withFamilyControlsEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    cfg.modResults[FAMILY_CONTROLS_ENTITLEMENT] = true
    return cfg
  })

const withAppGroupsEntitlement: ConfigPlugin<{ appGroups: string[] }> = (
  config,
  { appGroups },
) =>
  withEntitlementsPlist(config, (cfg) => {
    const existing = (cfg.modResults[APP_GROUPS_ENTITLEMENT] ?? []) as string[]
    const merged = Array.from(new Set([...existing, ...appGroups]))
    cfg.modResults[APP_GROUPS_ENTITLEMENT] = merged
    return cfg
  })

const withAppGroupInfoPlistKey: ConfigPlugin<{ appGroup: string }> = (
  config,
  { appGroup },
) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults[APP_GROUP_INFO_PLIST_KEY] = appGroup
    return cfg
  })

const withQueriesSchemes: ConfigPlugin<{ urlSchemes: string[] }> = (
  config,
  { urlSchemes },
) =>
  withInfoPlist(config, (cfg) => {
    const existing = (cfg.modResults.LSApplicationQueriesSchemes ??
      []) as string[]
    const merged = Array.from(
      new Set([...existing, ...urlSchemes].map((s) => s.toLowerCase())),
    )

    if (merged.length > IOS_SCHEME_LIMIT) {
      console.warn(
        `[expo-list-installed-apps] LSApplicationQueriesSchemes has ${merged.length} entries; iOS only honors the first ~${IOS_SCHEME_LIMIT}.`,
      )
    }

    cfg.modResults.LSApplicationQueriesSchemes = merged
    return cfg
  })

const withListInstalledApps: ConfigPlugin<ListInstalledAppsPluginOptions> = (
  config,
  { urlSchemes = [], useDefaultCatalog = false, ios = {} } = {},
) => {
  let next = config

  const baseSchemes = useDefaultCatalog ? [...DEFAULT_IOS_APP_SCHEMES] : []
  const mergedSchemes = [...baseSchemes, ...urlSchemes]

  if (mergedSchemes.length > 0) {
    next = withQueriesSchemes(next, { urlSchemes: mergedSchemes })
  }

  if (ios.familyControls === true) {
    next = withFamilyControlsEntitlement(next)
  }

  const appGroups = ios.appGroups ?? []
  if (appGroups.length > 0) {
    next = withAppGroupsEntitlement(next, { appGroups })
    next = withAppGroupInfoPlistKey(next, { appGroup: appGroups[0] })
  }

  if (ios.deviceActivityReport === true) {
    if (appGroups.length === 0) {
      throw new Error(
        '[expo-list-installed-apps] ios.deviceActivityReport requires ios.appGroups to be set (the extension and main app must share an App Group).',
      )
    }
    next = withDeviceActivityExtension(next, { appGroup: appGroups[0] })
  }

  return next
}

export default withListInstalledApps
