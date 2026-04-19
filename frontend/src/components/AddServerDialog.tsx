import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Server,
  KeyRound,
  UserCircle,
  Link as LinkIcon,
  Loader2,
  Globe2,
} from "lucide-react";
import type { ProfileKind } from "@/types/xtream";
import { apiPublicSharedXtream } from "@/lib/nadiAuth";

export interface AddServerData {
  kind: ProfileKind;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  m3uUrl?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddServerData) => void | Promise<void>;
}

type Advanced = "shared" | "own";

const AddServerDialog = ({ open, onClose, onSubmit }: Props) => {
  const [kind, setKind] = useState<ProfileKind>("xtream");
  const [advanced, setAdvanced] = useState<Advanced>("shared");
  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedConfigured, setSharedConfigured] = useState<boolean | null>(null);
  const [sharedError, setSharedError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setServerUrl("");
    setUsername("");
    setPassword("");
    setM3uUrl("");
  };

  // Fetch global shared creds when Shared mode is selected (Xtream only).
  useEffect(() => {
    if (!open || kind !== "xtream" || advanced !== "shared") return;
    let cancelled = false;
    setSharedLoading(true);
    setSharedError(null);
    apiPublicSharedXtream()
      .then((res) => {
        if (cancelled) return;
        setSharedConfigured(res.configured);
        if (res.configured) {
          setServerUrl(res.server);
          setUsername(res.username);
          setPassword(res.password);
          if (!name) setName("NADIBOX Shared");
        } else {
          setServerUrl("");
          setUsername("");
          setPassword("");
        }
      })
      .catch((e) => {
        if (!cancelled) setSharedError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setSharedLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, advanced]);

  // Reset form state whenever dialog closes
  useEffect(() => {
    if (!open) {
      setAdvanced("shared");
      setKind("xtream");
      setSharedConfigured(null);
      setSharedError(null);
      reset();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name) return;
    if (kind === "xtream" && (!serverUrl || !username || !password)) return;
    if (kind === "m3u" && !m3uUrl) return;
    setSubmitting(true);
    try {
      await onSubmit({ kind, name, serverUrl, username, password, m3uUrl });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const sharedReady = advanced === "shared" && sharedConfigured === true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative glass-card rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto"
          >
            <h2
              data-testid="add-server-title"
              className="text-foreground text-xl sm:text-2xl font-display tracking-[0.2em] gold-text text-center mb-5"
            >
              ADD PLAYLIST
            </h2>

            {/* Kind toggle */}
            <div className="flex glass rounded-xl p-1 mb-4">
              {(["xtream", "m3u"] as ProfileKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  data-testid={`add-kind-${k}`}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    kind === k ? "bg-primary/20 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {k === "xtream" ? "Xtream Codes" : "M3U URL"}
                </button>
              ))}
            </div>

            {/* Advanced: Shared vs Own — only for Xtream */}
            {kind === "xtream" && (
              <div className="mb-4">
                <label className="text-[11px] text-muted-foreground tracking-[0.25em] uppercase block mb-2">
                  Advanced
                </label>
                <div className="flex glass rounded-xl p-1">
                  <button
                    onClick={() => setAdvanced("shared")}
                    data-testid="add-mode-shared"
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      advanced === "shared"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Globe2 className="w-3.5 h-3.5" />
                    Shared
                  </button>
                  <button
                    onClick={() => setAdvanced("own")}
                    data-testid="add-mode-own"
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      advanced === "own"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    Own server
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground tracking-wide mt-2">
                  {advanced === "shared"
                    ? "Uses the Xtream server configured by the admin in Global Settings."
                    : "Enter your personal Xtream server credentials."}
                </p>
              </div>
            )}

            {/* Fields */}
            <div className="space-y-3">
              <Field
                icon={UserCircle}
                placeholder="Profile Name (e.g., Family TV)"
                value={name}
                onChange={setName}
                testId="add-name"
              />
              {kind === "xtream" ? (
                <>
                  {advanced === "shared" ? (
                    <>
                      {sharedLoading && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading shared server details...
                        </div>
                      )}
                      {!sharedLoading && sharedConfigured === false && (
                        <div className="text-destructive text-xs bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                          The admin hasn't configured a shared server yet. Switch
                          to <span className="font-medium">Own server</span> or ask
                          your admin to set it up.
                        </div>
                      )}
                      {!sharedLoading && sharedReady && (
                        <div
                          data-testid="add-shared-summary"
                          className="glass-input rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Server className="w-3.5 h-3.5 text-primary" />
                            <span className="text-foreground/90 truncate">{serverUrl}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span className="text-foreground/90">{username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5 text-primary" />
                            <span className="text-foreground/90">
                              {password ? "•".repeat(Math.min(password.length, 12)) : ""}
                            </span>
                          </div>
                          <p className="text-[10px] text-primary/80 tracking-wide pt-1">
                            Shared server · Auto-filled from Global Settings
                          </p>
                        </div>
                      )}
                      {sharedError && (
                        <div className="text-destructive text-xs">{sharedError}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <Field
                        icon={Server}
                        placeholder="Server URL (http://...)"
                        value={serverUrl}
                        onChange={setServerUrl}
                        testId="add-server-url"
                      />
                      <Field
                        icon={User}
                        placeholder="Username"
                        value={username}
                        onChange={setUsername}
                        testId="add-user"
                      />
                      <Field
                        icon={KeyRound}
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        type="password"
                        testId="add-pass"
                      />
                    </>
                  )}
                </>
              ) : (
                <Field
                  icon={LinkIcon}
                  placeholder="https://example.com/playlist.m3u"
                  value={m3uUrl}
                  onChange={setM3uUrl}
                  testId="add-m3u-url"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  (kind === "xtream" && advanced === "shared" && !sharedReady)
                }
                data-testid="add-submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground font-medium text-sm hover:from-primary hover:to-primary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Connecting..." : "Connect"}
              </button>
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl glass text-foreground font-medium text-sm hover:border-primary/40 transition-all"
              >
                Cancel
              </button>
            </div>

            <p className="text-muted-foreground text-xs text-center mt-4">
              {kind === "xtream"
                ? advanced === "shared"
                  ? "Pick Shared to reuse the NADIBOX global server."
                  : "Enter your Xtream Codes credentials to load TV, Movies & Series."
                : "Paste any M3U / M3U8 playlist URL to import."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Field = ({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
  testId,
}: any) => (
  <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
    <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
      autoComplete="off"
    />
  </div>
);

export default AddServerDialog;
