/**
 * Browser-side helpers for launching an external video player.
 *
 * This module targets three environments:
 *   • Android Chrome / Samsung Internet / Firefox / any Android browser
 *   • Median.co (GoNative) & other WebView-wrapper APKs that reuse the
 *     same Android System WebView — these forward `intent://` URLs to
 *     the OS via a regex-based "internal vs external" rule.
 *   • iOS Safari
 *   • Desktop browsers (fallback: render a visible `<a href="vlc://…">`).
 *
 * Key design decisions (earned the hard way):
 *
 *   1. MIME on the Android intent is `video/*` — VLC's own docs
 *      recommend this, and every major player (VLC, VidoPlay, MX, Just
 *      Player, YTV Player) declares `video/*` in its intent-filter.
 *      Using the narrower `application/x-mpegURL` caused
 *      `resolveActivity()` to return null on live streams.
 *
 *   2. **No `S.browser_fallback_url`.** When the chosen package isn't
 *      installed, Chrome / the WebView will auto-redirect to the
 *      Play Store listing for that package. Setting the fallback to
 *      the raw stream URL made Chrome try to play the m3u8 itself,
 *      which IPTV servers reject with a 407 Proxy Auth Required
 *      (`ERR_UNEXPECTED_PROXY_AUTH` in Chrome/WebView).
 *
 *   3. **Visibility-based "not installed" detection.** After firing the
 *      intent, if the document doesn't go `hidden` within ~1.6s, the
 *      intent didn't launch any app. We then call
 *      `opts.onNotInstalled(pkg)` so the UI can show an Install action.
 */

// VLC's Android intent documentation explicitly recommends `video/*`:
// https://wiki.videolan.org/Android_Player_Intents/
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
  // NO S.browser_fallback_url — see module docstring above.
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

/** Android Play Store deep link — works inside WebViews, Chrome, etc. */
export const buildMarketUrl = (pkg: string) =>
  `market://details?id=${encodeURIComponent(pkg)}`;

/** Web fallback for `market://` (e.g. Play Store not installed). */
export const buildPlayStoreWebUrl = (pkg: string) =>
  `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;

const isAndroidBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
};

const isIOSBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * True when we're running inside a Median.co (GoNative) WebView wrapper.
 * These reuse the Android System WebView and append `median` to the UA.
 * Handy when we want to prefer `market://` fallbacks over `https://play.…`
 * because the Median URL-classification rules send `market://` externally.
 */
export const isMedianWebView = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /\bmedian\b/i.test(navigator.userAgent);
};

export interface LaunchOptions extends IntentOptions {
  /**
   * Called if we detect the intent didn't launch an app (the document
   * never went `hidden` within the grace window).  Receives the package
   * the caller forced (if any) so the UI can offer an Install action.
   */
  onNotInstalled?: (pkg: string | undefined) => void;
}

/**
 * Fire the external-player launch. MUST be called from a user-gesture
 * (onClick handler) — otherwise Android/iOS will block the scheme.
 *
 * Returns `true` when a launch was attempted (caller shouldn't need to
 * do anything else immediately). Returns `false` on desktop-like
 * browsers where a visible `<a>` button is the only safe option.
 */
export const tryLaunchExternalFromBrowser = (
  streamUrl: string,
  opts: LaunchOptions = {}
): boolean => {
  if (isAndroidBrowser()) {
    try {
      const intentUrl = buildAndroidIntentUrl(streamUrl, opts);

      // --- Visibility-based "did the intent actually launch?" detection ---
      let wentHidden = false;
      const onVis = () => {
        if (typeof document !== "undefined" && document.hidden) {
          wentHidden = true;
          document.removeEventListener("visibilitychange", onVis);
        }
      };
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVis);
      }

      // If the app doesn't launch within ~1.6s the page will still be
      // visible → treat as "not installed" and fire the callback so the
      // UI can show an "Install <App>" toast action.
      window.setTimeout(() => {
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", onVis);
          if (!wentHidden && !document.hidden && opts.onNotInstalled) {
            opts.onNotInstalled(opts.package);
          }
        }
      }, 1600);

      // Navigate to the intent URL on the user gesture. Chrome / the
      // Median WebView hand this off to the OS.
      window.location.href = intentUrl;
      return true;
    } catch (e) {
      console.warn("[externalLauncher] intent launch failed", e);
      return false;
    }
  }

  if (isIOSBrowser()) {
    try {
      window.location.href = buildVlcIosUrl(streamUrl);
      return true;
    } catch (e) {
      console.warn("[externalLauncher] iOS launch failed", e);
      return false;
    }
  }

  // Desktop: never auto-navigate — UI shows a visible button.
  return false;
};

/**
 * Open the Play Store listing for the given package. Tries `market://`
 * first (instant open in the Play Store app), falls back to the web URL
 * which every Android browser/WebView can handle.
 */
export const openPlayStore = (pkg: string): void => {
  try {
    const marketUrl = buildMarketUrl(pkg);
    // Small delay so the toast UI finishes rendering before we navigate.
    window.setTimeout(() => {
      window.location.href = marketUrl;
      // Fallback: if `market://` isn't handled (rare on non-GMS phones),
      // swap to the web URL after a short grace.
      window.setTimeout(() => {
        if (typeof document !== "undefined" && !document.hidden) {
          window.location.href = buildPlayStoreWebUrl(pkg);
        }
      }, 1200);
    }, 50);
  } catch (e) {
    console.warn("[externalLauncher] openPlayStore failed", e);
    window.location.href = buildPlayStoreWebUrl(pkg);
  }
};
