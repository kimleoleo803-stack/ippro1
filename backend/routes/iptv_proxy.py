"""
Local IPTV proxy — drop-in replacement for the Supabase `iptv-proxy` edge
function so the app works without Supabase.

Exposes:
    POST /api/iptv-proxy     { url, responseType, ua? }
    GET  /api/iptv-proxy     ?url=...&ua=...

Behaviour mirrors `frontend/supabase/functions/iptv-proxy/index.ts`:
    * Rewrites HLS manifests so segment URLs also route through this proxy
      (needed because the server never exposes its own origin directly).
    * Detects real m3u8 responses by body magic `#EXTM3U`, not URL path,
      so Xtream servers that 302-redirect `.m3u8` → raw MPEG-TS stream
      through untouched.
    * Forwards a client-supplied User-Agent to the upstream server so
      IPTV providers gating on UA accept the request.
    * Response header `x-proxy-kind` = `m3u8` / `passthrough` /
      `text-passthrough` makes live-stream debugging trivial.
"""

from __future__ import annotations

import ipaddress
import logging
import re
from typing import AsyncIterator, Literal, Optional
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Header, Query, Request
from fastapi.responses import Response, StreamingResponse, JSONResponse
from pydantic import BaseModel

logger = logging.getLogger("iptv_proxy")
router = APIRouter(prefix="/api", tags=["iptv-proxy"])

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Content-type → kind detection helpers
_M3U8_CT_RE = re.compile(r"mpegurl|m3u8|x-mpegurl", re.I)
_TEXT_CT_RE = re.compile(r"^text/|\+xml|json|plain", re.I)
_URL_M3U8_RE = re.compile(r"\.m3u8(\?|$)", re.I)

# Private network block list — same logic as the Supabase edge function.
def _is_private_host(host: str) -> bool:
    host = host.lower()
    if host in {"localhost", "0.0.0.0", "::1"}:
        return True
    if host.endswith(".local") or host.endswith(".internal"):
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )


def _err(msg: str, status: int = 400) -> Response:
    return Response(
        content=msg,
        status_code=status,
        media_type="text/plain",
        headers={"x-proxy-error": msg[:200]},
    )


def _looks_like_hls(text: str) -> bool:
    if not text:
        return False
    i = 0
    if text.startswith("\ufeff"):
        i = 1
    while i < len(text) and text[i] in " \t\r\n":
        i += 1
    return text[i : i + 7].upper() == "#EXTM3U"


def _rewrite_m3u8(text: str, base_url: str, proxy_origin: str, ua: str) -> str:
    """Rewrite every URI in an HLS playlist to route through this proxy."""
    from urllib.parse import urljoin

    ua_qs = f"&ua={quote(ua, safe='')}" if ua and ua != DEFAULT_UA else ""
    out_lines: list[str] = []

    for raw in text.splitlines():
        line = raw.rstrip("\r")
        trimmed = line.strip()
        if not trimmed:
            out_lines.append(line)
            continue

        # URI="..." inside tags (e.g. EXT-X-KEY, EXT-X-MEDIA)
        if trimmed.startswith("#"):
            def _uri_sub(m: re.Match) -> str:
                abs_url = urljoin(base_url, m.group(1))
                return (
                    f'URI="{proxy_origin}/api/iptv-proxy'
                    f"?url={quote(abs_url, safe='')}{ua_qs}\""
                )

            out_lines.append(re.sub(r'URI="([^"]+)"', _uri_sub, line))
            continue

        # Bare URL line → segment or child playlist.
        try:
            abs_url = urljoin(base_url, trimmed)
        except Exception:
            out_lines.append(line)
            continue
        out_lines.append(
            f"{proxy_origin}/api/iptv-proxy"
            f"?url={quote(abs_url, safe='')}{ua_qs}"
        )

    return "\n".join(out_lines)


def _proxy_origin(request: Request) -> str:
    """Compute the origin for rewriting — respects X-Forwarded-* headers."""
    # Prefer the headers set by the ingress / reverse proxy.
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    return f"{proto}://{host}"


def _target_url(raw: str) -> Optional[str]:
    """Validate a target URL, block private/loopback hosts."""
    try:
        from urllib.parse import urlparse

        p = urlparse(raw)
    except Exception:
        return None
    if p.scheme not in {"http", "https"}:
        return None
    if not p.hostname or _is_private_host(p.hostname):
        return None
    return raw


class _ProxyPostBody(BaseModel):
    url: str
    responseType: Literal["json", "text", "stream"] = "json"
    ua: Optional[str] = None


async def _fetch_upstream(
    url: str, ua: str, range_hdr: Optional[str]
) -> tuple[httpx.Response, httpx.AsyncClient]:
    """Open a streaming request and hand back the live response + client."""
    headers = {"User-Agent": ua or DEFAULT_UA, "Accept": "*/*"}
    if range_hdr:
        headers["Range"] = range_hdr

    client = httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(25.0, connect=10.0, read=25.0),
        limits=httpx.Limits(max_connections=64),
    )
    req = client.build_request("GET", url, headers=headers)
    # Start the request but don't load the body yet — we want streaming.
    resp = await client.send(req, stream=True)
    return resp, client


async def _handle(
    request: Request,
    target_raw: str,
    response_type: str,
    ua: Optional[str],
) -> Response:
    target = _target_url(target_raw)
    if not target:
        return _err("Invalid or blocked URL", 400)

    upstream_ua = (
        ua
        or request.headers.get("x-upstream-ua")
        or DEFAULT_UA
    )

    try:
        upstream, client = await _fetch_upstream(
            target, upstream_ua, request.headers.get("range")
        )
    except httpx.TimeoutException:
        return _err("Upstream timeout", 502)
    except Exception as exc:  # noqa: BLE001
        logger.warning("upstream fetch failed: %s", exc)
        return _err(f"Upstream fetch failed: {exc}", 502)

    content_type = upstream.headers.get("content-type") or "application/octet-stream"
    url_is_m3u8 = bool(_URL_M3U8_RE.search(target))
    ct_is_m3u8 = bool(_M3U8_CT_RE.search(content_type))
    ct_is_text = bool(_TEXT_CT_RE.search(content_type))
    may_be_m3u8 = ct_is_m3u8 or (url_is_m3u8 and ct_is_text)

    # Playlist branch — rewrite segments back through us.
    if may_be_m3u8 or response_type in {"json", "text"}:
        try:
            # aread() + aclose() — we're NOT streaming; we need the full body.
            body_bytes = await upstream.aread()
            await upstream.aclose()
            await client.aclose()
        except Exception as exc:  # noqa: BLE001
            await client.aclose()
            return _err(f"Failed to read body: {exc}", 502)

        if response_type == "json":
            return Response(
                content=body_bytes,
                status_code=upstream.status_code,
                media_type=content_type,
                headers={"x-proxy-kind": "json-passthrough"},
            )

        # Decode text safely.
        try:
            text = body_bytes.decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            text = body_bytes.decode("latin-1", errors="replace")

        if may_be_m3u8 and _looks_like_hls(text):
            rewritten = _rewrite_m3u8(
                text, target, _proxy_origin(request), upstream_ua
            )
            return Response(
                content=rewritten,
                status_code=upstream.status_code,
                media_type="application/vnd.apple.mpegurl",
                headers={
                    "x-proxy-kind": "m3u8",
                    "Cache-Control": "no-cache",
                },
            )

        # Text body that wasn't a real manifest — pass through as-is.
        return Response(
            content=text,
            status_code=upstream.status_code,
            media_type=content_type,
            headers={
                "x-proxy-kind": "text-passthrough",
                "Cache-Control": "no-cache",
            },
        )

    # Binary / video passthrough — stream the body straight to the client.
    pass_headers: dict[str, str] = {
        "x-proxy-kind": "passthrough",
        "x-proxy-status": str(upstream.status_code),
    }
    for h in ("content-length", "content-range", "accept-ranges", "cache-control"):
        v = upstream.headers.get(h)
        if v is not None:
            pass_headers[h] = v

    async def _body_iter() -> AsyncIterator[bytes]:
        try:
            async for chunk in upstream.aiter_bytes():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        _body_iter(),
        status_code=upstream.status_code,
        media_type=content_type,
        headers=pass_headers,
    )


@router.get("/iptv-proxy")
async def iptv_proxy_get(
    request: Request,
    url: Optional[str] = Query(None),
    ua: Optional[str] = Query(None),
) -> Response:
    """Direct stream URL — used by <video>/HLS.js as the media source."""
    if not url:
        return _err("Missing 'url' query parameter", 400)
    return await _handle(request, url, "stream", ua)


@router.post("/iptv-proxy")
async def iptv_proxy_post(
    request: Request,
    body: _ProxyPostBody,
    x_upstream_ua: Optional[str] = Header(None),
) -> Response:
    """JSON / text RPC — used by the Xtream + M3U parsers in the client."""
    return await _handle(request, body.url, body.responseType, body.ua or x_upstream_ua)


@router.options("/iptv-proxy")
async def iptv_proxy_options() -> Response:
    return JSONResponse(
        {"ok": True},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type, authorization, x-upstream-ua, range",
        },
    )
