import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Server,
  Loader2,
  Smartphone,
  Monitor,
  ExternalLink,
  Download,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/PageLayout";
import AddServerDialog from "@/components/AddServerDialog";
import { useProfiles } from "@/hooks/useProfiles";
import { useReloadPlaylist } from "@/hooks/useXtreamData";
import { useConnectProfile } from "@/hooks/useConnectProfile";
import { xtreamApi } from "@/lib/xtream";
import { UA_PRESETS, getUserAgent, setUserAgent } from "@/lib/userAgent";
import { getPlaybackMode, setPlaybackMode } from "@/lib/playbackMode";
import type { PlaybackMode } from "@/lib/playbackMode";
import {
  EXTERNAL_APPS,
  getExternalAppId,
  setExternalAppId,
} from "@/lib/externalApp";
import type { XtreamProfile } from "@/types/xtream";
import { useNavigate } from "react-router-dom";

const Account = () => {
  const { t } = useTranslation();
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    updateProfile,
    removeProfile,
  } = useProfiles();
  const reload = useReloadPlaylist();
  const connect = useConnectProfile();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<XtreamProfile>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [ua, setUa] = useState<string>(getUserAgent());
  const [pbMode, setPbMode] = useState<PlaybackMode>(getPlaybackMode());
  const [extAppId, setExtAppId] = useState<string>(getExternalAppId());
  const nav = useNavigate();

  const startEdit = (p: XtreamProfile) => {
    setEditing(p.id);
    setEditForm({
      name: p.name,
      serverUrl: p.serverUrl,
      username: p.username,
      password: p.password,
    });
  };

  const saveEdit = (id: string) => {
    updateProfile(id, editForm);
    setEditing(null);
    toast.success(t("account.profileUpdated"));
  };

  const handleReload = (id: string) => {
    reload(id);
    toast.success(t("account.playlistReloaded"));
  };

  const handleTest = async (p: XtreamProfile) => {
    setTestingId(p.id);
    try {
      await xtreamApi.authenticate(p);
      toast.success(t("account.connectedSuccess", { name: p.name }));
    } catch (e: any) {
      toast.error(
        t("account.connectFailed", {
          name: p.name,
          error: e?.message ?? "Failed to connect",
        }),
      );
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t("account.confirmDelete"))) {
      removeProfile(id);
      toast.success(t("account.profileRemoved"));
    }
  };

  return (
    <PageLayout title={t("account.title")}>
      <div className="h-full flex flex-col gap-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {t("account.profilesCount", { count: profiles.length })}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="glass-card rounded-xl px-4 py-2 flex items-center gap-2 hover:border-primary/40 transition-all"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-foreground text-xs font-medium">
              {t("account.addServer")}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* ─── Device Pairing ─── */}
          <div
            className="glass-card rounded-2xl p-4"
            data-testid="device-pairing-section"
          >
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-medium">
                {t("account.devicePairing")}
              </p>
            </div>
            <p className="text-muted-foreground text-[11px] mb-3">
              {t("account.devicePairingDesc")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => nav("/activate")}
                className="flex-1 text-[12px] px-3 py-2 rounded-lg glass hover:border-primary/40 text-foreground flex items-center justify-center gap-2 transition-all"
                data-testid="go-activate-btn"
              >
                <Smartphone className="w-3.5 h-3.5" /> {t("account.imOnDevice")}
              </button>
              <button
                onClick={() => nav("/pair")}
                className="flex-1 text-[12px] px-3 py-2 rounded-lg glass hover:border-primary/40 text-foreground flex items-center justify-center gap-2 transition-all"
                data-testid="go-pair-btn"
              >
                <Link2 className="w-3.5 h-3.5" /> {t("account.iHavePin")}
              </button>
            </div>
          </div>

          {/* ─── Playback Mode ─── */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-medium">
                {t("account.playbackMode")}
              </p>
            </div>
            <p className="text-muted-foreground text-[11px] mb-3">
              {t("account.playbackModeDesc")}
            </p>
            <div className="flex gap-2">
              {(["internal", "external"] as PlaybackMode[]).map((m) => {
                const active = pbMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setPlaybackMode(m);
                      setPbMode(m);
                      toast.success(
                        m === "external"
                          ? t("account.externalOn")
                          : t("account.internalOn"),
                      );
                    }}
                    className={`flex-1 text-[12px] px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                      active
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "glass hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {m === "external" ? (
                      <ExternalLink className="w-3.5 h-3.5" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5" />
                    )}
                    {m === "external"
                      ? t("account.external")
                      : t("account.internal")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── External Player picker ─── */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-medium">
                {t("account.externalPlayer")}
              </p>
            </div>
            <p className="text-muted-foreground text-[11px] mb-3">
              {t("account.externalPlayerDesc")}
            </p>

            <div className="space-y-2">
              {EXTERNAL_APPS.map((app) => {
                const active = extAppId === app.id;
                return (
                  <div
                    key={app.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      active
                        ? "bg-primary/10 border-primary/40"
                        : "glass border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setExternalAppId(app.id);
                        setExtAppId(app.id);
                        toast.success(
                          t("account.externalPlayerSet", { name: app.label }),
                        );
                      }}
                      className="flex-1 text-start"
                    >
                      <p
                        className={`text-xs font-medium ${
                          active ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {app.label}{" "}
                        {app.id === "vidoplay" && (
                          <span className="text-[9px] text-primary ms-1 align-middle">
                            {t("account.default")}
                          </span>
                        )}
                      </p>
                      {app.hint && (
                        <p className="text-muted-foreground text-[10px] mt-0.5">
                          {app.hint}
                        </p>
                      )}
                    </button>

                    {app.playStoreUrl && (
                      <a
                        href={app.playStoreUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass hover:border-primary/40 text-foreground"
                        title={t("account.install")}
                      >
                        <Download className="w-3 h-3" /> {t("account.install")}
                      </a>
                    )}
                    {active && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Player Identity (User-Agent) ─── */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-medium">
                {t("account.playerIdentity")}
              </p>
            </div>
            <p className="text-muted-foreground text-[11px] mb-3">
              {t("account.playerIdentityDesc")}
            </p>
            <div className="flex flex-wrap gap-2">
              {UA_PRESETS.map((preset) => {
                const active = ua === preset.value;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setUserAgent(preset.value);
                      setUa(preset.value);
                      toast.success(
                        t("account.userAgentSet", { name: preset.label }),
                      );
                    }}
                    className={`text-[11px] px-3 py-1.5 rounded-lg transition-all ${
                      active
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "glass hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[10px] mt-2 truncate">
              {t("account.sending")}: <span className="text-foreground/70">{ua}</span>
            </p>
          </div>

          {/* ─── Profiles ─── */}
          {profiles.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Server className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground text-sm mb-1">
                {t("account.noProfiles")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("account.noProfilesDesc")}
              </p>
            </div>
          )}

          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const isEditing = editing === p.id;

            return (
              <motion.div
                key={p.id}
                layout
                className={`glass-card rounded-2xl p-4 border ${
                  isActive ? "border-primary/40" : "border-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full glass flex items-center justify-center shrink-0 ${
                      isActive ? "border border-primary" : ""
                    }`}
                  >
                    <User
                      className={`w-5 h-5 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {isEditing ? (
                      <>
                        {[
                          { key: "name", label: "profileName" },
                          { key: "serverUrl", label: "serverUrl" },
                          { key: "username", label: "username" },
                          { key: "password", label: "password" },
                        ].map(({ key, label }) => (
                          <input
                            key={key}
                            value={(editForm as any)[key] ?? ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                [key]: e.target.value,
                              })
                            }
                            placeholder={
                              label === "profileName"
                                ? t("account.profileName")
                                : label === "serverUrl"
                                  ? t("account.serverUrl")
                                  : label === "username"
                                    ? t("common.username")
                                    : t("common.password")
                            }
                            className="w-full glass-input rounded-lg px-3 py-2 text-foreground text-xs outline-none"
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        <p className="text-foreground text-sm font-medium truncate">
                          {p.name}
                        </p>
                        <p className="text-muted-foreground text-xs truncate">
                          {p.serverUrl}
                        </p>
                        <p className="text-muted-foreground text-[10px] truncate">
                          {t("account.user")}: {p.username}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(p.id)}
                          className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-primary/40"
                        >
                          <Check className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="w-8 h-8 rounded-lg glass flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(p)}
                          className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-primary/40"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-destructive/40"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                    <button
                      onClick={() => setActiveProfileId(p.id)}
                      disabled={isActive}
                      className={`text-[11px] px-3 py-1.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "glass hover:border-primary/40 text-foreground"
                      }`}
                    >
                      {isActive ? t("common.active") : t("common.setActive")}
                    </button>
                    <button
                      onClick={() => handleTest(p)}
                      disabled={testingId === p.id}
                      className="text-[11px] px-3 py-1.5 rounded-lg glass hover:border-primary/40 text-foreground flex items-center gap-1.5"
                    >
                      {testingId === p.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : null}{" "}
                      {t("common.test")}
                    </button>
                    <button
                      onClick={() => handleReload(p.id)}
                      className="text-[11px] px-3 py-1.5 rounded-lg glass hover:border-primary/40 text-foreground flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> {t("account.reloadPlaylist")}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <AddServerDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={async (data) => {
          const created = await connect(data);
          if (created) setShowAdd(false);
        }}
      />
    </PageLayout>
  );
};

export default Account;
