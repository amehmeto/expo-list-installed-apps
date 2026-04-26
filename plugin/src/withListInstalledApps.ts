import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

export type ListInstalledAppsPluginOptions = {
  urlSchemes?: string[]
}

const IOS_SCHEME_LIMIT = 50

const withListInstalledApps: ConfigPlugin<ListInstalledAppsPluginOptions> = (
  config,
  { urlSchemes = [] } = {},
) => {
  if (urlSchemes.length === 0) return config

  return withInfoPlist(config, (cfg) => {
    const existing = (cfg.modResults.LSApplicationQueriesSchemes ??
      []) as string[]
    const merged = Array.from(new Set([...existing, ...urlSchemes]))

    if (merged.length > IOS_SCHEME_LIMIT) {
      console.warn(
        `[expo-list-installed-apps] LSApplicationQueriesSchemes has ${merged.length} entries; iOS only honors the first ~${IOS_SCHEME_LIMIT}.`,
      )
    }

    cfg.modResults.LSApplicationQueriesSchemes = merged
    return cfg
  })
}

export default withListInstalledApps
