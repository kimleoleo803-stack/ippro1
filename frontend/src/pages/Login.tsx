import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Tv, Server, User, KeyRound, Link as LinkIcon, UserCircle, Loader2 } from "lucide-react";
import { useConnectProfile } from "@/hooks/useConnectProfile";
import type { ProfileKind } from "@/types/xtream";

/**
 * Public Xtream / M3U login page.
 * Supports deep linking via query params:
 *   /login?type=xtream&name=My&server=http://x.com&user=u&pass=p
 *   /login?type=m3u&name=My&url=https://x.com/playlist.m3u
 * If `auto=1`, the form auto-submits after prefill.
 */
const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const connect = useConnectProfile();

  const [kind, setKind] = useState<ProfileKind>((params.get("type") as ProfileKind) || "xtream");
  const [name, setName] = useState(params.get("name") || "");
  const [serverUrl, setServerUrl] = useState(params.get("server") || "");
  const [username, setUsername] = useState(params.get("user") || "");
  const [password, setPassword] = useState(params.get("pass") || "");
  const [m3uUrl, setM3uUrl] = useState(params.get("url") || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name) return;
    if (kind === "xtream" && (!serverUrl || !username || !password)) return;
    if (kind === "m3u" && !m3uUrl) return;
    setSubmitting(true);
    const created = await connect({ kind, name, serverUrl, username, password, m3uUrl });
    setSubmitting(false);
    if (created) navigate("/");
  };

  useEffect(() => {
    if (params.get("auto") === "1") void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/nebula-bg.png')" }} />
      <div className="absolute inset-0 bg-background/60" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 glass-card rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-3">
            <Tv className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl tracking-[0.25em] gold-text">NADIBOX</h1>
          <p className="text-muted-foreground text-xs mt-1">Connect your IPTV service</p>
        </div>

        <div className="flex glass rounded-xl p-1 mb-5">
          {(["xtream", "m3u"] as ProfileKind[]).map((k) => (
            <button
              type="button" key={k}
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
          <Field icon={UserCircle} placeholder="Profile Name" value={name} onChange={setName} />
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground font-medium text-sm hover:from-primary hover:to-primary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Connecting..." : "Connect & Load"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full mt-3 text-muted-foreground text-xs hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </motion.form>
    </div>
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
      autoComplete="off"
    />
  </div>
);

export default Login;
