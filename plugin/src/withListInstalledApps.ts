import {
  ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
} from '@expo/config-plugins'

export type ListInstalledAppsPluginOptions = {
  urlSchemes?: string[]
  ios?: {
    familyControls?: boolean
  }
}

// Apple's documented cap on LSApplicationQueriesSchemes. Mirrored at runtime by
// `getPlatformCapabilities().urlSchemeLimit` in
// ios/ExpoListInstalledAppsModule.swift — keep both values in sync.
const IOS_SCHEME_LIMIT = 50
const FAMILY_CONTROLS_ENTITLEMENT = 'com.apple.developer.family-controls'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const withFamilyControlsEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    cfg.modResults[FAMILY_CONTROLS_ENTITLEMENT] = true
    return cfg
  })

const withQueriesSchemes: ConfigPlugin<{ urlSchemes: string[] }> = (
  config,
  { urlSchemes },
) =>
  withInfoPlist(config, (cfg) => {
    const raw = cfg.modResults.LSApplicationQueriesSchemes
    const existing = isStringArray(raw) ? raw : []
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
  { urlSchemes = [], ios = {} } = {},
) => {
  let next = config

  if (urlSchemes.length > 0) {
    next = withQueriesSchemes(next, { urlSchemes })
  }

  if (ios.familyControls === true) {
    next = withFamilyControlsEntitlement(next)
  }

  return next
}

export default withListInstalledApps
