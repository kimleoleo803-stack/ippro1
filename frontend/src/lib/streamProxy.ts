// Wraps a stream URL so playback requests go through the iptv-proxy edge function.
// This bypasses CORS issues that prevent <video>/HLS.js from loading IPTV streams directly.
// On native (Android / iOS), we skip the proxy entirely — ExoPlayer / AVPlayer
// fetch the stream URL directly with our custom User-Agent, just like IPTV Smarters.
import { Capacitor } from "@capacitor/core";
import { getUserAgent } from "@/lib/userAgent";

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/iptv-proxy`;

export const proxiedStreamUrl = (url: string): string => {
  if (!url) return url;
  if (Capacitor.isNativePlatform()) return url; // native players bypass CORS
  // Forward the user's chosen UA so IPTV servers that gate on it (e.g.
  // IPTVSmarters, VLC-only) accept our request.
  const ua = encodeURIComponent(getUserAgent());
  return `${PROXY_URL}?url=${encodeURIComponent(url)}&ua=${ua}`;
};
