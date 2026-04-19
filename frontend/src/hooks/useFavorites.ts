import { useState, useEffect, useCallback } from "react";

type Kind = "live" | "movie" | "series";

const key = (profileId: string, kind: Kind) => `nadibox_fav_${profileId}_${kind}`;

export const useFavorites = (profileId: string | null | undefined, kind: Kind) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) return setFavorites(new Set());
    const saved = localStorage.getItem(key(profileId, kind));
    setFavorites(saved ? new Set(JSON.parse(saved)) : new Set());
  }, [profileId, kind]);

  // IMPORTANT: `toggle` and `isFavorite` MUST have stable references —
  // they are consumed inside useMemo dependency arrays (e.g. the
  // `filtered` list in LiveTV/Movies/SeriesPage). A fresh function on
  // every render would invalidate the memo on every render and cause
  // the entire 300-item list to re-render constantly while scrolling,
  // which (combined with framer-motion per item) was stressing Chrome
  // enough to trigger renderer crashes / page reloads on long lists.
  const toggle = useCallback(
    (id: string) => {
      if (!profileId) return;
      setFavorites((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        localStorage.setItem(key(profileId, kind), JSON.stringify([...next]));
        return next;
      });
    },
    [profileId, kind]
  );

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites]
  );

  return { favorites, toggle, isFavorite };
};
