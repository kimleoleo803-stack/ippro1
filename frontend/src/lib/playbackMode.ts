/**
 * Playback mode — where the user wants streams to open.
 *
 *   internal → the in-app player (ExoPlayer on Android, AVPlayer on iOS,
 *              HLS.js in the browser).
 *   external → hands the URL off to another app via Intent chooser on
 *              Android (MX Player, VLC, Just Player, Wuffy, Kodi…).
 *              On iOS, tries vlc-x-callback:// / infuse://.
 *              On the web, shows a VLC launch + copy-URL panel.
 */

export type PlaybackMode = "internal" | "external";

const KEY = "livetv.playback_mode";

export const getPlaybackMode = (): PlaybackMode => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "external") return "external";
  } catch {
    /* ignore */
  }
  return "internal";
};

export const setPlaybackMode = (mode: PlaybackMode): void => {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
};
