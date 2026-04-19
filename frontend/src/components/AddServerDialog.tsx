import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Server, KeyRound, UserCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import type { ProfileKind } from "@/types/xtream";

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

const AddServerDialog = ({ open, onClose, onSubmit }: Props) => {
  const [kind, setKind] = useState<ProfileKind>("xtream");
  const [name, setName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(""); setServerUrl(""); setUsername(""); setPassword(""); setM3uUrl("");
  };

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative glass-card rounded-2xl p-8 w-full max-w-md mx-4"
          >
            <h2 className="text-foreground text-xl font-display text-center mb-4">Add Playlist</h2>

            <div className="flex glass rounded-xl p-1 mb-5">
              {(["xtream", "m3u"] as ProfileKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    kind === k ? "bg-primary/20 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {k === "xtream" ? "Xtream Codes" : "M3U URL"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Field icon={UserCircle} placeholder="Profile Name (e.g., Family TV)" value={name} onChange={setName} />
              {kind === "xtream" ? (
                <>
                  <Field icon={Server} placeholder="Server URL (http://...)" value={serverUrl} onChange={setServerUrl} />
                  <Field icon={User} placeholder="Username" value={username} onChange={setUsername} />
                  <Field icon={KeyRound} placeholder="Password" value={password} onChange={setPassword} type="password" />
                </>
              ) : (
                <Field icon={LinkIcon} placeholder="https://example.com/playlist.m3u" value={m3uUrl} onChange={setM3uUrl} />
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={submitting}
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
                ? "Enter your Xtream Codes credentials to load TV, Movies & Series."
                : "Paste any M3U / M3U8 playlist URL to import."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Field = ({ icon: Icon, placeholder, value, onChange, type = "text" }: any) => (
  <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
    <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
    />
  </div>
);

export default AddServerDialog;
