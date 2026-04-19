import { useQuery, useQueryClient } from "@tanstack/react-query";
import { xtreamApi } from "@/lib/xtream";
import { m3uApi } from "@/lib/m3u";
import type { XtreamProfile, Channel, Movie, Series } from "@/types/xtream";

const STALE = 1000 * 60 * 10;

const isM3U = (p: XtreamProfile) => p.kind === "m3u";

const fetchM3UAll = async (p: XtreamProfile) => {
  const entries = await m3uApi.fetchPlaylist(p.m3uUrl!);
  return m3uApi.classify(entries);
};

export const useLiveChannels = (profile: XtreamProfile | null) =>
  useQuery<Channel[]>({
    queryKey: ["xtream", profile?.id, "live"],
    queryFn: async () => {
      if (!profile) return [];
      if (isM3U(profile)) return (await fetchM3UAll(profile)).channels;
      return xtreamApi.getLiveStreams(profile);
    },
    enabled: !!profile,
    staleTime: STALE,
  });

export const useMovies = (profile: XtreamProfile | null) =>
  useQuery<Movie[]>({
    queryKey: ["xtream", profile?.id, "movies"],
    queryFn: async () => {
      if (!profile) return [];
      if (isM3U(profile)) return (await fetchM3UAll(profile)).movies;
      return xtreamApi.getMovies(profile);
    },
    enabled: !!profile,
    staleTime: STALE,
  });

export const useSeries = (profile: XtreamProfile | null) =>
  useQuery<Series[]>({
    queryKey: ["xtream", profile?.id, "series"],
    queryFn: async () => {
      if (!profile) return [];
      if (isM3U(profile)) return (await fetchM3UAll(profile)).series;
      return xtreamApi.getSeries(profile);
    },
    enabled: !!profile,
    staleTime: STALE,
  });

export const useReloadPlaylist = () => {
  const qc = useQueryClient();
  return (profileId: string) => qc.invalidateQueries({ queryKey: ["xtream", profileId] });
};

export interface EpgEntry {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  startTimestamp: number;
  stopTimestamp: number;
  nowPlaying: boolean;
}

export const useShortEpg = (
  profile: XtreamProfile | null,
  streamId: string | null | undefined
) =>
  useQuery<EpgEntry[]>({
    queryKey: ["xtream", profile?.id, "epg", streamId],
    queryFn: async () => {
      if (!profile || !streamId || isM3U(profile)) return [];
      try {
        return await xtreamApi.getShortEpg(profile, streamId, 6);
      } catch {
        return [];
      }
    },
    enabled: !!profile && !!streamId && !isM3U(profile as XtreamProfile),
    staleTime: 1000 * 60 * 5,
  });

export const usePrefetchProfile = () => {
  const qc = useQueryClient();
  return async (profile: XtreamProfile) => {
    if (isM3U(profile)) {
      const all = await fetchM3UAll(profile);
      qc.setQueryData(["xtream", profile.id, "live"], all.channels);
      qc.setQueryData(["xtream", profile.id, "movies"], all.movies);
      qc.setQueryData(["xtream", profile.id, "series"], all.series);
      return all;
    }
    const [live, movies, series] = await Promise.all([
      xtreamApi.getLiveStreams(profile),
      xtreamApi.getMovies(profile),
      xtreamApi.getSeries(profile),
    ]);
    qc.setQueryData(["xtream", profile.id, "live"], live);
    qc.setQueryData(["xtream", profile.id, "movies"], movies);
    qc.setQueryData(["xtream", profile.id, "series"], series);
    return { channels: live, movies, series };
  };
};
