import { useMemo, useState } from "react";
import {
  Search,
  Star,
  Play,
  RefreshCw,
  Loader2,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/PageLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { useProfiles } from "@/hooks/useProfiles";
import { useLiveChannels, useReloadPlaylist, useShortEpg } from "@/hooks/useXtreamData";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import type { Channel } from "@/types/xtream";

import { NativePlayer, isNativeApp } from "@/native/nativePlayer";
import { getPlaybackMode } from "@/lib/playbackMode";
import { getExternalApp } from "@/lib/externalApp";
import { getUserAgent } from "@/lib/userAgent";
import {
  tryLaunchExternalFromBrowser,
  buildVlcUrl,
  buildVlcIosUrl,
  openPlayStore,
} from "@/lib/externalLauncher";

type ViewMode = "list" | "grid";

const LiveTV = () => {
  const { activeProfile } = useProfiles();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: channels = [], isLoading, error } = useLiveChannels(activeProfile);
  const reload = useReloadPlaylist();
  const { isFavorite, toggle } = useFavorites(activeProfile?.id, "live");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const mode = getPlaybackMode();
  const native = isNativeApp();
  const externalApp = getExternalApp();
  const isPaidUser = user?.role === "user";

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(channels.map((c) => c.category)))],
    [channels]
  );
  // Note: display of "All" is localized via t("common.all") in the render

  const filtered = useMemo(
    () =>
      channels.filter((ch) => {
        const matchSearch = ch.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = selectedCategory === "All" || ch.category === selectedCategory;
        const matchFav = !showFavOnly || isFavorite(ch.id);
        return matchSearch && matchCat && matchFav;
      }),
    [channels, search, selectedCategory, showFavOnly, isFavorite]
  );

  // Current programme for the selected channel
  const { data: epg = [] } = useShortEpg(activeProfile, selectedChannel?.id);
  const nowPlaying = epg.find((e) => e.nowPlaying) ?? epg[0];

  // ───────────── channel-click handler ─────────────
  const onChannelClick = async (ch: Channel) => {
    // External playback mode → launch the external app and do NOT
    // mount the in-app player. The channel list stays on screen.
    if (mode === "external") {
      try {
        if (native) {
          const res = await NativePlayer.openExternal({
            url: ch.streamUrl,
            title: ch.name,
            userAgent: getUserAgent(),
            package: externalApp.androidPackage,
          });

          if (res?.launched) {
            toast.success(
              t("liveTV.openingInApp", { channel: ch.name, app: externalApp.label }),
            );
          } else if (res?.reason === "not-installed" && res.package) {
            // Let the user install their chosen external app.
            toast.error(`${externalApp.label} is not installed`, {
              action: {
                label: "Install",
                onClick: () =>
                  NativePlayer.openPlayStore({ package: res.package! }),
              },
              duration: 8000,
            });
          } else {
            toast.error(t("liveTV.couldntOpen", { app: externalApp.label }));
          }
        } else {
          const ok = tryLaunchExternalFromBrowser(ch.streamUrl, {
            package: externalApp.androidPackage,
            title: ch.name,
            userAgent: getUserAgent(),
            onNotInstalled: (pkg) => {
              // No app responded to the intent → almost certainly not
              // installed. Let the user install it in one tap.
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
          if (ok) {
            toast.message(t("liveTV.sentToApp", { app: externalApp.label }));
          } else {
            // Desktop / unsupported browser — user must click the visible
            // "Open in <App>" button we render below.
            toast.message(`Tap "Open in ${externalApp.label}" to launch`);
          }
        }
      } catch (e: any) {
        toast.error(
          e?.message || t("liveTV.couldntOpen", { app: externalApp.label }),
        );
      }
      // Still mark as selected so EPG / title updates
      setSelectedChannel(ch);
      return;
    }

    // Internal mode → normal in-app player
    setSelectedChannel(ch);
  };

  // URL scheme to use for the visible "Open in <App>" fallback button
  // when the browser can't auto-launch (desktop / iOS Safari).
  const browserLaunchHref = (streamUrl: string): string | undefined => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/iPad|iPhone|iPod/.test(ua)) return buildVlcIosUrl(streamUrl);
    if (/Android/i.test(ua)) return undefined; // handled via intent://
    return buildVlcUrl(streamUrl);
  };

  if (!activeProfile) {
    return (
      <PageLayout title={t("liveTV.title")}>
        <div className="h-full flex items-center justify-center">
          <div className="glass-card rounded-2xl p-6 text-center max-w-sm">
            <p className="text-foreground text-sm mb-3">{t("liveTV.noActiveServer")}</p>
            {isPaidUser ? (
              <p className="text-muted-foreground text-xs">{t("liveTV.contactAdmin")}</p>
            ) : (
              <Link to="/account" className="text-primary text-xs underline">
                {t("liveTV.addProfile")}
              </Link>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  const externalBadge =
    mode === "external" ? (
      <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-1.5">
        <ExternalLink className="w-3 h-3 text-primary" />
        <span className="text-[10px] text-foreground/80">{externalApp.label}</span>
      </div>
    ) : null;

  // ───────────── channel rows / cards ─────────────
  // NOTE: we intentionally render plain `<div>`s (NOT framer-motion) and
  // use `content-visibility: auto` so the browser skips layout/paint
  // for rows outside the viewport. Rendering 300 `motion.div`s with
  // per-item animations while scrolling through real-world flaky IPTV
  // logo URLs was causing Chrome's renderer to OOM + auto-reload the
  // tab (which manifested as a white flash that dropped the user back
  // on the home screen). This is the root-cause fix for that bug.
  const rowStyle = {
    contentVisibility: "auto" as const,
    containIntrinsicSize: "56px",
  };
  const gridItemStyle = {
    contentVisibility: "auto" as const,
    containIntrinsicSize: "160px",
  };

  const renderList = () => (
    <div className="space-y-1">
      {filtered.slice(0, 300).map((ch) => (
        <div
          key={ch.id}
          onClick={() => onChannelClick(ch)}
          style={rowStyle}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-transform active:scale-[0.98] ${
            selectedChannel?.id === ch.id
              ? "glass-card border border-primary/30"
              : "hover:bg-white/5"
          }`}
        >
          <div className="w-10 h-7 rounded bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
            {ch.logoUrl ? (
              <img
                src={ch.logoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <Play className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-xs font-medium truncate">{ch.name}</p>
            <p className="text-muted-foreground text-[10px] truncate">{ch.category}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(ch.id);
            }}
          >
            <Star
              className={`w-4 h-4 ${
                isFavorite(ch.id) ? "text-primary fill-primary" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {filtered.slice(0, 300).map((ch) => (
        <div
          key={ch.id}
          onClick={() => onChannelClick(ch)}
          style={gridItemStyle}
          className={`relative aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-transform active:scale-[0.96] p-2 ${
            selectedChannel?.id === ch.id
              ? "glass-card border border-primary/40"
              : "glass-card hover:border-primary/20"
          }`}
        >
          <div className="w-14 h-10 rounded bg-muted/30 flex items-center justify-center overflow-hidden">
            {ch.logoUrl ? (
              <img
                src={ch.logoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <Play className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-foreground text-[11px] font-medium text-center line-clamp-2">
            {ch.name}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle(ch.id);
            }}
            className="absolute top-1.5 right-1.5"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite(ch.id) ? "text-primary fill-primary" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <PageLayout title={t("liveTV.title")}>
      <div className="h-full flex flex-col gap-3">
        {/* Top bar: search · category · favourites · view · external badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("liveTV.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-foreground placeholder:text-muted-foreground text-xs outline-none flex-1"
            />
          </div>

          <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-foreground text-xs outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-background">
                  {c === "All" ? t("common.all") : c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowFavOnly((v) => !v)}
            className={`glass-card rounded-xl px-3 py-2 flex items-center gap-1.5 ${
              showFavOnly ? "border border-primary/40" : ""
            }`}
            title={t("liveTV.favs")}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                showFavOnly ? "text-primary fill-primary" : "text-muted-foreground"
              }`}
            />
            <span className="text-[11px] text-foreground/80">{t("liveTV.favs")}</span>
          </button>

          <div className="glass-card rounded-xl p-0.5 flex items-center">
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 rounded-lg ${
                viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
              title={t("liveTV.listView")}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-lg ${
                viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
              title={t("liveTV.gridView")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => reload(activeProfile.id)}
            className="glass-card rounded-xl p-2"
            title={t("common.refresh")}
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
          </button>

          {externalBadge}
        </div>

        {/* Main content */}
        {mode === "external" ? (
          // External mode: just a big channel list/grid + EPG strip.
          // Clicking a channel fires the external app; no in-app player.
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            {selectedChannel && (
              <div className="glass-card rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-7 rounded bg-muted/30 flex items-center justify-center overflow-hidden">
                    {selectedChannel.logoUrl ? (
                      <img
                        src={selectedChannel.logoUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Play className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-medium truncate">
                      {selectedChannel.name}
                    </p>
                    <p className="text-muted-foreground text-[10px] truncate">
                      {nowPlaying?.title
                        ? t("liveTV.nowPrefix", { title: nowPlaying.title })
                        : selectedChannel.category}
                    </p>
                  </div>
                </div>

                {/* Prominent "Open in <App>" button — works on Android
                    via intent://, on iOS via vlc-x-callback://, and on
                    desktop via vlc://<url>. */}
                {(() => {
                  const href = browserLaunchHref(selectedChannel.streamUrl);
                  return href ? (
                    <a
                      href={href}
                      className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg shadow-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in {externalApp.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => onChannelClick(selectedChannel)}
                      className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg shadow-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in {externalApp.label}
                    </button>
                  );
                })()}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1">
              {isLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}
              {error && (
                <p className="text-destructive text-xs px-2">
                  {t("liveTV.failedLoad")}
                </p>
              )}
              {!isLoading && filtered.length === 0 && (
                <p className="text-muted-foreground text-xs text-center py-6">
                  {t("liveTV.noChannels")}
                </p>
              )}
              {viewMode === "list" ? renderList() : renderGrid()}
            </div>

            {/* Mini EPG for selected channel */}
            {selectedChannel && epg.length > 0 && (
              <div className="glass-card rounded-xl p-2 max-h-36 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground mb-1 px-1">
                  {t("liveTV.epgFor", { name: selectedChannel.name })}
                </p>
                {epg.slice(0, 6).map((e, i) => (
                  <div
                    key={e.id + i}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md ${
                      e.nowPlaying ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground w-10 shrink-0">
                      {e.start ? e.start.slice(11, 16) : "--:--"}
                    </span>
                    <span
                      className={`text-[11px] truncate ${
                        e.nowPlaying ? "text-primary font-medium" : "text-foreground/80"
                      }`}
                    >
                      {e.title || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Internal mode: classic layout (list + player).
          <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">
            <div className="md:w-[340px] shrink-0 flex flex-col gap-2 min-h-0">
              <div className="flex-1 overflow-y-auto pr-1">
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                )}
                {error && (
                  <p className="text-destructive text-xs px-2">
                    {t("liveTV.failedLoad")}
                  </p>
                )}
                {!isLoading && filtered.length === 0 && (
                  <p className="text-muted-foreground text-xs text-center py-6">
                    {t("liveTV.noChannels")}
                  </p>
                )}
                {viewMode === "list" ? renderList() : renderGrid()}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div className="flex-1 glass-card rounded-2xl overflow-hidden flex items-center justify-center min-h-[240px] relative">
                {selectedChannel ? (
                  <VideoPlayer
                    src={selectedChannel.streamUrl}
                    poster={selectedChannel.logoUrl}
                    title={selectedChannel.name}
                    isLive
                  />
                ) : (
                  <div className="text-center">
                    <Play className="w-12 h-12 text-primary/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{t("liveTV.selectChannel")}</p>
                  </div>
                )}
              </div>

              {selectedChannel && (
                <div className="text-center">
                  <p className="text-foreground text-sm font-medium">
                    {selectedChannel.name}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {nowPlaying?.title
                      ? t("liveTV.nowPrefix", { title: nowPlaying.title })
                      : selectedChannel.category}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-muted-foreground text-[10px]">
          {t("liveTV.channels", { count: channels.length })}
        </div>
      </div>
    </PageLayout>
  );
};

export default LiveTV;
