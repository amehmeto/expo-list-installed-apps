import type {
  ExportedConfig,
  ExportedConfigWithProps,
  Mod,
} from '@expo/config-plugins'
import type { ExpoConfig } from '@expo/config-types'

import withListInstalledApps, {
  ListInstalledAppsPluginOptions,
} from '../withListInstalledApps'

const baseConfig = (): ExpoConfig => ({
  name: 'test',
  slug: 'test',
})

// `withInfoPlist` / `withEntitlementsPlist` add `mods` at runtime, so the
// returned object is structurally an `ExportedConfig` even though
// `ConfigPlugin` declares its return as the narrower `ExpoConfig`.
// `ExportedConfig` only adds `mods?` (optional), so an `ExpoConfig` satisfies
// it structurally — TS accepts the widening without an assertion.
const runPlugin = (
  options?: ListInstalledAppsPluginOptions,
): ExportedConfig => withListInstalledApps(baseConfig(), options)

async function runMod<T>(
  mod: Mod<T> | undefined,
  initial: T,
): Promise<T | null> {
  if (!mod) return null
  const config: ExportedConfigWithProps<T> = {
    name: 'test',
    slug: 'test',
    modResults: initial,
    modRequest: {
      projectRoot: '/',
      platformProjectRoot: '/',
      modName: 'test',
      platform: 'ios',
      introspect: false,
    },
    modRawConfig: baseConfig(),
  }
  const result = await mod(config)
  return result.modResults
}

describe('withListInstalledApps', () => {
  it('is a no-op when no options are provided', () => {
    const result = runPlugin()
    expect(result.mods?.ios?.infoPlist).toBeUndefined()
    expect(result.mods?.ios?.entitlements).toBeUndefined()
  })

  describe('urlSchemes', () => {
    it('writes LSApplicationQueriesSchemes when schemes are provided', async () => {
      const result = runPlugin({ urlSchemes: ['instagram', 'whatsapp'] })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist, {})
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual([
        'instagram',
        'whatsapp',
      ])
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('merges with existing schemes and deduplicates', async () => {
      const result = runPlugin({ urlSchemes: ['whatsapp', 'tiktok'] })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist, {
        LSApplicationQueriesSchemes: ['instagram', 'whatsapp'],
      })
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual([
        'instagram',
        'whatsapp',
        'tiktok',
      ])
    })

    it('warns when scheme count exceeds the iOS limit', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const tooMany = Array.from({ length: 51 }, (_, i) => `app${i}`)
      const result = runPlugin({ urlSchemes: tooMany })
      await runMod(result.mods?.ios?.infoPlist, {})
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('LSApplicationQueriesSchemes has 51 entries'),
      )
      warn.mockRestore()
    })

    it('dedupes case-insensitively', async () => {
      const result = runPlugin({ urlSchemes: ['Maps', 'maps', 'MAPS', 'music'] })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist, {})
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual(['maps', 'music'])
    })

    it('lowercases existing schemes during merge dedupe', async () => {
      const result = runPlugin({ urlSchemes: ['maps'] })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist, {
        LSApplicationQueriesSchemes: ['Maps', 'instagram'],
      })
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual([
        'maps',
        'instagram',
      ])
    })
  })

  describe('ios.familyControls', () => {
    it('does not add the entitlement when familyControls is omitted', () => {
      const result = runPlugin({ urlSchemes: ['instagram'] })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('does not add the entitlement when familyControls is false', () => {
      const result = runPlugin({ ios: { familyControls: false } })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('adds com.apple.developer.family-controls when enabled', async () => {
      const result = runPlugin({ ios: { familyControls: true } })
      const entitlements = await runMod(result.mods?.ios?.entitlements, {})
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('coexists with urlSchemes', async () => {
      const result = runPlugin({
        urlSchemes: ['instagram'],
        ios: { familyControls: true },
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist, {})
      const entitlements = await runMod(result.mods?.ios?.entitlements, {})
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual(['instagram'])
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('coexists with pre-existing entitlement keys', async () => {
      const result = runPlugin({ ios: { familyControls: true } })
      const entitlements = await runMod(result.mods?.ios?.entitlements, {
        'aps-environment': 'development',
      })
      expect(entitlements?.['aps-environment']).toBe('development')
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })
  })
})
