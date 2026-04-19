/**
 * Browser-side helpers for launching an external video player.
 *
 * We NEVER navigate the current page. Specifically:
 *   - `window.location.href = "vlc://..."` is forbidden (causes reload on
 *     desktop browsers that don't have a handler).
 *   - `intent://` is fired via a sandboxed, hidden iframe ONLY on real
 *     Android browsers, where the system will either open the player or
 *     do nothing (no navigation side-effects).
 *   - On desktop / iOS Safari, we do NOTHING automatically. The user has
 *     to tap the in-page "Open in <App>" button, which opens via
 *     `a[href=vlc://...]` — a user-gesture navigation that browsers
 *     treat safely.
 */

export const buildAndroidIntentUrl = (streamUrl: string): string => {
  const m = streamUrl.match(/^(https?):\/\/(.+)$/i);
  if (!m) return streamUrl;
  const [, scheme, rest] = m;
  const fallback = encodeURIComponent(streamUrl);
  return `intent://${rest}#Intent;scheme=${scheme};type=application/x-mpegURL;S.browser_fallback_url=${fallback};end`;
};

export const buildVlcUrl = (streamUrl: string) => `vlc://${streamUrl}`;

const isAndroidBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
};

/**
 * Silently attempt to open the stream in an external player from the
 * browser. Succeeds only on Android Chrome via `intent://`; on every
 * other browser it deliberately does nothing, so the page stays stable.
 */
export const tryLaunchExternalFromBrowser = (streamUrl: string): boolean => {
  if (!isAndroidBrowser()) return false;
  try {
    const f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups");
    f.style.position = "fixed";
    f.style.top = "-9999px";
    f.style.width = "0";
    f.style.height = "0";
    f.style.border = "0";
    f.src = buildAndroidIntentUrl(streamUrl);
    document.body.appendChild(f);
    window.setTimeout(() => {
      try {
        document.body.removeChild(f);
      } catch {
        /* ignore */
      }
    }, 1200);
    return true;
  } catch {
    return false;
  }
};
