import { DEFAULT_IOS_APP_CATALOG } from '../../../src/iosAppCatalog'
import { DEFAULT_IOS_APP_SCHEMES } from '../defaultCatalogSchemes'
import withListInstalledApps from '../withListInstalledApps'

type Mod = (input: {
  modRequest: { nextMod: (config: unknown) => unknown }
  modResults: Record<string, unknown>
  [key: string]: unknown
}) => Promise<{ modResults: Record<string, unknown> }> | {
  modResults: Record<string, unknown>
}

type ConfigWithMods = {
  mods?: {
    ios?: {
      infoPlist?: Mod
      entitlements?: Mod
    }
  }
}

const baseConfig = (): ConfigWithMods => ({})

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
    const result = withListInstalledApps(baseConfig() as never)
    expect(result.mods?.ios?.infoPlist).toBeUndefined()
    expect(result.mods?.ios?.entitlements).toBeUndefined()
  })

  describe('urlSchemes', () => {
    it('writes LSApplicationQueriesSchemes when schemes are provided', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
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
      const result = withListInstalledApps(baseConfig() as never, {
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
      const result = withListInstalledApps(baseConfig() as never, {
        urlSchemes: tooMany,
      })
      await runMod(result.mods?.ios?.infoPlist as Mod)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('LSApplicationQueriesSchemes has 51 entries'),
      )
      warn.mockRestore()
    })

    it('dedupes case-insensitively', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        urlSchemes: ['Maps', 'maps', 'MAPS', 'music'],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual(['maps', 'music'])
    })

    it('lowercases existing schemes during merge dedupe', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
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

  describe('useDefaultCatalog', () => {
    it('does not write LSApplicationQueriesSchemes when omitted and no urlSchemes', () => {
      const result = withListInstalledApps(baseConfig() as never, {})
      expect(result.mods?.ios?.infoPlist).toBeUndefined()
    })

    it('does not write LSApplicationQueriesSchemes when explicitly false', () => {
      const result = withListInstalledApps(baseConfig() as never, {
        useDefaultCatalog: false,
      })
      expect(result.mods?.ios?.infoPlist).toBeUndefined()
    })

    it('merges every default catalog scheme when enabled', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        useDefaultCatalog: true,
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      const schemes = infoPlist?.LSApplicationQueriesSchemes as string[]
      for (const scheme of DEFAULT_IOS_APP_SCHEMES) {
        expect(schemes).toContain(scheme)
      }
    })

    it('combines defaults with user-supplied urlSchemes', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        useDefaultCatalog: true,
        urlSchemes: ['customapp', 'anotherapp'],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      const schemes = infoPlist?.LSApplicationQueriesSchemes as string[]
      expect(schemes).toContain('customapp')
      expect(schemes).toContain('anotherapp')
      expect(schemes).toContain(DEFAULT_IOS_APP_SCHEMES[0])
    })

    it('dedupes when user-supplied scheme overlaps a default', async () => {
      const overlap = DEFAULT_IOS_APP_SCHEMES[0]
      const result = withListInstalledApps(baseConfig() as never, {
        useDefaultCatalog: true,
        urlSchemes: [overlap.toUpperCase()],
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      const schemes = infoPlist?.LSApplicationQueriesSchemes as string[]
      const occurrences = schemes.filter((s) => s === overlap).length
      expect(occurrences).toBe(1)
    })

    it('coexists with familyControls', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        useDefaultCatalog: true,
        ios: { familyControls: true },
      })
      expect(result.mods?.ios?.infoPlist).toBeDefined()
      expect(result.mods?.ios?.entitlements).toBeDefined()
      const entitlements = await runMod(
        result.mods?.ios?.entitlements as Mod,
      )
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('plugin-side scheme list mirrors the source-of-truth catalog', () => {
      const sourceSchemes = DEFAULT_IOS_APP_CATALOG.map((a) => a.scheme)
      expect([...DEFAULT_IOS_APP_SCHEMES]).toEqual(sourceSchemes)
    })
  })

  describe('ios.familyControls', () => {
    it('does not add the entitlement when familyControls is omitted', () => {
      const result = withListInstalledApps(baseConfig() as never, {
        urlSchemes: ['instagram'],
      })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('does not add the entitlement when familyControls is false', () => {
      const result = withListInstalledApps(baseConfig() as never, {
        ios: { familyControls: false },
      })
      expect(result.mods?.ios?.entitlements).toBeUndefined()
    })

    it('adds com.apple.developer.family-controls when enabled', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        ios: { familyControls: true },
      })
      const entitlements = await runMod(
        result.mods?.ios?.entitlements as Mod,
      )
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('coexists with urlSchemes', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        urlSchemes: ['instagram'],
        ios: { familyControls: true },
      })
      const infoPlist = await runMod(result.mods?.ios?.infoPlist as Mod)
      const entitlements = await runMod(
        result.mods?.ios?.entitlements as Mod,
      )
      expect(infoPlist?.LSApplicationQueriesSchemes).toEqual(['instagram'])
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })

    it('coexists with pre-existing entitlement keys', async () => {
      const result = withListInstalledApps(baseConfig() as never, {
        ios: { familyControls: true },
      })
      const entitlements = await runMod(
        result.mods?.ios?.entitlements as Mod,
        { 'aps-environment': 'development' },
      )
      expect(entitlements?.['aps-environment']).toBe('development')
      expect(entitlements?.['com.apple.developer.family-controls']).toBe(true)
    })
  })
})
