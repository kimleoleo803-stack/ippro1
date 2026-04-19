import type { XtreamProfile, Channel, Movie, Series, XtreamCategory } from "@/types/xtream";
import { proxyFetch } from "@/lib/proxy";

const buildUrl = (p: XtreamProfile, action?: string, extra: Record<string, string> = {}) => {
  const base = p.serverUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    username: p.username,
    password: p.password,
    ...(action ? { action } : {}),
    ...extra,
  });
  return `${base}/player_api.php?${params.toString()}`;
};

const fetchJson = async (url: string) => {
  return proxyFetch<any>(url, "json");
};

export const xtreamApi = {
  async authenticate(p: XtreamProfile) {
    const data = await fetchJson(buildUrl(p));
    if (!data?.user_info || data.user_info.auth === 0) {
      throw new Error("Invalid credentials");
    }
    return data;
  },

  async getLiveCategories(p: XtreamProfile): Promise<XtreamCategory[]> {
    return fetchJson(buildUrl(p, "get_live_categories"));
  },

  async getVodCategories(p: XtreamProfile): Promise<XtreamCategory[]> {
    return fetchJson(buildUrl(p, "get_vod_categories"));
  },

  async getSeriesCategories(p: XtreamProfile): Promise<XtreamCategory[]> {
    return fetchJson(buildUrl(p, "get_series_categories"));
  },

  async getLiveStreams(p: XtreamProfile): Promise<Channel[]> {
    const [streams, cats] = await Promise.all([
      fetchJson(buildUrl(p, "get_live_streams")),
      this.getLiveCategories(p),
    ]);
    const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));
    const base = p.serverUrl.replace(/\/$/, "");
    return (streams || []).map((s: any) => ({
      id: String(s.stream_id),
      name: s.name,
      category: catMap.get(String(s.category_id)) ?? "Uncategorized",
      categoryId: String(s.category_id),
      streamUrl: `${base}/live/${p.username}/${p.password}/${s.stream_id}.m3u8`,
      logoUrl: s.stream_icon || undefined,
      epgChannelId: s.epg_channel_id || undefined,
    }));
  },

  async getMovies(p: XtreamProfile): Promise<Movie[]> {
    const [streams, cats] = await Promise.all([
      fetchJson(buildUrl(p, "get_vod_streams")),
      this.getVodCategories(p),
    ]);
    const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));
    const base = p.serverUrl.replace(/\/$/, "");
    return (streams || []).map((s: any) => ({
      id: String(s.stream_id),
      name: s.name,
      category: catMap.get(String(s.category_id)) ?? "Uncategorized",
      categoryId: String(s.category_id),
      streamUrl: `${base}/movie/${p.username}/${p.password}/${s.stream_id}.${s.container_extension || "mp4"}`,
      posterUrl: s.stream_icon || undefined,
      rating: s.rating ? String(s.rating) : undefined,
      year: s.year || undefined,
      containerExtension: s.container_extension,
    }));
  },

  async getSeries(p: XtreamProfile): Promise<Series[]> {
    const [list, cats] = await Promise.all([
      fetchJson(buildUrl(p, "get_series")),
      this.getSeriesCategories(p),
    ]);
    const catMap = new Map(cats.map((c) => [c.category_id, c.category_name]));
    return (list || []).map((s: any) => ({
      id: String(s.series_id),
      name: s.name,
      category: catMap.get(String(s.category_id)) ?? "Uncategorized",
      categoryId: String(s.category_id),
      posterUrl: s.cover || undefined,
      rating: s.rating ? String(s.rating) : undefined,
      plot: s.plot || undefined,
    }));
  },

  async getSeriesInfo(p: XtreamProfile, seriesId: string) {
    return fetchJson(buildUrl(p, "get_series_info", { series_id: seriesId }));
  },

  /**
   * Short EPG (current + next few programmes) for a live channel.
   * Titles come back Base64-encoded in most Xtream servers.
   */
  async getShortEpg(p: XtreamProfile, streamId: string, limit = 4) {
    const data = await fetchJson(
      buildUrl(p, "get_short_epg", {
        stream_id: streamId,
        limit: String(limit),
      })
    );
    const decode = (s: string) => {
      try {
        return typeof atob === "function"
          ? decodeURIComponent(escape(atob(s)))
          : s;
      } catch {
        return s;
      }
    };
    const list: any[] = Array.isArray(data?.epg_listings)
      ? data.epg_listings
      : Array.isArray(data)
      ? data
      : [];
    return list.map((e) => ({
      id: String(e.id ?? ""),
      title: e.title ? decode(e.title) : "",
      description: e.description ? decode(e.description) : "",
      start: e.start || "",
      end: e.end || "",
      startTimestamp: Number(e.start_timestamp ?? 0),
      stopTimestamp: Number(e.stop_timestamp ?? 0),
      nowPlaying: Number(e.now_playing ?? 0) === 1,
    }));
  },

  buildSeriesEpisodeUrl(p: XtreamProfile, episodeId: string | number, ext: string) {
    const base = p.serverUrl.replace(/\/$/, "");
    return `${base}/series/${p.username}/${p.password}/${episodeId}.${ext}`;
  },
};
