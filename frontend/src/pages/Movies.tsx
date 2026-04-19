import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, Play, ChevronDown, RefreshCw, Loader2, X } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { useProfiles } from "@/hooks/useProfiles";
import { useMovies, useReloadPlaylist } from "@/hooks/useXtreamData";
import { useFavorites } from "@/hooks/useFavorites";
import type { Movie } from "@/types/xtream";
import { Link } from "react-router-dom";

const Movies = () => {
  const { activeProfile } = useProfiles();
  const { data: movies = [], isLoading, error } = useMovies(activeProfile);
  const reload = useReloadPlaylist();
  const { isFavorite, toggle } = useFavorites(activeProfile?.id, "movie");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [playing, setPlaying] = useState<Movie | null>(null);

  const categories = ["All", ...Array.from(new Set(movies.map((m) => m.category)))];

  const filtered = movies.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "All" || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  if (!activeProfile) {
    return (
      <PageLayout title="MOVIES">
        <div className="h-full flex items-center justify-center">
          <div className="glass-card rounded-2xl p-6 text-center max-w-sm">
            <p className="text-foreground text-sm mb-3">No active server.</p>
            <Link to="/account" className="text-primary text-xs underline">Add a profile</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="MOVIES">
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
            <input type="text" placeholder="Search movies..." value={search} onChange={(e) => setSearch(e.target.value)}
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
        {error && <p className="text-destructive text-xs">Failed to load movies.</p>}

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-2">
          {filtered.slice(0, 300).map((movie) => (
            <div
              key={movie.id}
              onClick={() => setPlaying(movie)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "260px" }}
              className="glass-card rounded-xl overflow-hidden cursor-pointer group hover:border-primary/30 transition-all"
            >
              <div className="aspect-[2/3] bg-muted/20 flex items-center justify-center relative overflow-hidden">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.name} loading="lazy" decoding="async" className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <Play className="w-8 h-8 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                )}
                <button onClick={(e) => { e.stopPropagation(); toggle(movie.id); }} className="absolute top-2 right-2 z-10">
                  <Star className={`w-4 h-4 ${isFavorite(movie.id) ? "text-primary fill-primary" : "text-muted-foreground/80"}`} />
                </button>
                {movie.rating && (
                  <span className="absolute top-2 left-2 text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded">★ {movie.rating}</span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-foreground text-xs font-medium truncate">{movie.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground text-[10px] truncate">{movie.category}</span>
                  {movie.year && <span className="text-muted-foreground text-[10px]">{movie.year}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {playing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative w-full max-w-4xl glass-card rounded-2xl overflow-hidden">
              <button onClick={() => setPlaying(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full glass flex items-center justify-center">
                <X className="w-4 h-4 text-foreground" />
              </button>
              <div className="aspect-video bg-black">
                <VideoPlayer src={playing.streamUrl} poster={playing.posterUrl} />
              </div>
              <div className="p-4">
                <p className="text-foreground text-sm font-medium">{playing.name}</p>
                <p className="text-muted-foreground text-xs">{playing.category} {playing.year && `• ${playing.year}`}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default Movies;
