import { useState } from "react";
import { motion } from "framer-motion";
import { Tv, User, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import LanguageSelect from "@/components/LanguageSelect";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10"
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
        className="absolute z-20 top-4 sm:top-6 start-4 sm:start-6 w-10 h-10 sm:w-11 sm:h-11 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
      </button>

      <div className="absolute z-20 top-4 sm:top-6 end-4 sm:end-6">
        <LanguageSelect align="right" />
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 glass-card rounded-3xl p-6 sm:p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass flex items-center justify-center mb-3"
            style={{
              border: "1px solid hsla(40, 80%, 55%, 0.4)",
              boxShadow: "0 0 40px hsla(40, 80%, 55%, 0.3)",
            }}
          >
            <Tv className="w-7 h-7 sm:w-8 sm:h-8 text-primary gold-glow" strokeWidth={1.4} />
          </div>
          <h1 className="font-display text-xl sm:text-2xl tracking-[0.3em] gold-text">
            NADIBOX
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs tracking-[0.25em] uppercase mt-2 text-center">
            {t("login.subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
            <User className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              data-testid="login-username-input"
              type="text"
              placeholder={t("login.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
            <KeyRound className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              data-testid="login-password-input"
              type="password"
              placeholder={t("login.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
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
          {submitting ? t("login.submitting") : t("login.submit")}
        </button>

        <p className="mt-5 text-center text-muted-foreground text-[10px] sm:text-[11px] tracking-wide">
          {t("login.contactAdmin")}
        </p>
      </motion.form>
    </div>
  );
};

export default Login;
