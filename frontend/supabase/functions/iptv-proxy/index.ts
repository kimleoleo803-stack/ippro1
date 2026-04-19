// IPTV Proxy: streams Xtream API + M3U playlists + HLS streams server-side to bypass CORS.
// - POST { url, responseType } → used by frontend libs (xtream/m3u parsers)
// - GET  ?url=...              → used directly by <video>/HLS.js as the stream src
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-proxy-status, x-proxy-error, content-length, content-range, accept-ranges",
};

const isPrivateHost = (h: string): boolean => {
  h = h.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    if (a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
};

const errResp = (msg: string, status = 400) =>
  new Response(msg, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain", "x-proxy-error": msg.slice(0, 200) },
  });

const PROXY_PATH = "/functions/v1/iptv-proxy";

// Rewrite an HLS playlist so every segment / sub-playlist URL also goes through the proxy.
const rewriteM3U8 = (text: string, baseUrl: string, proxyOrigin: string): string => {
  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite URI="..." inside tags (e.g. EXT-X-KEY, EXT-X-MEDIA)
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
          try {
            const abs = new URL(uri, base).toString();
            return `URI="${proxyOrigin}${PROXY_PATH}?url=${encodeURIComponent(abs)}"`;
          } catch {
            return _m;
          }
        });
      }

      // Bare URL line (segment or sub-playlist)
      try {
        const abs = new URL(trimmed, base).toString();
        return `${proxyOrigin}${PROXY_PATH}?url=${encodeURIComponent(abs)}`;
      } catch {
        return line;
      }
    })
    .join("\n");
};

const fetchUpstream = async (url: string, range?: string | null) => {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "*/*",
  };
  if (range) headers["Range"] = range;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: controller.signal, headers });
    return { res, timeout };
  } catch (e: any) {
    clearTimeout(timeout);
    throw e;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let targetUrl: string | undefined;
  let responseType: "json" | "text" | "stream" = "stream";

  if (req.method === "GET") {
    targetUrl = new URL(req.url).searchParams.get("url") ?? undefined;
    responseType = "stream";
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      targetUrl = body.url;
      responseType = body.responseType ?? "json";
    } catch {
      return errResp("Invalid JSON body", 400);
    }
  } else {
    return errResp("Method not allowed", 405);
  }

  if (!targetUrl) return errResp("Missing 'url'", 400);

  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return errResp("Invalid URL", 400);
  }
  if (!["http:", "https:"].includes(target.protocol)) return errResp("Only http/https allowed", 400);
  if (isPrivateHost(target.hostname)) return errResp("Private/loopback hosts blocked", 400);

  let upstream: Response;
  let timeout: number;
  try {
    const r = await fetchUpstream(target.toString(), req.headers.get("range"));
    upstream = r.res;
    timeout = r.timeout;
  } catch (e: any) {
    return errResp(e?.name === "AbortError" ? "Upstream timeout" : `Upstream fetch failed: ${e?.message || e}`, 502);
  }

  const contentType =
    upstream.headers.get("content-type") ||
    (responseType === "text" ? "text/plain" : "application/octet-stream");

  const isM3U8 =
    /mpegurl|m3u8/i.test(contentType) || /\.m3u8(\?|$)/i.test(target.pathname + target.search);

  // For HLS playlists we MUST rewrite segment URLs through the proxy too.
  if (isM3U8) {
    try {
      const text = await upstream.text();
      clearTimeout(timeout);
      const proxyOrigin = new URL(req.url).origin;
      const rewritten = rewriteM3U8(text, target.toString(), proxyOrigin);
      return new Response(rewritten, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    } catch (e: any) {
      clearTimeout(timeout);
      return errResp(`Failed to read playlist: ${e?.message || e}`, 502);
    }
  }

  // Pass-through stream (segments, MP4, JSON, etc.). Forward useful headers.
  const passHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": contentType };
  for (const h of ["content-length", "content-range", "accept-ranges", "cache-control"]) {
    const v = upstream.headers.get(h);
    if (v) passHeaders[h] = v;
  }
  passHeaders["x-proxy-status"] = String(upstream.status);

  return new Response(upstream.body, { status: upstream.status, headers: passHeaders });
});
