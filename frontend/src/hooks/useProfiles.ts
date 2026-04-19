import { useState, useEffect, useCallback } from "react";
import type { XtreamProfile } from "@/types/xtream";

const STORAGE_KEY = "nadibox_profiles";
const ACTIVE_KEY = "nadibox_active_profile";
const EVENT = "nadibox-profiles-changed";

const readProfiles = (): XtreamProfile[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};
const readActive = () => localStorage.getItem(ACTIVE_KEY);

const broadcast = () => window.dispatchEvent(new Event(EVENT));

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<XtreamProfile[]>(readProfiles);
  const [activeProfileId, setActiveIdState] = useState<string | null>(readActive);

  useEffect(() => {
    const sync = () => {
      setProfiles(readProfiles());
      setActiveIdState(readActive());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = (next: XtreamProfile[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setProfiles(next);
    broadcast();
  };

  const setActiveProfileId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
    setActiveIdState(id);
    broadcast();
  }, []);

  const addProfile = (profile: Omit<XtreamProfile, "id">) => {
    const newProfile = { ...profile, id: crypto.randomUUID() };
    const next = [...readProfiles(), newProfile];
    persist(next);
    if (!readActive()) setActiveProfileId(newProfile.id);
    return newProfile;
  };

  const updateProfile = (id: string, updates: Partial<Omit<XtreamProfile, "id">>) => {
    const next = readProfiles().map((p) => (p.id === id ? { ...p, ...updates } : p));
    persist(next);
  };

  const removeProfile = (id: string) => {
    const next = readProfiles().filter((p) => p.id !== id);
    persist(next);
    if (readActive() === id) setActiveProfileId(next[0]?.id ?? null);
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  return { profiles, activeProfile, activeProfileId, setActiveProfileId, addProfile, updateProfile, removeProfile };
};
