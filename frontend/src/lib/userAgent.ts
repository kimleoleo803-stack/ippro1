/**
 * User-Agent presets sent on every stream / API request.
 * Keep this list short — only apps the product actually recommends.
 */

export interface UaPreset {
  id: string;
  label: string;
  value: string;
}

export const UA_PRESETS: UaPreset[] = [
  {
    id: "vidoplay",
    label: "VidoPlay",
    value: "VidoPlay/1.0 (Android) ExoPlayerLib/2.19.1",
  },
  {
    id: "vlc",
    label: "VLC Media Player",
    value: "VLC/3.0.20 LibVLC/3.0.20",
  },
];

const STORAGE_KEY = "livetv.ua";

export const getUserAgent = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return UA_PRESETS[0].value; // VidoPlay default
};

export const setUserAgent = (ua: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, ua);
  } catch {
    /* ignore */
  }
};

export const getUserAgentId = (): string => {
  const current = getUserAgent();
  const hit = UA_PRESETS.find((p) => p.value === current);
  return hit ? hit.id : "custom";
};
