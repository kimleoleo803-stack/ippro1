/**
 * External video player catalog + user preference.
 *
 * The user picks which Android / iOS app handles "Open in external
 * player". VidoPlay is the default because it's the recommended app
 * for this build.
 */

export interface ExternalApp {
  id: string;
  label: string;
  /** Android package name. undefined → iOS-only or "system chooser". */
  androidPackage?: string;
  /** Google Play Store URL — shown in Account so users can install it. */
  playStoreUrl?: string;
  /** iOS URL scheme (optional). */
  iosScheme?: string;
  /** Short tagline in the Account UI. */
  hint?: string;
}

/** List of supported external players, in default-preference order. */
export const EXTERNAL_APPS: ExternalApp[] = [
  {
    id: "vidoplay",
    label: "VidoPlay",
    androidPackage: "com.vidoplay.player",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.vidoplay.player&hl=en",
    hint: "Recommended · plays m3u / HLS / TS",
  },
  {
    id: "vlc",
    label: "VLC Media Player",
    androidPackage: "org.videolan.vlc",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=org.videolan.vlc",
    iosScheme: "vlc-x-callback",
    hint: "Universal player, all codecs",
  },
  {
    id: "chooser",
    label: "Ask every time (system chooser)",
    hint: "Android will show 'Open with…' each time",
  },
];

const KEY = "livetv.external_app";
const DEFAULT_ID = "vidoplay";

export const getExternalAppId = (): string => {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_ID;
};

export const getExternalApp = (): ExternalApp => {
  const id = getExternalAppId();
  return EXTERNAL_APPS.find((a) => a.id === id) ?? EXTERNAL_APPS[0];
};

export const setExternalAppId = (id: string): void => {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
};
