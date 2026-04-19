import type { Channel, Movie, Series } from "@/types/xtream";

interface M3UEntry {
  name: string;
  url: string;
  logo?: string;
  group: string;
  tvgId?: string;
}

export const parseM3U = (text: string): M3UEntry[] => {
  const lines = text.split(/\r?\n/);
  const entries: M3UEntry[] = [];
  let current: Partial<M3UEntry> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXTINF")) {
      const attrs: Record<string, string> = {};
      const attrRegex = /([\w-]+)="([^"]*)"/g;
      let m;
      while ((m = attrRegex.exec(line)) !== null) attrs[m[1]] = m[2];
      const commaIdx = line.lastIndexOf(",");
      const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "Unknown";
      current = {
        name,
        logo: attrs["tvg-logo"],
        group: attrs["group-title"] || "Uncategorized",
        tvgId: attrs["tvg-id"],
      };
    } else if (line && !line.startsWith("#") && current) {
      current.url = line;
      entries.push(current as M3UEntry);
      current = null;
    }
  }
  return entries;
};

const isMovieGroup = (g: string) => /movie|vod|film|cinema|películas|peliculas/i.test(g);
const isSeriesGroup = (g: string) => /serie|series|tv show|shows/i.test(g);
const isVideoExt = (url: string) => /\.(mp4|mkv|avi|mov|webm|ts)(\?|$)/i.test(url);

export const m3uApi = {
  async fetchPlaylist(url: string) {
    const { proxyFetch } = await import("@/lib/proxy");
    const text = await proxyFetch<string>(url, "text");
    return parseM3U(text);
  },

  classify(entries: M3UEntry[]): { channels: Channel[]; movies: Movie[]; series: Series[] } {
    const channels: Channel[] = [];
    const movies: Movie[] = [];
    const seriesMap = new Map<string, Series>();

    entries.forEach((e, i) => {
      const id = `${i}`;
      if (isSeriesGroup(e.group) && isVideoExt(e.url)) {
        // Group series episodes by name (strip S01E01 suffix)
        const baseName = e.name.replace(/\s*S\d+\s*E\d+.*$/i, "").trim() || e.name;
        if (!seriesMap.has(baseName)) {
          seriesMap.set(baseName, {
            id: `s_${seriesMap.size}`,
            name: baseName,
            category: e.group,
            categoryId: e.group,
            posterUrl: e.logo,
          });
        }
      } else if (isMovieGroup(e.group) || (isVideoExt(e.url) && !e.url.includes(".m3u8"))) {
        movies.push({
          id,
          name: e.name,
          category: e.group,
          categoryId: e.group,
          streamUrl: e.url,
          posterUrl: e.logo,
        });
      } else {
        channels.push({
          id,
          name: e.name,
          category: e.group,
          categoryId: e.group,
          streamUrl: e.url,
          logoUrl: e.logo,
          epgChannelId: e.tvgId,
        });
      }
    });

    return { channels, movies, series: [...seriesMap.values()] };
  },
};
