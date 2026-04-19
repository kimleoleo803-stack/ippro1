import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Tv,
  LogOut,
  Plus,
  Trash2,
  Save,
  RefreshCcw,
  Calendar,
  MessageCircle,
  Server,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import LanguageSelect from "@/components/LanguageSelect";
import {
  apiCreateUser,
  apiDeleteUser,
  apiGetSettings,
  apiListUsers,
  apiUpdateSettings,
  apiUpdateUser,
  type NadiUser,
  type Settings,
} from "@/lib/nadiAuth";

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<NadiUser[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // New user form
  const [nuUsername, setNuUsername] = useState("");
  const [nuPassword, setNuPassword] = useState("");
  const [nuDays, setNuDays] = useState(30);
  const [nuMode, setNuMode] = useState<"shared" | "own">("shared");
  const [nuServer, setNuServer] = useState("");
  const [nuXUser, setNuXUser] = useState("");
  const [nuXPass, setNuXPass] = useState("");
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/welcome");
      return;
    }
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([apiListUsers(), apiGetSettings()]);
      setUsers(u);
      setSettings(s);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("admin.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuUsername || !nuPassword) return;
    setCreating(true);
    try {
      await apiCreateUser({
        username: nuUsername.trim(),
        password: nuPassword,
        days: nuDays,
        xtream_mode: nuMode,
        xtream_server: nuServer || undefined,
        xtream_username: nuXUser || undefined,
        xtream_password: nuXPass || undefined,
      });
      setNuUsername("");
      setNuPassword("");
      setNuDays(30);
      setNuMode("shared");
      setNuServer("");
      setNuXUser("");
      setNuXPass("");
      showToast(t("admin.userCreated"));
      await refreshAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("admin.opFailed"));
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/welcome");
  };

  return (
    <div
      data-testid="admin-page"
      className="relative min-h-screen w-full overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/nebula-bg.png')" }}
      />
      <div className="absolute inset-0 bg-background/70" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between px-4 sm:px-6 md:px-10 pt-6 gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl glass flex items-center justify-center"
              style={{ border: "1px solid hsla(40, 80%, 55%, 0.4)" }}
            >
              <Tv className="w-5 h-5 text-primary gold-glow" />
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl md:text-2xl tracking-[0.2em] sm:tracking-[0.3em] gold-text">
                {t("admin.title")}
              </h1>
              <p className="text-muted-foreground text-[9px] sm:text-[10px] tracking-[0.3em] uppercase">
                {t("admin.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelect align="right" />
            <button
              onClick={refreshAll}
              data-testid="admin-refresh-btn"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              title={t("common.refresh")}
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              data-testid="admin-logout-btn"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-xs sm:text-sm"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">{t("admin.logout")}</span>
            </button>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-card rounded-full px-5 py-2 text-sm text-primary border border-primary/30"
          >
            {toast}
          </motion.div>
        )}

        <main className="flex-1 px-3 sm:px-4 md:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
          {/* Settings */}
          <SettingsPanel
            settings={settings}
            onSaved={(s) => {
              setSettings(s);
              showToast(t("admin.settingsSaved"));
            }}
          />

          {/* Create user */}
          <section className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-lg tracking-[0.2em] gold-text mb-4">
              {t("admin.createHeading")}
            </h2>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <Input
                label={t("admin.usernameLabel")}
                value={nuUsername}
                onChange={setNuUsername}
                testId="nu-username"
                required
              />
              <Input
                label={t("admin.passwordLabel")}
                value={nuPassword}
                onChange={setNuPassword}
                type="text"
                testId="nu-password"
                required
              />
              <Input
                label={t("admin.daysLabel")}
                value={String(nuDays)}
                onChange={(v) => setNuDays(Math.max(1, parseInt(v || "0") || 1))}
                type="number"
                testId="nu-days"
              />
              <div>
                <label className="text-[11px] text-muted-foreground tracking-[0.2em] uppercase block mb-1">
                  {t("admin.xtreamMode")}
                </label>
                <select
                  value={nuMode}
                  onChange={(e) => setNuMode(e.target.value as "shared" | "own")}
                  data-testid="nu-mode"
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="shared">{t("admin.modeShared")}</option>
                  <option value="own">{t("admin.modeOwn")}</option>
                </select>
              </div>
              {nuMode === "own" && (
                <>
                  <Input
                    label={t("admin.serverUrl")}
                    value={nuServer}
                    onChange={setNuServer}
                    testId="nu-server"
                  />
                  <Input
                    label={t("admin.xtreamUsername")}
                    value={nuXUser}
                    onChange={setNuXUser}
                    testId="nu-xuser"
                  />
                  <Input
                    label={t("admin.xtreamPassword")}
                    value={nuXPass}
                    onChange={setNuXPass}
                    testId="nu-xpass"
                  />
                </>
              )}
              <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  data-testid="nu-submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground font-medium text-sm transition-colors disabled:opacity-60"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {creating ? t("admin.creating") : t("admin.createUser")}
                </button>
              </div>
            </form>
          </section>

          {/* User list */}
          <section className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-lg tracking-[0.2em] gold-text mb-4">
              {t("admin.subscribersHeading", { count: users.length })}
            </h2>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("admin.noSubscribers")}</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onChanged={refreshAll}
                    onToast={showToast}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

// ---- Sub-components ----

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  testId,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  testId?: string;
  required?: boolean;
}) => (
  <div>
    <label className="text-[11px] text-muted-foreground tracking-[0.2em] uppercase block mb-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      required={required}
      className="w-full glass-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
    />
  </div>
);

const SettingsPanel = ({
  settings,
  onSaved,
}: {
  settings: Settings | null;
  onSaved: (s: Settings) => void;
}) => {
  const { t } = useTranslation();
  const [wa, setWa] = useState(settings?.whatsapp_number ?? "");
  const [ss, setSs] = useState(settings?.shared_xtream_server ?? "");
  const [su, setSu] = useState(settings?.shared_xtream_username ?? "");
  const [sp, setSp] = useState(settings?.shared_xtream_password ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWa(settings?.whatsapp_number ?? "");
    setSs(settings?.shared_xtream_server ?? "");
    setSu(settings?.shared_xtream_username ?? "");
    setSp(settings?.shared_xtream_password ?? "");
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const next = await apiUpdateSettings({
        whatsapp_number: wa,
        shared_xtream_server: ss,
        shared_xtream_username: su,
        shared_xtream_password: sp,
      });
      onSaved(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="font-display text-lg tracking-[0.2em] gold-text mb-4">
        {t("admin.settingsHeading")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label={t("admin.whatsapp")} value={wa} onChange={setWa} testId="set-whatsapp" />
        <Input label={t("admin.sharedServer")} value={ss} onChange={setSs} testId="set-shared-server" />
        <Input label={t("admin.sharedUsername")} value={su} onChange={setSu} testId="set-shared-user" />
        <Input label={t("admin.sharedPassword")} value={sp} onChange={setSp} testId="set-shared-pass" />
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={save}
          disabled={saving}
          data-testid="set-save"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground font-medium text-sm transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t("common.saving") : t("admin.saveSettings")}
        </button>
      </div>
    </section>
  );
};

const UserRow = ({
  user,
  onChanged,
  onToast,
}: {
  user: NadiUser;
  onChanged: () => void;
  onToast: (m: string) => void;
}) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [pwd, setPwd] = useState("");
  const [mode, setMode] = useState<"shared" | "own">(user.xtream_mode || "shared");
  const [xs, setXs] = useState(user.xtream_server || "");
  const [xu, setXu] = useState(user.xtream_username || "");
  const [xp, setXp] = useState(user.xtream_password || "");

  const extendDays = async (days: number) => {
    setBusy(true);
    try {
      await apiUpdateUser(user.id, { extend_days: days });
      onToast(days > 0 ? t("admin.dayAdded", { count: days }) : t("admin.dayRemoved", { count: -days }));
      onChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : t("admin.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!pwd) return;
    setBusy(true);
    try {
      await apiUpdateUser(user.id, { password: pwd });
      onToast(t("admin.passwordUpdated"));
      setPwd("");
      onChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : t("admin.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  const saveXtream = async () => {
    setBusy(true);
    try {
      await apiUpdateUser(user.id, {
        xtream_mode: mode,
        xtream_server: xs,
        xtream_username: xu,
        xtream_password: xp,
      });
      onToast(t("admin.xtreamSaved"));
      onChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : t("admin.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("admin.confirmDeleteUser", { username: user.username }))) return;
    setBusy(true);
    try {
      await apiDeleteUser(user.id);
      onToast(t("admin.userDeleted"));
      onChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : t("admin.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  const statusColor = user.is_expired
    ? "text-destructive"
    : (user.days_remaining ?? 0) <= 3
      ? "text-amber-400"
      : "text-primary";

  return (
    <div className="rounded-xl border border-border/40 glass p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <Tv className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p data-testid={`user-${user.username}-name`} className="text-foreground font-medium">
              {user.username}
            </p>
            <p className="text-muted-foreground text-xs flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {user.expiry_at ? new Date(user.expiry_at).toLocaleDateString() : t("admin.noExpiry")}
              <span className={`ms-2 ${statusColor}`}>
                {user.is_expired
                  ? t("admin.expired")
                  : user.days_remaining != null
                    ? t("admin.daysLeft", { count: user.days_remaining })
                    : ""}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => extendDays(30)}
            disabled={busy}
            data-testid={`user-${user.username}-add30`}
            className="px-3 py-1.5 rounded-lg glass text-xs text-primary hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            {t("admin.addDays", { n: 30 })}
          </button>
          <button
            onClick={() => extendDays(7)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg glass text-xs text-primary hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            {t("admin.addDays", { n: 7 })}
          </button>
          <button
            onClick={() => extendDays(-7)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg glass text-xs text-muted-foreground hover:border-destructive/40 transition-colors disabled:opacity-60"
          >
            {t("admin.subDays", { n: 7 })}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            data-testid={`user-${user.username}-delete`}
            className="px-3 py-1.5 rounded-lg glass text-xs text-destructive hover:border-destructive/40 transition-colors disabled:opacity-60 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> {t("admin.deleteUser")}
          </button>
        </div>
      </div>

      {/* Advanced: xtream + password */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground tracking-[0.2em] uppercase hover:text-primary">
          {t("admin.advanced")}
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground tracking-[0.2em] uppercase block mb-1">
              {t("admin.xtreamMode")}
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "shared" | "own")}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="shared">{t("admin.modeShared")}</option>
              <option value="own">{t("admin.modeOwn")}</option>
            </select>
          </div>
          <Input label={t("admin.server")} value={xs} onChange={setXs} />
          <Input label={t("admin.xtUser")} value={xu} onChange={setXu} />
          <Input label={t("admin.xtPass")} value={xp} onChange={setXp} />
          <div className="lg:col-span-4 flex gap-2 justify-end">
            <button
              onClick={saveXtream}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg glass text-xs text-primary hover:border-primary/40 transition-colors disabled:opacity-60"
            >
              <Server className="w-3 h-3" /> {t("admin.saveXtream")}
            </button>
          </div>
          <div className="lg:col-span-4 flex items-center gap-2">
            <input
              type="text"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder={t("admin.newPassword")}
              className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none"
            />
            <button
              onClick={savePassword}
              disabled={busy || !pwd}
              className="px-4 py-2 rounded-lg glass text-xs text-primary hover:border-primary/40 transition-colors disabled:opacity-60"
            >
              {t("admin.updatePassword")}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
};

// Unused lucide import — keep for potential future use (lint appeasement)
export const _unused = MessageCircle;

export default Admin;
