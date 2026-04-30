import { IosKnownApp } from './ExpoListInstalledApps.types'

/**
 * Curated list of popular iOS apps and their URL schemes, suitable as a
 * starting point for `canOpenApp(scheme)` lookups. Pair with the config
 * plugin's `useDefaultCatalog: true` option to declare every scheme in
 * `LSApplicationQueriesSchemes` automatically.
 *
 * Schemes were sourced from each vendor's public documentation or App Store
 * listing. `bundleId` is treated as a stable identifier for downstream
 * persistence — entries should not be renamed once published; add new ones
 * instead. iOS caps `LSApplicationQueriesSchemes` at ~50, so this list
 * intentionally stays well below that to leave room for consumer-specific
 * additions.
 *
 * This list is curated, not exhaustive — consumers can pass extra entries via
 * the plugin's `urlSchemes` option.
 */
export const DEFAULT_IOS_APP_CATALOG: readonly IosKnownApp[] = [
  // Social
  {
    appName: 'Instagram',
    scheme: 'instagram',
    bundleId: 'com.burbn.instagram',
  },
  {
    appName: 'TikTok',
    scheme: 'tiktok',
    bundleId: 'com.zhiliaoapp.musically',
  },
  {
    appName: 'YouTube',
    scheme: 'youtube',
    bundleId: 'com.google.ios.youtube',
  },
  {
    appName: 'X (Twitter)',
    scheme: 'twitter',
    bundleId: 'com.atebits.Tweetie2',
  },
  {
    appName: 'Snapchat',
    scheme: 'snapchat',
    bundleId: 'com.toyopagroup.picaboo',
  },
  {
    appName: 'Facebook',
    scheme: 'fb',
    bundleId: 'com.facebook.Facebook',
  },
  {
    appName: 'Messenger',
    scheme: 'fb-messenger',
    bundleId: 'com.facebook.Messenger',
  },
  {
    appName: 'Threads',
    scheme: 'barcelona',
    bundleId: 'com.burbn.barcelona',
  },
  {
    appName: 'Reddit',
    scheme: 'reddit',
    bundleId: 'com.reddit.Reddit',
  },
  {
    appName: 'Discord',
    scheme: 'discord',
    bundleId: 'com.hammerandchisel.discord',
  },
  {
    appName: 'Telegram',
    scheme: 'tg',
    bundleId: 'ph.telegra.Telegraph',
  },
  {
    appName: 'WhatsApp',
    scheme: 'whatsapp',
    bundleId: 'net.whatsapp.WhatsApp',
  },
  {
    appName: 'Signal',
    scheme: 'sgnl',
    bundleId: 'org.whispersystems.signal',
  },
  {
    appName: 'BeReal',
    scheme: 'bereal',
    bundleId: 'AlexisBarreyat.BeReal',
  },
  {
    appName: 'LinkedIn',
    scheme: 'linkedin',
    bundleId: 'com.linkedin.LinkedIn',
  },
  {
    appName: 'Pinterest',
    scheme: 'pinterest',
    bundleId: 'pinterest',
  },
  {
    appName: 'Tumblr',
    scheme: 'tumblr',
    bundleId: 'com.tumblr.tumblr',
  },

  // Streaming / media
  {
    appName: 'Spotify',
    scheme: 'spotify',
    bundleId: 'com.spotify.client',
  },
  {
    appName: 'SoundCloud',
    scheme: 'soundcloud',
    bundleId: 'com.soundcloud.TouchApp',
  },
  {
    appName: 'Netflix',
    scheme: 'nflx',
    bundleId: 'com.netflix.Netflix',
  },
  {
    appName: 'Prime Video',
    scheme: 'primevideo',
    bundleId: 'com.amazon.aiv.AIVApp',
  },
  {
    appName: 'Twitch',
    scheme: 'twitch',
    bundleId: 'tv.twitch',
  },
  {
    appName: 'Hulu',
    scheme: 'hulu',
    bundleId: 'com.hulu.plus',
  },
  {
    appName: 'Deezer',
    scheme: 'deezer',
    bundleId: 'com.deezer.Deezer',
  },

  // Productivity / other
  {
    appName: 'Gmail',
    scheme: 'googlegmail',
    bundleId: 'com.google.Gmail',
  },
  {
    appName: 'Google Maps',
    scheme: 'comgooglemaps',
    bundleId: 'com.google.Maps',
  },
  {
    appName: 'Slack',
    scheme: 'slack',
    bundleId: 'com.tinyspeck.chatlyio',
  },
  {
    appName: 'Notion',
    scheme: 'notion',
    bundleId: 'notion.id',
  },
  {
    appName: 'Zoom',
    scheme: 'zoomus',
    bundleId: 'us.zoom.videomeetings',
  },
  {
    appName: 'Uber',
    scheme: 'uber',
    bundleId: 'com.ubercab.UberClient',
  },
]

/**
 * Bare URL schemes derived from `DEFAULT_IOS_APP_CATALOG`, in the same order.
 * Pass to the config plugin's `urlSchemes` option, or import directly when
 * probing with `canOpenApp`.
 */
export const DEFAULT_IOS_APP_SCHEMES: readonly string[] =
  DEFAULT_IOS_APP_CATALOG.map((app) => app.scheme)
