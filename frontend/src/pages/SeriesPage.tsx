import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, Clapperboard, ChevronDown, RefreshCw, Loader2, X, Play, Loader } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageLayout from "@/components/PageLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { useProfiles } from "@/hooks/useProfiles";
import { useSeries, useReloadPlaylist } from "@/hooks/useXtreamData";
import { useFavorites } from "@/hooks/useFavorites";
import { xtreamApi } from "@/lib/xtream";
import type { Series } from "@/types/xtream";
import { Link } from "react-router-dom";

const SeriesPage = () => {
  const { activeProfile } = useProfiles();
  const { data: series = [], isLoading, error } = useSeries(activeProfile);
  const reload = useReloadPlaylist();
  const { isFavorite, toggle } = useFavorites(activeProfile?.id, "series");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openSeries, setOpenSeries] = useState<Series | null>(null);
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);

  const categories = ["All", ...Array.from(new Set(series.map((s) => s.category)))];

  const filtered = series.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "All" || s.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const seriesInfoQuery = useQuery({
    queryKey: ["xtream", activeProfile?.id, "series-info", openSeries?.id],
    queryFn: () => xtreamApi.getSeriesInfo(activeProfile!, openSeries!.id),
    enabled: !!openSeries && !!activeProfile,
  });

  if (!activeProfile) {
    return (
      <PageLayout title="SERIES">
        <div className="h-full flex items-center justify-center">
          <div className="glass-card rounded-2xl p-6 text-center max-w-sm">
            <p className="text-foreground text-sm mb-3">No active server.</p>
            <Link to="/account" className="text-primary text-xs underline">Add a profile</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const episodesBySeason: Record<string, any[]> = seriesInfoQuery.data?.episodes ?? {};

  return (
    <PageLayout title="SERIES">
      <div className="flex flex-col gap-3 h-full">
        <div className="flex gap-2">
          <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 w-40">
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent text-foreground text-xs outline-none flex-1">
              {categories.map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
            </select>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search series..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-foreground placeholder:text-muted-foreground text-xs outline-none flex-1" />
          </div>
          <button onClick={() => reload(activeProfile.id)} className="glass-card rounded-xl px-3 py-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
        {error && <p className="text-destructive text-xs">Failed to load series.</p>}

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-2">
          {filtered.slice(0, 300).map((s) => (
            <div
              key={s.id}
              onClick={() => setOpenSeries(s)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "260px" }}
              className="glass-card rounded-xl overflow-hidden cursor-pointer group hover:border-primary/30 transition-all"
            >
              <div className="aspect-[2/3] bg-muted/20 flex items-center justify-center relative overflow-hidden">
                {s.posterUrl ? (
                  <img src={s.posterUrl} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <Clapperboard className="w-8 h-8 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                )}
                <button onClick={(e) => { e.stopPropagation(); toggle(s.id); }} className="absolute top-2 right-2 z-10">
                  <Star className={`w-4 h-4 ${isFavorite(s.id) ? "text-primary fill-primary" : "text-muted-foreground/80"}`} />
                </button>
                {s.rating && (
                  <span className="absolute top-2 left-2 text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded">★ {s.rating}</span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-foreground text-xs font-medium truncate">{s.name}</p>
                <span className="text-muted-foreground text-[10px] truncate block">{s.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Series detail modal */}
      <AnimatePresence>
        {openSeries && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setOpenSeries(null); setEpisodeUrl(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col">
              <button onClick={() => { setOpenSeries(null); setEpisodeUrl(null); }} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full glass flex items-center justify-center">
                <X className="w-4 h-4 text-foreground" />
              </button>

              {episodeUrl ? (
                <div className="aspect-video bg-black">
                  <VideoPlayer src={episodeUrl} />
                </div>
              ) : (
                <div className="p-5 flex gap-4 border-b border-border">
                  {openSeries.posterUrl && (
                    <img src={openSeries.posterUrl} alt="" className="w-24 h-36 object-cover rounded-lg" />
                  )}
                  <div>
                    <h2 className="text-foreground text-lg font-medium">{openSeries.name}</h2>
                    <p className="text-muted-foreground text-xs mb-1">{openSeries.category}</p>
                    {openSeries.rating && <p className="text-primary text-xs">★ {openSeries.rating}</p>}
                    {openSeries.plot && <p className="text-muted-foreground text-xs mt-2 line-clamp-3">{openSeries.plot}</p>}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {seriesInfoQuery.isLoading && (
                  <div className="flex justify-center py-6"><Loader className="w-5 h-5 animate-spin text-primary" /></div>
                )}
                {Object.entries(episodesBySeason).map(([season, eps]) => (
                  <div key={season}>
                    <h3 className="text-foreground text-sm font-medium mb-2">Season {season}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {eps.map((ep: any) => (
                        <button
                          key={ep.id}
                          onClick={() => setEpisodeUrl(xtreamApi.buildSeriesEpisodeUrl(activeProfile, ep.id, ep.container_extension || "mp4"))}
                          className="flex items-center gap-2 glass rounded-lg px-3 py-2 hover:border-primary/30 transition-all text-left"
                        >
                          <Play className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-foreground text-xs truncate">E{ep.episode_num}: {ep.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default SeriesPage;
