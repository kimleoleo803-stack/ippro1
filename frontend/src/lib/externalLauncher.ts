/**
 * Browser-side helpers for launching an external video player.
 *
 * Strategy:
 *  - Android browsers: open a proper intent:// URL with
 *      action=android.intent.action.VIEW
 *      type=video/*            (VLC's own docs recommend this — NOT the
 *                               narrow `application/x-mpegURL`; many
 *                               players' intent filters reject the
 *                               narrow MIME and the intent falls through.)
 *      package=<user's chosen app>
 *    Fired via `window.location.href` **on a user gesture** (tap).
 *    **We intentionally do NOT set S.browser_fallback_url**: when the
 *    chosen package isn't installed, Chrome auto-redirects to the
 *    Play Store listing for that package (exactly the UX we want).
 *    Setting the fallback to the raw stream URL causes Chrome to try
 *    to play the m3u8 itself, which IPTV servers reject with
 *    ERR_UNEXPECTED_PROXY_AUTH (407).
 *
 *  - iOS Safari: vlc-x-callback:// (VLC) — tapped on a user gesture so
 *    Safari prompts "Open this page in VLC?".
 *
 *  - Desktop browsers: no auto-navigation. The UI shows a visible
 *    `<a href="vlc://…">` button, a safe user-gesture navigation.
 */

// VLC's Android intent documentation (https://wiki.videolan.org/Android_Player_Intents/)
// explicitly recommends `video/*` for video of any kind. Most player apps
// (VLC, VidoPlay, MX, Just Player, YTV Player) declare `video/*` in their
// intent-filter but a subset do NOT declare `application/x-mpegURL`, so we
// use the broadest MIME that still resolves correctly.
const VIDEO_WILDCARD = "video/*";

const MIME_BY_EXT: Array<[RegExp, string]> = [
  [/\.m3u8(\?|$)/i, VIDEO_WILDCARD],
  [/\.ts(\?|$)/i, VIDEO_WILDCARD],
  [/\.mpd(\?|$)/i, VIDEO_WILDCARD],
  [/\.mp4(\?|$)/i, VIDEO_WILDCARD],
  [/\.mkv(\?|$)/i, VIDEO_WILDCARD],
  [/\.webm(\?|$)/i, VIDEO_WILDCARD],
  [/\.avi(\?|$)/i, VIDEO_WILDCARD],
  [/\.mov(\?|$)/i, VIDEO_WILDCARD],
];

/** Best-guess MIME type for a stream URL. Always falls back to `video/*`. */
export const guessMime = (url: string): string => {
  for (const [re, mime] of MIME_BY_EXT) {
    if (re.test(url)) return mime;
  }
  return VIDEO_WILDCARD;
};

export interface IntentOptions {
  /** Force a specific Android package, e.g. "com.vidoplay.player". */
  package?: string;
  /** MIME type override; auto-detected from URL when omitted. */
  mime?: string;
  /** Title extra read by MX Player / VLC. */
  title?: string;
  /** Custom User-Agent extra read by VLC / MX Player for the HTTP fetch. */
  userAgent?: string;
}

/**
 * Build a Chrome-compatible `intent://` URL for a video stream.
 * See https://developer.chrome.com/docs/android/intents
 */
export const buildAndroidIntentUrl = (
  streamUrl: string,
  opts: IntentOptions = {}
): string => {
  const m = streamUrl.match(/^(https?):\/\/(.+)$/i);
  if (!m) return streamUrl;
  const [, scheme, rest] = m;
  const mime = opts.mime ?? guessMime(streamUrl);

  const parts: string[] = [
    `scheme=${scheme}`,
    `action=android.intent.action.VIEW`,
    `type=${mime}`,
  ];
  if (opts.package) parts.push(`package=${opts.package}`);
  if (opts.title) parts.push(`S.title=${encodeURIComponent(opts.title)}`);
  if (opts.userAgent) {
    parts.push(`S.User-Agent=${encodeURIComponent(opts.userAgent)}`);
  }
  // NO S.browser_fallback_url — see module docstring above. If the chosen
  // app isn't installed, Chrome will auto-redirect to its Play Store
  // listing, which is exactly what we want.
  parts.push("end");

  return `intent://${rest}#Intent;${parts.join(";")}`;
};

/** VLC on desktop / Android — classic URL handler. */
export const buildVlcUrl = (streamUrl: string) => `vlc://${streamUrl}`;

/** VLC on iOS — x-callback URL scheme. */
export const buildVlcIosUrl = (streamUrl: string) =>
  `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;

/** Infuse on iOS — popular alternative. */
export const buildInfuseUrl = (streamUrl: string) =>
  `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`;

const isAndroidBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
};

const isIOSBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Fire the external-player launch. MUST be called from a user-gesture
 * (onClick handler) — otherwise Android/iOS will block the scheme.
 *
 * Returns `true` when a launch was actually attempted (caller shouldn't
 * need to do anything else). Returns `false` on desktop-like browsers
 * where a visible `<a>` button is the only safe option.
 */
export const tryLaunchExternalFromBrowser = (
  streamUrl: string,
  opts: IntentOptions = {}
): boolean => {
  if (isAndroidBrowser()) {
    try {
      const intentUrl = buildAndroidIntentUrl(streamUrl, opts);
      // `location.href` on a user gesture is the official Chrome path.
      // If the target package isn't installed, Chrome redirects to the
      // Play Store listing for that package.
      window.location.href = intentUrl;
      return true;
    } catch (e) {
      console.warn("[externalLauncher] intent launch failed", e);
      return false;
    }
  }

  if (isIOSBrowser()) {
    try {
      // Prefer VLC's x-callback URL; Safari will ask to open in VLC.
      window.location.href = buildVlcIosUrl(streamUrl);
      return true;
    } catch (e) {
      console.warn("[externalLauncher] iOS launch failed", e);
      return false;
    }
  }

  // Desktop: do nothing automatically — UI shows a visible button.
  return false;
};
