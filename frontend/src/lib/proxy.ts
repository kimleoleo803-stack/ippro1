import { supabase } from "@/integrations/supabase/client";
import { CapacitorHttp } from "@capacitor/core";
import { isNativeApp } from "@/native/nativePlayer";
import { getUserAgent } from "@/lib/userAgent";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/iptv-proxy`;

/**
 * Calls Xtream-style backends.
 *
 *   • On native (Android / iOS): uses CapacitorHttp — a pure-native HTTP
 *     client that bypasses the WebView's CORS / mixed-content restrictions
 *     and sends a custom User-Agent (IPTV Smarters, VLC, etc.), exactly
 *     like a standalone IPTV app would.
 *
 *   • On the web: falls back to the Supabase `iptv-proxy` edge function,
 *     because browsers won't let us override User-Agent or bypass CORS.
 */
export const proxyFetch = async <T = unknown>(
  url: string,
  responseType: "json" | "text" = "json"
): Promise<T> => {
  // ---- Native direct path ----
  if (isNativeApp()) {
    const res = await CapacitorHttp.request({
      url,
      method: "GET",
      headers: {
        "User-Agent": getUserAgent(),
        Accept: responseType === "json" ? "application/json, */*" : "*/*",
      },
      responseType: responseType === "text" ? "text" : "json",
      connectTimeout: 15000,
      readTimeout: 20000,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Upstream ${res.status}`);
    }
    // CapacitorHttp auto-parses JSON when responseType is 'json'.
    if (responseType === "text") return String(res.data) as T;
    if (typeof res.data === "string") {
      try {
        return JSON.parse(res.data) as T;
      } catch {
        return res.data as unknown as T;
      }
    }
    return res.data as T;
  }

  // ---- Web: go through Supabase edge function ----
  const { data: sess } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ url, responseType }),
  });

  if (!res.ok) {
    const errMsg =
      res.headers.get("x-proxy-error") ||
      (await res.text().catch(() => "")) ||
      `Proxy ${res.status}`;
    throw new Error(errMsg);
  }

  if (responseType === "text") return (await res.text()) as T;
  return (await res.json()) as T;
};
