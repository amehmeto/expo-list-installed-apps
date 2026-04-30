/**
 * URL schemes from `DEFAULT_IOS_APP_CATALOG`, duplicated here so the config
 * plugin can read them without crossing the plugin's TypeScript `rootDir`.
 *
 * Kept in sync with `src/iosAppCatalog.ts` via the test
 * `defaultCatalogSchemes.test.ts` — if you add or remove an entry there,
 * mirror it here and the sync test will pass.
 */
export const DEFAULT_IOS_APP_SCHEMES: readonly string[] = [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'snapchat',
  'fb',
  'fb-messenger',
  'barcelona',
  'reddit',
  'discord',
  'tg',
  'whatsapp',
  'sgnl',
  'bereal',
  'linkedin',
  'pinterest',
  'tumblr',
  'spotify',
  'soundcloud',
  'nflx',
  'primevideo',
  'twitch',
  'hulu',
  'deezer',
  'googlegmail',
  'comgooglemaps',
  'slack',
  'notion',
  'zoomus',
  'uber',
]
