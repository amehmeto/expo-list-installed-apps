import { DEFAULT_IOS_APP_CATALOG } from '../../../src/iosAppCatalog'
import { DEFAULT_IOS_APP_SCHEMES } from '../defaultCatalogSchemes'
import withListInstalledApps, {
  ListInstalledAppsPluginOptions,
} from '../withListInstalledApps'

type Mod = (input: {
  modRequest: { nextMod: (config: unknown) => unknown }
  modResults: Record<string, unknown>
  [key: string]: unknown
}) =>
  | Promise<{ modResults: Record<string, unknown> }>
  | {
      modResults: Record<string, unknown>
    }

type ConfigWithMods = {
  mods?: {
    ios?: {
      infoPlist?: Mod
      entitlements?: Mod
      dangerous?: Mod
      xcodeproj?: Mod
    }
  }
}

const baseConfig = (): ConfigWithMods => ({})

const runPlugin = (
  options: ListInstalledAppsPluginOptions = {},
): ConfigWithMods =>
  withListInstalledApps(baseConfig() as never, options) as ConfigWithMods

const identityNext = <T>(c: T): T => c

const runMod = async (
  mod: Mod | undefined,
  initial: Record<string, unknown> = {},
): Promise<Record<string, unknown> | null> => {
  if (!mod) return null
  const result = await mod({
    modRequest: { nextMod: identityNext },
    modResults: { ...initial },
  })
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
      const result = runPlugin({
        urlSchemes: ['instagram', 'whatsapp'],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual([
        'instagram',
        'whatsapp',
      ])
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('merges with existing schemes and deduplicates', async () => {
      const result = runPlugin({
        urlSchemes: ['whatsapp', 'tiktok'],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod, {
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
      const result = runPlugin({
        urlSchemes: tooMany,
      })
      await runMod(result.mods?.ios?.infoPlist as Mod)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('LSApplicationQueriesSchemes has 51 entries'),
      )
      warn.mockRestore()
    })

    it('dedupes case-insensitively', async () => {
      const result = runPlugin({
        urlSchemes: ['Maps', 'maps', 'MAPS', 'music'],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual(['maps', 'music'])
    })

    it('lowercases existing schemes during merge dedupe', async () => {
      const result = runPlugin({
        urlSchemes: ['maps'],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod, {
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
      const result = runPlugin({
        urlSchemes: ['instagram'],
      })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('does not add the entitlement when familyControls is false', () => {
      const result = runPlugin({
        ios: { familyControls: false },
      })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('adds com.apple.developer.family-controls when enabled', async () => {
      const result = runPlugin({
        ios: { familyControls: true },
      })
      const entitlements = await runMod(result.mods?.ios?.entitlements as Mod)
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('coexists with urlSchemes', async () => {
      const result = runPlugin({
        urlSchemes: ['instagram'],
        ios: { familyControls: true },
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      const entitlements = await runMod(result.mods?.ios?.entitlements as Mod)
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual(['instagram'])
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('coexists with pre-existing entitlement keys', async () => {
      const result = runPlugin({
        ios: { familyControls: true },
      })
      const entitlements = await runMod(result.mods?.ios?.entitlements as Mod, {
        'aps-environment': 'development',
      })
      expect(entitlements?.['aps-environment']).toBe('development')
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })
  })

  describe('ios.appGroups', () => {
    it('writes the App Groups entitlement and Info.plist key when set', async () => {
      const result = runPlugin({
        ios: { appGroups: ['group.expo.modules.listinstalledapps.example'] },
      })
      const entitlements = await runMod(result.mods?.ios?.entitlements as Mod)
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      expect(entitlements?.['com.apple.security.application-groups']).toEqual([
        'group.expo.modules.listinstalledapps.example',
      ])
      expect(infoPlist?.EXListInstalledAppsAppGroup).toBe(
        'group.expo.modules.listinstalledapps.example',
      )
    })

    it('merges with pre-existing App Groups and dedupes', async () => {
      const result = runPlugin({
        ios: { appGroups: ['group.shared', 'group.new'] },
      })
      const entitlements = await runMod(result.mods?.ios?.entitlements as Mod, {
        'com.apple.security.application-groups': ['group.shared'],
      })
      expect(entitlements?.['com.apple.security.application-groups']).toEqual([
        'group.shared',
        'group.new',
      ])
    })

    it('is a no-op when appGroups is empty', () => {
      const result = runPlugin({
        ios: { appGroups: [] },
      })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
      expect(result.mods?.ios?.infoPlist).toBeUndefined()
    })
  })

  describe('ios.deviceActivityReport', () => {
    it('throws when enabled without an App Group', () => {
      expect(() =>
        runPlugin({
          ios: { deviceActivityReport: true },
        }),
      ).toThrow(/appGroups to be set/)
    })

    it('registers dangerous + xcodeproj mods when paired with an App Group', () => {
      const result = runPlugin({
        ios: {
          appGroups: ['group.expo.modules.listinstalledapps.example'],
          deviceActivityReport: true,
        },
      })
      expect(result.mods?.ios).toBeDefined()
      const ios = result.mods?.ios as Record<string, unknown>
      expect(ios.dangerous).toBeDefined()
      expect(ios.xcodeproj).toBeDefined()
    })
  })
})
