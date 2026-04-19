import { useProfiles } from "@/hooks/useProfiles";
import { usePrefetchProfile } from "@/hooks/useXtreamData";
import { xtreamApi } from "@/lib/xtream";
import { m3uApi } from "@/lib/m3u";
import { toast } from "sonner";
import type { AddServerData } from "@/components/AddServerDialog";
import type { XtreamProfile } from "@/types/xtream";

export const useConnectProfile = () => {
  const { addProfile, setActiveProfileId } = useProfiles();
  const prefetch = usePrefetchProfile();

  return async (data: AddServerData): Promise<XtreamProfile | null> => {
    const loadingId = toast.loading(`Connecting to ${data.name}...`);
    try {
      const profile: Omit<XtreamProfile, "id"> = {
        name: data.name,
        kind: data.kind,
        serverUrl: data.serverUrl,
        username: data.username,
        password: data.password,
        m3uUrl: data.m3uUrl,
      };

      // Validate
      if (data.kind === "xtream") {
        await xtreamApi.authenticate(profile as XtreamProfile);
      } else {
        const entries = await m3uApi.fetchPlaylist(data.m3uUrl!);
        if (!entries.length) throw new Error("Empty playlist");
      }

      const created = addProfile(profile);
      setActiveProfileId(created.id);

      toast.loading("Loading channels, movies & series...", { id: loadingId });
      const all = await prefetch(created);
      toast.success(
        `Connected! ${all.channels.length} channels • ${all.movies.length} movies • ${all.series.length} series`,
        { id: loadingId }
      );
      return created;
    } catch (e: any) {
      toast.error(`Failed: ${e.message || "Connection error"}`, { id: loadingId });
      return null;
    }
  };
};
