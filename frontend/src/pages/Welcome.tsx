import { motion } from "framer-motion";
import { LogIn, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Welcome = () => {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();

  const handleGuest = () => {
    continueAsGuest();
    navigate("/");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div
      data-testid="welcome-page"
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
    >
      {/* Nebula background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/nebula-bg.png')" }}
      />
      <div className="absolute inset-0 bg-background/55" />

      {/* Header wordmark */}
      <header className="relative z-10 flex items-center justify-center pt-10">
        <motion.h1
          initial={{ opacity: 0, y: -20, letterSpacing: "0.8em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.4em" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="font-display text-3xl md:text-5xl tracking-[0.4em] gold-text"
          style={{ textShadow: "0 0 30px hsla(40, 80%, 55%, 0.35)" }}
        >
          NADIBOX
        </motion.h1>
      </header>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative z-10 text-center text-muted-foreground text-xs md:text-sm tracking-[0.5em] uppercase mt-3"
      >
        Choose how to continue
      </motion.p>

      {/* Cards */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full max-w-4xl">
          {/* Guest card */}
          <motion.button
            data-testid="welcome-guest-btn"
            onClick={handleGuest}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 180, damping: 20 }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex-1 rounded-3xl overflow-hidden text-left cursor-pointer"
            style={{ minHeight: 300 }}
          >
            <div className="absolute inset-0 glass-card" />
            <div
              className="absolute -inset-px rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                boxShadow:
                  "0 0 50px hsla(40, 80%, 55%, 0.25), inset 0 0 40px hsla(40, 80%, 55%, 0.08)",
                border: "1px solid hsla(40, 80%, 55%, 0.3)",
              }}
            />
            <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 p-10">
              <div
                className="w-20 h-20 rounded-2xl glass flex items-center justify-center"
                style={{ border: "1px solid hsla(40, 80%, 55%, 0.3)" }}
              >
                <UserCircle2
                  className="w-10 h-10 text-primary gold-glow"
                  strokeWidth={1.4}
                />
              </div>
              <h2 className="font-display text-2xl tracking-[0.3em] gold-text">
                GUEST
              </h2>
              <p className="text-muted-foreground text-sm text-center max-w-xs tracking-wide">
                Enter with your own Xtream server — manage everything locally.
              </p>
              <span className="text-primary/80 text-xs tracking-[0.4em] uppercase mt-2">
                Enter →
              </span>
            </div>
          </motion.button>

          {/* Login card */}
          <motion.button
            data-testid="welcome-login-btn"
            onClick={handleLogin}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, type: "spring", stiffness: 180, damping: 20 }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex-1 rounded-3xl overflow-hidden text-left cursor-pointer"
            style={{ minHeight: 300 }}
          >
            <div className="absolute inset-0 glass-card" />
            <div
              className="absolute -inset-px rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                boxShadow:
                  "0 0 50px hsla(40, 80%, 55%, 0.35), inset 0 0 40px hsla(40, 80%, 55%, 0.08)",
                border: "1px solid hsla(40, 80%, 55%, 0.4)",
              }}
            />
            <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 p-10">
              <div
                className="w-20 h-20 rounded-2xl glass flex items-center justify-center"
                style={{
                  border: "1px solid hsla(40, 80%, 55%, 0.4)",
                  boxShadow: "0 0 30px hsla(40, 80%, 55%, 0.2)",
                }}
              >
                <LogIn className="w-10 h-10 text-primary gold-glow" strokeWidth={1.4} />
              </div>
              <h2 className="font-display text-2xl tracking-[0.3em] gold-text">
                LOGIN
              </h2>
              <p className="text-muted-foreground text-sm text-center max-w-xs tracking-wide">
                Subscribers: sign in with the username &amp; password provided by your admin.
              </p>
              <span className="text-primary/80 text-xs tracking-[0.4em] uppercase mt-2">
                Sign In →
              </span>
            </div>
          </motion.button>
        </div>
      </main>

      <footer className="relative z-10 pb-8 text-center text-muted-foreground/60 text-[10px] tracking-[0.4em] uppercase">
        Premium IPTV Experience
      </footer>
    </div>
  );
};

export default Welcome;
