/**
 * Browser-side helpers for launching an external video player.
 *
 * Strategy:
 *  - Android browsers: use a proper intent:// URL with
 *      action=android.intent.action.VIEW
 *      type=<correct MIME>
 *      package=<user's chosen app>
 *      S.browser_fallback_url=<original stream URL>
 *    Fired via `window.location.href` **on a user gesture** (click / tap).
 *    If the chosen app isn't installed, Chrome will follow
 *    `browser_fallback_url` instead of erroring out.
 *
 *  - iOS Safari: vlc-x-callback:// (VLC) or infuse:// scheme — tapped on a
 *    user gesture so Safari will prompt "Open this page in …?".
 *
 *  - Desktop browsers: we never auto-navigate. The user taps a visible
 *    `<a href="vlc://…">` button, which is a safe user-gesture navigation.
 */

const MIME_BY_EXT: Array<[RegExp, string]> = [
  [/\.m3u8(\?|$)/i, "application/x-mpegURL"],
  [/\.ts(\?|$)/i, "video/mp2t"],
  [/\.mpd(\?|$)/i, "application/dash+xml"],
  [/\.mp4(\?|$)/i, "video/mp4"],
  [/\.mkv(\?|$)/i, "video/x-matroska"],
  [/\.webm(\?|$)/i, "video/webm"],
  [/\.avi(\?|$)/i, "video/x-msvideo"],
  [/\.mov(\?|$)/i, "video/quicktime"],
];

/** Best-guess MIME type for a stream URL. Falls back to `video/*`. */
export const guessMime = (url: string): string => {
  for (const [re, mime] of MIME_BY_EXT) {
    if (re.test(url)) return mime;
  }
  return "video/*";
};

export interface IntentOptions {
  /** Force a specific Android package, e.g. "com.vidoplay.player". */
  package?: string;
  /** MIME type override; auto-detected from URL when omitted. */
  mime?: string;
  /** Title extra some players read (MX Player, VLC). */
  title?: string;
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
  const fallback = encodeURIComponent(streamUrl);

  const parts: string[] = [
    `scheme=${scheme}`,
    `action=android.intent.action.VIEW`,
    `type=${mime}`,
  ];
  if (opts.package) parts.push(`package=${opts.package}`);
  if (opts.title) parts.push(`S.title=${encodeURIComponent(opts.title)}`);
  // MX Player / VLC read the User-Agent from this extra.
  parts.push(`S.User-Agent=${encodeURIComponent("ExoPlayer")}`);
  parts.push(`S.browser_fallback_url=${fallback}`);
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
      // If the target app isn't installed, Chrome follows the fallback URL.
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
