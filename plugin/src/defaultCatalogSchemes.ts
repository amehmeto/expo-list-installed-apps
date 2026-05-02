/**
 * URL schemes from `DEFAULT_IOS_APP_CATALOG`, duplicated here because the
 * plugin's TypeScript `rootDir` is `plugin/src` and can't import from `src/`.
 *
 * Kept in sync with `src/iosAppCatalog.ts` via the `'plugin scheme list stays
 * in sync with the source-of-truth catalog'` test inside the `useDefaultCatalog`
 * describe block in `plugin/src/__tests__/withListInstalledApps.test.ts`. Add
 * or remove entries on both sides and the sync test will pass.
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
