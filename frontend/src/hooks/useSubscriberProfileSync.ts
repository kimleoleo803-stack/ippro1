/**
 * Auto-syncs the logged-in subscriber's Xtream credentials into the local
 * "profile" store the rest of the app already uses (so LiveTV / Movies /
 * Series pages find an active profile without the user having to add one
 * manually). Resolved creds come from `/api/subscription/status` and may
 * be either the shared (global) credentials configured by admin, or the
 * subscriber's own per-user credentials.
 */
import { useEffect, useRef } from "react";

import { useProfiles } from "@/hooks/useProfiles";
import { usePrefetchProfile } from "@/hooks/useXtreamData";
import { apiSubscriptionStatus, getToken } from "@/lib/nadiAuth";
import type { XtreamProfile } from "@/types/xtream";
import { toast } from "sonner";

const MANAGED_ID_KEY = "nadibox_managed_profile_id";

export const getManagedProfileId = () => {
  try {
    return localStorage.getItem(MANAGED_ID_KEY);
  } catch {
    return null;
  }
};

export const clearManagedProfile = () => {
  try {
    const managedId = localStorage.getItem(MANAGED_ID_KEY);
    if (managedId) {
      const saved = JSON.parse(localStorage.getItem("nadibox_profiles") || "[]") as XtreamProfile[];
      const next = saved.filter((p) => p.id !== managedId);
      localStorage.setItem("nadibox_profiles", JSON.stringify(next));
      const active = localStorage.getItem("nadibox_active_profile");
      if (active === managedId) localStorage.removeItem("nadibox_active_profile");
      localStorage.removeItem(MANAGED_ID_KEY);
      window.dispatchEvent(new Event("nadibox-profiles-changed"));
    }
  } catch {
    /* noop */
  }
};

export const useSubscriberProfileSync = (user: { id: string; role: string } | null) => {
  const { profiles, addProfile, updateProfile, setActiveProfileId } = useProfiles();
  const prefetch = usePrefetchProfile();
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Only sync for authenticated subscribers with a valid token
    if (!user || user.role !== "user" || !getToken()) return;

    // Avoid re-running if we've already synced this user in this browser session
    if (lastSyncedUserId.current === user.id) return;

    let cancelled = false;

    (async () => {
      try {
        const status = await apiSubscriptionStatus();
        if (cancelled) return;

        if (status.user.is_expired) {
          // If expired: purge managed profile so LiveTV/etc don't try to stream.
          clearManagedProfile();
          return;
        }

        const xt = status.xtream;
        if (!xt.server || !xt.username || !xt.password) {
          // Admin hasn't configured shared creds and user doesn't have own creds
          clearManagedProfile();
          toast.message(
            "Your subscription is active but no Xtream server is configured yet. Please contact your admin.",
          );
          return;
        }

        const draft: Omit<XtreamProfile, "id"> = {
          name: `${status.user.username} (NADIBOX)`,
          kind: "xtream",
          serverUrl: xt.server,
          username: xt.username,
          password: xt.password,
        };

        // NOTE: We intentionally skip the authenticate-probe here. If the
        // server is unreachable or creds are wrong, the per-page queries
        // (LiveTV / Movies / Series) will surface their own error — but we
        // still want the profile itself to be created so the user sees the
        // subscription-connected state and not "No active server."

        const managedId = getManagedProfileId();
        const existing = managedId ? profiles.find((p) => p.id === managedId) : undefined;

        let activeProfile: XtreamProfile;
        if (existing) {
          updateProfile(existing.id, draft);
          activeProfile = { ...existing, ...draft };
          setActiveProfileId(existing.id);
        } else {
          const created = addProfile(draft);
          try {
            localStorage.setItem(MANAGED_ID_KEY, created.id);
          } catch {
            /* noop */
          }
          setActiveProfileId(created.id);
          activeProfile = created;
        }

        lastSyncedUserId.current = user.id;

        // Best-effort prefetch of channels/movies/series
        try {
          const all = await prefetch(activeProfile);
          toast.success(
            `Connected — ${all.channels.length} channels • ${all.movies.length} movies • ${all.series.length} series`,
          );
        } catch {
          /* ignore prefetch errors — user can still browse */
        }
      } catch (e) {
        /* silent — no crash */
        // eslint-disable-next-line no-console
        console.warn("subscriber profile sync failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);
};
