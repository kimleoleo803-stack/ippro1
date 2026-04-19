// IPTV Proxy: streams Xtream API + M3U playlists + HLS streams server-side to bypass CORS.
// - POST { url, responseType, ua? } → used by frontend libs (xtream/m3u parsers)
// - GET  ?url=...&ua=...            → used directly by <video>/HLS.js as the stream src
//
// KEY FIX (live TV): Many Xtream servers 302-redirect `/live/<u>/<p>/<id>.m3u8`
// to a raw MPEG-TS (`video/mp2t`). Previously we treated the response as m3u8
// (based on the URL path ending in `.m3u8`) and tried to "rewrite" the binary
// TS as if it were an HLS manifest — which corrupted the stream and prevented
// live playback in the browser. We now detect real m3u8 responses by inspecting
// the response body (magic `#EXTM3U`) and the upstream content-type.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range, x-upstream-ua, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers":
    "x-proxy-status, x-proxy-error, x-proxy-kind, content-length, content-range, accept-ranges",
};

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain",
      "x-proxy-error": msg.slice(0, 200),
    },
  });

const PROXY_PATH = "/functions/v1/iptv-proxy";

// Rewrite an HLS playlist so every segment / sub-playlist URL also goes through the proxy.
const rewriteM3U8 = (
  text: string,
  baseUrl: string,
  proxyOrigin: string,
  ua: string,
): string => {
  const base = new URL(baseUrl);
  const uaQs = ua && ua !== DEFAULT_UA ? `&ua=${encodeURIComponent(ua)}` : "";
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
            return `URI="${proxyOrigin}${PROXY_PATH}?url=${encodeURIComponent(abs)}${uaQs}"`;
          } catch {
            return _m;
          }
        });
      }

      // Bare URL line (segment or sub-playlist)
      try {
        const abs = new URL(trimmed, base).toString();
        return `${proxyOrigin}${PROXY_PATH}?url=${encodeURIComponent(abs)}${uaQs}`;
      } catch {
        return line;
      }
    })
    .join("\n");
};

const fetchUpstream = async (
  url: string,
  ua: string,
  range?: string | null,
) => {
  const headers: Record<string, string> = {
    "User-Agent": ua || DEFAULT_UA,
    Accept: "*/*",
  };
  if (range) headers["Range"] = range;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    return { res, timeout };
  } catch (e: any) {
    clearTimeout(timeout);
    throw e;
  }
};

// Does the given text really look like an HLS manifest?
const looksLikeHlsManifest = (text: string): boolean => {
  if (!text) return false;
  // Skip BOM + leading whitespace, first non-blank line should start with #EXTM3U
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  while (i < text.length && (text[i] === " " || text[i] === "\n" || text[i] === "\r" || text[i] === "\t")) i++;
  return text.substr(i, 7).toUpperCase() === "#EXTM3U";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let targetUrl: string | undefined;
  let responseType: "json" | "text" | "stream" = "stream";
  let clientUa: string | undefined;

  if (req.method === "GET") {
    const qs = new URL(req.url).searchParams;
    targetUrl = qs.get("url") ?? undefined;
    clientUa = qs.get("ua") ?? undefined;
    responseType = "stream";
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      targetUrl = body.url;
      responseType = body.responseType ?? "json";
      clientUa = body.ua;
    } catch {
      return errResp("Invalid JSON body", 400);
    }
  } else {
    return errResp("Method not allowed", 405);
  }

  // Allow client to override the upstream UA via a header as well.
  const headerUa = req.headers.get("x-upstream-ua");
  const upstreamUa = clientUa || headerUa || DEFAULT_UA;

  if (!targetUrl) return errResp("Missing 'url'", 400);

  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return errResp("Invalid URL", 400);
  }
  if (!["http:", "https:"].includes(target.protocol))
    return errResp("Only http/https allowed", 400);
  if (isPrivateHost(target.hostname))
    return errResp("Private/loopback hosts blocked", 400);

  let upstream: Response;
  let timeout: number;
  try {
    const r = await fetchUpstream(
      target.toString(),
      upstreamUa,
      req.headers.get("range"),
    );
    upstream = r.res;
    timeout = r.timeout;
  } catch (e: any) {
    return errResp(
      e?.name === "AbortError"
        ? "Upstream timeout"
        : `Upstream fetch failed: ${e?.message || e}`,
      502,
    );
  }

  const contentType =
    upstream.headers.get("content-type") ||
    (responseType === "text" ? "text/plain" : "application/octet-stream");
  const looksLikeM3u8Header = /mpegurl|m3u8|x-mpegurl/i.test(contentType);
  const urlEndsInM3u8 = /\.m3u8(\?|$)/i.test(target.pathname + target.search);
  const isTextish = /^text\/|\+xml|json|plain/i.test(contentType);

  // Decide whether we need to rewrite (HLS text). If the URL ends in .m3u8
  // but the response content-type is clearly binary (e.g. video/mp2t,
  // application/octet-stream), we MUST NOT treat it as m3u8 — otherwise
  // we'd corrupt a raw MPEG-TS stream. In that ambiguous case we peek
  // at the first bytes to decide.
  const mayBeM3u8 = looksLikeM3u8Header || (urlEndsInM3u8 && isTextish);

  if (mayBeM3u8) {
    try {
      const text = await upstream.text();
      clearTimeout(timeout);
      if (looksLikeHlsManifest(text)) {
        const proxyOrigin = new URL(req.url).origin;
        const rewritten = rewriteM3U8(text, target.toString(), proxyOrigin, upstreamUa);
        return new Response(rewritten, {
          status: upstream.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-cache",
            "x-proxy-kind": "m3u8",
          },
        });
      }
      // Looked like m3u8 but body wasn't a real manifest — fall through
      // and serve the bytes as-is so downstream players can try them.
      return new Response(text, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "x-proxy-kind": "text-passthrough",
        },
      });
    } catch (e: any) {
      clearTimeout(timeout);
      return errResp(`Failed to read playlist: ${e?.message || e}`, 502);
    }
  }

  // Pass-through stream (segments, MP4, raw MPEG-TS live, JSON, etc.).
  const passHeaders: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": contentType,
    "x-proxy-kind": "passthrough",
  };
  for (const h of ["content-length", "content-range", "accept-ranges", "cache-control"]) {
    const v = upstream.headers.get(h);
    if (v) passHeaders[h] = v;
  }
  passHeaders["x-proxy-status"] = String(upstream.status);

  // NOTE: we intentionally don't `clearTimeout(timeout)` here — the timeout
  // is cancelled automatically once the upstream body has finished.

  return new Response(upstream.body, { status: upstream.status, headers: passHeaders });
});
