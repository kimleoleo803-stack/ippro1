import { motion, AnimatePresence } from "framer-motion";
import { Tv } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SPLASH_DURATION_MS = 3000;
const SESSION_KEY = "nadibox_splash_shown";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Attempt sound auto-play on first load. Modern browsers may block
    // auto-play without a user gesture; we swallow the rejection silently.
    const audio = new Audio("/audio/Arrival_Queued.mp3");
    audio.volume = 0.9;
    audioRef.current = audio;
    audio.play().catch(() => {
      /* autoplay blocked - that's fine, splash still plays */
    });

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
      try {
        audio.pause();
      } catch {
        /* noop */
      }
    };
  }, []);

  const handleExitComplete = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    onFinish();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          data-testid="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(200, 40%, 12%) 0%, hsl(200, 30%, 6%) 55%, #000 100%)",
          }}
        >
          {/* Background nebula image - subtle */}
          <div
            className="absolute inset-0 opacity-40 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/nebula-bg.png')" }}
          />
          <div className="absolute inset-0 bg-background/50" />

          {/* Grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />

          {/* Expanding gold rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.7 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{
                duration: 2.6,
                delay: i * 0.7,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: 220,
                height: 220,
                border: "1px solid hsla(40, 80%, 55%, 0.45)",
                boxShadow: "0 0 40px hsla(40, 80%, 55%, 0.25)",
              }}
            />
          ))}

          {/* Orbiting particles */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 360, height: 360 }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                style={{
                  background: "hsl(40, 85%, 65%)",
                  boxShadow: "0 0 12px hsl(40, 85%, 65%)",
                  transform: `rotate(${i * 60}deg) translate(180px) translate(-50%, -50%)`,
                }}
              />
            ))}
          </motion.div>

          {/* Central content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
            {/* Logo badge */}
            <motion.div
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 14,
                delay: 0.15,
              }}
              className="relative"
            >
              <div
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl glass flex items-center justify-center"
                style={{
                  boxShadow:
                    "0 0 60px hsla(40, 80%, 55%, 0.55), inset 0 0 30px hsla(40, 80%, 55%, 0.1)",
                  border: "1px solid hsla(40, 80%, 55%, 0.4)",
                }}
              >
                <Tv
                  className="w-12 h-12 md:w-14 md:h-14 text-primary gold-glow"
                  strokeWidth={1.2}
                />
              </div>
              {/* inner pulse ring */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ border: "1px solid hsla(40, 80%, 55%, 0.6)" }}
              />
            </motion.div>

            {/* Wordmark */}
            <motion.h1
              initial={{ opacity: 0, letterSpacing: "0.8em", y: 20 }}
              animate={{ opacity: 1, letterSpacing: "0.4em", y: 0 }}
              transition={{ duration: 1.1, delay: 0.4, ease: "easeOut" }}
              data-testid="splash-wordmark"
              className="font-display text-4xl md:text-6xl tracking-[0.4em] gold-text text-center"
              style={{
                textShadow: "0 0 30px hsla(40, 80%, 55%, 0.35)",
              }}
            >
              NADIBOX
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.0 }}
              className="text-muted-foreground text-xs md:text-sm tracking-[0.5em] uppercase"
            >
              {t("splash.tagline")}
            </motion.p>

            {/* Loading shimmer bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 220 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="relative h-[2px] rounded-full overflow-hidden"
              style={{ background: "hsla(40, 80%, 55%, 0.15)" }}
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.2,
                }}
                className="absolute inset-y-0 w-1/2"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(40, 85%, 65%), transparent)",
                }}
              />
            </motion.div>
          </div>

          {/* Bottom-right version/credit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="absolute bottom-6 left-0 right-0 text-center text-muted-foreground/70 text-[10px] tracking-[0.4em] uppercase"
          >
            {t("splash.premiumTag")}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
