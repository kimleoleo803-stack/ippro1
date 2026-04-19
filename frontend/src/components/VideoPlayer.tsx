import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import mpegts from "mpegts.js";
import { Play, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { proxiedStreamUrl } from "@/lib/streamProxy";
import { NativePlayer, isNativeApp, nativePlatform } from "@/native/nativePlayer";
import { getUserAgent } from "@/lib/userAgent";
import { getPlaybackMode } from "@/lib/playbackMode";
import { getExternalApp } from "@/lib/externalApp";
import {
  tryLaunchExternalFromBrowser,
  buildVlcUrl,
  buildVlcIosUrl,
  openPlayStore,
} from "@/lib/externalLauncher";

interface Props {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
  isLive?: boolean;
}

const isLiveUrl = (url: string) =>
  /\.m3u8(\?|$)/i.test(url) || /\/live\//i.test(url) || /\.ts(\?|$)/i.test(url);

const VideoPlayer = ({
  src,
  poster,
  title,
  autoPlay = true,
  className = "",
  isLive,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<mpegts.Player | null>(null);
  const launchedOnceRef = useRef<string | null>(null); // StrictMode guard
  const [launching, setLaunching] = useState(false);

  const live = isLive ?? isLiveUrl(src);
  const native = isNativeApp();
  const mode = getPlaybackMode();
  const externalApp = getExternalApp();

  // ════════════════════════════════════════════════════════════════
  //   PLAYER-ONLY RECOVERY — used by every HLS error path.
  //   NEVER navigate, NEVER reload, NEVER touch the router.
  // ════════════════════════════════════════════════════════════════
  const restartStream = useCallback(() => {
    const hls = hlsRef.current;
    if (hls) {
      try {
        hls.stopLoad();
        hls.startLoad();
      } catch (e) {
        console.warn("[VideoPlayer] restartStream failed:", e);
      }
    }
  }, []);

  // ════════════════════════════════════════════════════════════════
  //   NATIVE LAUNCH (Capacitor — safe, uses real Intent / AVPlayer)
  // ════════════════════════════════════════════════════════════════
  const launchNativeInternal = useCallback(async () => {
    try {
      await NativePlayer.play({
        url: src,
        title: title ?? "",
        userAgent: getUserAgent(),
        isLive: live,
      });
    } catch (e) {
      console.error("[VideoPlayer] native play failed:", e);
      toast.error("Native player failed");
    }
  }, [src, title, live]);

  const launchExternal = useCallback(async () => {
    setLaunching(true);
    try {
      if (native) {
        // Android/iOS → real Intent / URL scheme, no page navigation.
        const res = await NativePlayer.openExternal({
          url: src,
          title: title ?? "",
          userAgent: getUserAgent(),
          package: externalApp.androidPackage,
        });
        if (!res?.launched && res?.reason === "not-installed" && res.package) {
          toast.error(`${externalApp.label} is not installed`, {
            action: {
              label: "Install",
              onClick: () =>
                NativePlayer.openPlayStore({ package: res.package! }),
            },
            duration: 8000,
          });
        }
      } else {
        // Browser: fires on Android Chrome / Median WebView (intent://)
        // and iOS Safari (vlc-x-callback://). Desktop returns false —
        // user must click the visible `<a href="vlc://…">` button.
        const ok = tryLaunchExternalFromBrowser(src, {
          package: externalApp.androidPackage,
          title: title ?? "",
          userAgent: getUserAgent(),
          onNotInstalled: (pkg) => {
            if (!pkg) {
              toast.error(`No ${externalApp.label} app handled the stream`);
              return;
            }
            toast.error(`${externalApp.label} is not installed`, {
              action: {
                label: "Install",
                onClick: () => openPlayStore(pkg),
              },
              duration: 10000,
            });
          },
        });
        if (!ok) {
          toast.message(`Tap "Open in ${externalApp.label}" to launch`);
        }
      }
    } catch (e: any) {
      console.error("[VideoPlayer] external launch failed:", e);
      toast.error(e?.message ?? `Couldn't open ${externalApp.label}`);
    } finally {
      window.setTimeout(() => setLaunching(false), 900);
    }
  }, [src, title, native, externalApp]);

  // Auto-fire external ONLY on native. On the web, never auto-navigate
  // the tab; the user has to tap the VLC button.
  useEffect(() => {
    if (!src) return;
    if (launchedOnceRef.current === src) return;
    launchedOnceRef.current = src;

    if (native && autoPlay) {
      if (mode === "external") launchExternal();
      else launchNativeInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, native, mode]);

  // ════════════════════════════════════════════════════════════════
  //   WEB internal player — HLS.js (YouTube-style continuous buffer)
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (native) return;
    if (mode === "external") return;

    const video = videoRef.current;
    if (!video || !src) return;

    const proxiedSrc = proxiedStreamUrl(src);
    const canNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    let cancelled = false;
    let mediaRecoverCount = 0;

    video.pause();
    video.removeAttribute("src");
    video.load();
    // IMPORTANT: always start unmuted. If we previously played a LIVE
    // stream in this same <video> element, we set `muted = true` to
    // satisfy the browser's autoplay policy. Without resetting it here,
    // movies (which are NOT live) would silently continue to play with
    // no sound — this was the "movies works without sound" bug.
    try {
      video.muted = false;
      video.volume = 1;
    } catch { /* ignore */ }

    const setupHls = () => {
      const hls = new Hls({
        autoStartLoad: true,
        enableWorker: true,
        lowLatencyMode: false,

        // Continuous buffering — HLS.js pulls the next segment forever.
        backBufferLength: 60,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        liveSyncDuration: live ? 10 : undefined,
        liveMaxLatencyDuration: live ? 30 : undefined,
        liveDurationInfinity: live,

        // Forgiveness for small gaps
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 3,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 10,

        // Retry counts — the real cure for "stops & reloads"
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 500,
        startFragPrefetch: true,
      });
      hlsRef.current = hls;

      hls.loadSource(proxiedSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (live) {
          video.muted = true;
          try {
            if (hls.levels && hls.levels.length > 1) hls.currentLevel = 1;
          } catch {
            /* ignore */
          }
        }
        if (autoPlay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (cancelled) return;
        if (!data.fatal) return;

        // ↳ NEVER reload the page. Only the player.
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn("[HLS] network error", data.details);
            // Many Xtream servers 302-redirect `.m3u8` to raw MPEG-TS.
            // HLS.js can't handle that — fall through to mpegts.js so
            // live TV actually plays in the browser.
            if (
              data.details === "manifestLoadError" ||
              data.details === "manifestLoadTimeOut" ||
              data.details === "manifestParsingError"
            ) {
              try { hls.destroy(); } catch { /* ignore */ }
              hlsRef.current = null;
              setupMpegts();
            } else {
              window.setTimeout(() => {
                if (!cancelled) restartStream();
              }, 1200);
            }
            break;

          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn("[HLS] media error → recoverMediaError()", data.details);
            if (mediaRecoverCount < 2) {
              mediaRecoverCount++;
              try {
                hls.recoverMediaError();
              } catch {
                /* ignore */
              }
            } else if (mediaRecoverCount < 4) {
              mediaRecoverCount++;
              try {
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } catch {
                /* ignore */
              }
            } else {
              console.error("[HLS] gave up recovering media errors");
              try { hls.destroy(); } catch { /* ignore */ }
              hlsRef.current = null;
              // Last-chance fallback for live streams: raw MPEG-TS via mpegts.js.
              if (live) setupMpegts();
            }
            break;

          default:
            console.error("[HLS] fatal other:", data.type, data.details);
            try { hls.destroy(); } catch { /* ignore */ }
            hlsRef.current = null;
            if (live) setupMpegts();
            break;
        }
      });
    };

    const setupMpegts = () => {
      if (!mpegts.isSupported()) return;
      const player = mpegts.createPlayer(
        { type: "mpegts", isLive: live, url: proxiedSrc },
        {
          enableWorker: true,
          liveBufferLatencyChasing: false,
          lazyLoad: false,
          autoCleanupSourceBuffer: true,
          stashInitialSize: 384,
        }
      );
      mpegtsRef.current = player;
      player.attachMediaElement(video);
      player.load();
      if (live) video.muted = true;
      if (autoPlay) {
        const p = player.play() as unknown as Promise<void> | void;
        if (p && typeof (p as Promise<void>).catch === "function")
          (p as Promise<void>).catch(() => {});
      }
    };

    if (live && Hls.isSupported()) setupHls();
    else if (live && canNativeHls) {
      video.src = proxiedSrc;
      video.muted = true;
      if (autoPlay) video.play().catch(() => {});
    } else {
      // ───── Direct playback path (mostly MOVIES / VOD from Xtream) ─────
      //
      // We DO NOT set `video.crossOrigin` here. Forcing CORS mode on a
      // proxied .mp4 caused Chrome to mark the media as CORS-tainted
      // which, combined with range-request handling, silently dropped
      // audio tracks on many IPTV VOD sources ("movies play without
      // sound" bug). The bytes still came through so video rendered,
      // but the audio decoder refused to emit samples.
      //
      // Since we never read the video into a canvas / captureStream,
      // we don't need `crossOrigin` at all for normal <video> playback.
      try {
        video.removeAttribute("crossorigin");
      } catch { /* ignore */ }

      video.src = proxiedSrc;
      video.muted = false;
      if (autoPlay) {
        const p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch((err) => {
            // Autoplay-with-sound blocked by the browser → retry muted
            // so at least the video starts; user can tap unmute.
            if (err?.name === "NotAllowedError") {
              video.muted = true;
              video.play().catch(() => {});
            }
          });
        }
      }
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        try {
          mpegtsRef.current.pause();
          mpegtsRef.current.unload();
          mpegtsRef.current.detachMediaElement();
          mpegtsRef.current.destroy();
        } catch {
          /* ignore */
        }
        mpegtsRef.current = null;
      }
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay, live, native, mode]);

  // ════════════════════════════════════════════════════════════════
  //   Rendering
  // ════════════════════════════════════════════════════════════════

  // External mode → minimal launching UI. On web desktop this is the
  // ONLY way to open the stream (we never auto-navigate the tab).
  if (mode === "external") {
    // Pick the right URL scheme for the browser we're on.
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/i.test(ua);
    const browserHref = isIOS
      ? buildVlcIosUrl(src)
      : isAndroid
        ? undefined // Android uses tryLaunchExternalFromBrowser (intent://)
        : buildVlcUrl(src);

    return (
      <div
        className={`relative w-full h-full bg-black flex items-center justify-center ${className}`}
        style={
          poster
            ? {
                backgroundImage: `url(${poster})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {native || isAndroid ? (
          <button
            onClick={launchExternal}
            className="flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium shadow-lg backdrop-blur"
          >
            {launching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ExternalLink className="w-5 h-5" />
            )}
            Open in {externalApp.label}
          </button>
        ) : (
          // iOS Safari / Desktop: render an <a> so the click is a user
          // gesture, never an automatic navigation. iOS → vlc-x-callback,
          // desktop → vlc://<url>.
          <a
            href={browserHref}
            className="flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium shadow-lg backdrop-blur"
          >
            <ExternalLink className="w-5 h-5" />
            Open in {externalApp.label}
          </a>
        )}
      </div>
    );
  }

  if (native) {
    return (
      <div
        className={`relative w-full h-full bg-black flex items-center justify-center ${className}`}
        style={
          poster
            ? {
                backgroundImage: `url(${poster})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={launchNativeInternal}
            className="flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium shadow-lg backdrop-blur"
          >
            <Play className="w-5 h-5" />
            Play
          </button>
          <p className="text-xs text-white/50">
            {nativePlatform() === "ios" ? "AVPlayer" : "ExoPlayer"}
            {title ? ` · ${title}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      playsInline
      className={`w-full h-full bg-black ${className}`}
    />
  );
};

export default VideoPlayer;
