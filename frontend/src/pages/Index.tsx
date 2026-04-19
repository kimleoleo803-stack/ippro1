import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Tv,
  Clapperboard,
  Settings,
  Clock,
  CloudSun,
  User,
  Plus,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AddServerDialog from "@/components/AddServerDialog";
import ExpiredOverlay from "@/components/ExpiredOverlay";
import LanguageSelect from "@/components/LanguageSelect";
import { useProfiles } from "@/hooks/useProfiles";
import { useConnectProfile } from "@/hooks/useConnectProfile";
import { useAuth } from "@/hooks/useAuth";
import { apiSubscriptionStatus, type SubscriptionStatus } from "@/lib/nadiAuth";

const categoriesConfig = [
  { key: "liveTv", icon: Tv, route: "/live-tv" },
  { key: "movies", icon: Film, route: "/movies" },
  { key: "series", icon: Clapperboard, route: "/series" },
] as const;

const CategoryCard = ({
  title,
  count,
  icon: Icon,
  index,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  title: string;
  count: string;
  icon: React.ElementType;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0, scale: isSelected ? 1.1 : 0.92, zIndex: isSelected ? 10 : 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.1 }}
    whileHover={{ scale: isSelected ? 1.14 : 0.95 }}
    whileTap={{ scale: isSelected ? 1.08 : 0.88 }}
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className="relative cursor-pointer select-none w-[46%] md:w-auto"
    style={{}}
  >
    {/* Responsive sizing via CSS variables instead of fixed width/height */}
    <div
      className={`relative ${
        isSelected
          ? "w-full md:w-[260px] lg:w-[280px] aspect-[7/5] md:aspect-[8/5]"
          : "w-full md:w-[200px] lg:w-[220px] aspect-[7/5] md:aspect-[8/5]"
      }`}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden glass-card" />
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-1 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                "0 0 30px hsla(40, 80%, 55%, 0.25), inset 0 0 30px hsla(40, 80%, 55%, 0.05)",
              border: "1px solid hsla(40, 80%, 55%, 0.2)",
              borderRadius: "1rem",
            }}
          />
        )}
      </AnimatePresence>
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-5">
        <Icon
          className={`transition-all duration-500 ${
            isSelected
              ? "w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 text-primary gold-glow animate-glow-pulse"
              : "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-muted-foreground/40"
          }`}
          strokeWidth={1.2}
        />
        <h3 className="text-foreground text-sm sm:text-base md:text-lg font-medium">
          {title}
        </h3>
        <p className="text-muted-foreground text-[10px] sm:text-xs">{count}</p>
      </div>
    </div>
  </motion.div>
);

const Index = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddServer, setShowAddServer] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProfile } = useProfiles();
  const connect = useConnectProfile();
  const { user, isGuest, logout } = useAuth();

  const isPaidUser = !!user && user.role === "user";

  // Subscription status (paid users only)
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (!isPaidUser) return;
    let cancelled = false;
    apiSubscriptionStatus()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch(() => {
        /* ignored — fall back to user object */
      });
    return () => {
      cancelled = true;
    };
  }, [isPaidUser, user?.id]);

  const daysRemaining = sub?.user.days_remaining ?? user?.days_remaining ?? null;
  const isExpired = sub?.user.is_expired ?? user?.is_expired ?? false;
  const expiryDate = sub?.user.expiry_at ?? user?.expiry_at ?? null;
  const whatsappNumber = sub?.whatsapp_number ?? "";

  const [currentTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  );

  const handleLogout = () => {
    logout();
    navigate("/welcome");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/nebula-bg.png')" }}
      />
      <div className="absolute inset-0 bg-background/40" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 gap-2">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl glass overflow-hidden flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5 text-muted-foreground" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.25em] sm:tracking-[0.3em] gold-text flex-1 text-center truncate"
          >
            NADIBOX
          </motion.h1>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageSelect align="right" />
            {/* Guests can still add/edit their own servers. Paid users cannot. */}
            {!isPaidUser && (
              <button
                data-testid="index-add-server-btn"
                onClick={() => setShowAddServer(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full glass flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {/* Settings only makes sense for guests (manage profiles). Hide for paid users. */}
            {!isPaidUser && (
              <button
                onClick={() => navigate("/account")}
                className="hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full glass items-center justify-center hover:border-primary/40 transition-colors"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {isPaidUser ? (
              <button
                data-testid="index-logout-btn"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 h-10 sm:h-11 rounded-full glass text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-[10px] sm:text-xs tracking-[0.2em] uppercase"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("home.logout")}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/welcome")}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-primary/50 overflow-hidden glass flex items-center justify-center"
                title="Back to welcome"
              >
                <User className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </header>

        {/* Subscription strip (paid users) OR profile indicator (guests) */}
        {isPaidUser ? (
          <div
            data-testid="subscription-strip"
            className="mx-4 sm:mx-6 md:mx-8 mt-4 glass-card rounded-xl px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ShieldCheck className="w-5 h-5 text-primary gold-glow shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium truncate">
                  {user?.username}
                  <span className="ms-2 text-muted-foreground text-xs">· {t("home.subscriber")}</span>
                </p>
                <p className="text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] uppercase text-muted-foreground">
                  {expiryDate ? (
                    <>
                      {t("home.expires")}{" "}
                      <span className="text-foreground">
                        {new Date(expiryDate).toLocaleDateString()}
                      </span>
                    </>
                  ) : (
                    t("home.noExpiry")
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wider ${
                  isExpired
                    ? "bg-destructive/20 text-destructive border border-destructive/40"
                    : daysRemaining != null && daysRemaining <= 3
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-primary/15 text-primary border border-primary/40"
                }`}
              >
                {isExpired
                  ? t("home.expired")
                  : daysRemaining != null
                    ? t("home.daysRemaining", { count: daysRemaining })
                    : ""}
              </span>
            </div>
          </div>
        ) : (
          activeProfile && (
            <div className="text-center mt-2">
              <span className="text-muted-foreground text-xs">
                {t("home.profile")}:{" "}
                <span className="text-primary">{activeProfile.name}</span>
              </span>
            </div>
          )
        )}

        {isGuest && !user && (
          <div className="text-center mt-2">
            <span className="text-muted-foreground text-[10px] sm:text-[11px] tracking-[0.3em] uppercase">
              {t("home.guestMode")}
            </span>
          </div>
        )}

        <main className="flex-1 flex items-center justify-center px-2 sm:px-4 py-4 sm:py-0">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 w-full max-w-4xl">
            {categoriesConfig.map((cat, i) => (
              <CategoryCard
                key={cat.key}
                title={t(`home.categories.${cat.key}` as const)}
                count={t(`home.categories.${cat.key}Count` as const)}
                icon={cat.icon}
                index={i}
                isSelected={selectedIndex === i}
                onClick={() => setSelectedIndex(i)}
                onDoubleClick={() => navigate(cat.route)}
              />
            ))}
          </div>
        </main>

        {/* Info bar */}
        <div className="text-center text-muted-foreground text-[10px] sm:text-xs px-4 pb-2">
          {t("home.infoBar")}{" "}
          {isPaidUser
            ? sub?.xtream.server
              ? t("home.connected")
              : t("home.awaiting")
            : activeProfile
              ? t("home.connected")
              : t("home.waiting")}
        </div>

        <footer className="flex items-center justify-between px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 gap-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </div>
            <span className="text-foreground text-xs sm:text-sm font-medium">
              {t("home.timeshift")}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-3 sm:gap-4 md:gap-6"
          >
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-foreground text-sm sm:text-base md:text-lg font-light">
                {currentTime}
              </span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-border" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-foreground text-sm">Los Angeles</span>
              <CloudSun className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-sm">24°</span>
            </div>
          </motion.div>
        </footer>
      </div>

      {/* Guests only can open AddServerDialog */}
      {!isPaidUser && (
        <AddServerDialog
          open={showAddServer}
          onClose={() => setShowAddServer(false)}
          onSubmit={async (data) => {
            const created = await connect(data);
            if (created) setShowAddServer(false);
          }}
        />
      )}

      {/* Paid-user full-screen block when expired */}
      {isPaidUser && isExpired && (
        <ExpiredOverlay
          username={user?.username || "subscriber"}
          whatsappNumber={whatsappNumber}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default Index;
