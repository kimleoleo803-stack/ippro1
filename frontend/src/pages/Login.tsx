import { useState } from "react";
import { motion } from "framer-motion";
import { Tv, User, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Subscriber Login — username + password for users created by the admin.
 * Admin logs in from the same form and is routed to /admin.
 */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      if (user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="login-page"
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/nebula-bg.png')" }}
      />
      <div className="absolute inset-0 bg-background/60" />

      <button
        type="button"
        onClick={() => navigate("/welcome")}
        data-testid="login-back-btn"
        className="absolute z-20 top-6 left-6 w-11 h-11 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 glass-card rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-3"
            style={{
              border: "1px solid hsla(40, 80%, 55%, 0.4)",
              boxShadow: "0 0 40px hsla(40, 80%, 55%, 0.3)",
            }}
          >
            <Tv className="w-8 h-8 text-primary gold-glow" strokeWidth={1.4} />
          </div>
          <h1 className="font-display text-2xl tracking-[0.3em] gold-text">NADIBOX</h1>
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase mt-2">
            Subscriber Sign-In
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
            <User className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              data-testid="login-username-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
            <KeyRound className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              data-testid="login-password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div
            data-testid="login-error"
            className="mt-4 text-destructive text-xs bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          data-testid="login-submit-btn"
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground font-medium text-sm hover:from-primary hover:to-primary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="mt-5 text-center text-muted-foreground text-[11px] tracking-wide">
          No account? Contact your NADIBOX administrator to get credentials.
        </p>
      </motion.form>
    </div>
  );
};

export default Login;
