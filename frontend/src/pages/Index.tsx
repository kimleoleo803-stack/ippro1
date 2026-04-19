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
import AddServerDialog from "@/components/AddServerDialog";
import ExpiredOverlay from "@/components/ExpiredOverlay";
import { useProfiles } from "@/hooks/useProfiles";
import { useConnectProfile } from "@/hooks/useConnectProfile";
import { useAuth } from "@/hooks/useAuth";
import { apiSubscriptionStatus, type SubscriptionStatus } from "@/lib/nadiAuth";

const categories = [
  { title: "Live TV", count: "+5000 Channels", icon: Tv, route: "/live-tv" },
  { title: "Movies", count: "+1200 Movies", icon: Film, route: "/movies" },
  { title: "Series", count: "+500 Series", icon: Clapperboard, route: "/series" },
];

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
    animate={{ opacity: 1, y: 0, scale: isSelected ? 1.15 : 0.9, zIndex: isSelected ? 10 : 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.1 }}
    whileHover={{ scale: isSelected ? 1.18 : 0.95 }}
    whileTap={{ scale: isSelected ? 1.12 : 0.88 }}
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className="relative cursor-pointer select-none"
    style={{ width: isSelected ? 280 : 220, height: isSelected ? 190 : 160 }}
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
    <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-5">
      <Icon
        className={`transition-all duration-500 ${
          isSelected
            ? "w-16 h-16 text-primary gold-glow animate-glow-pulse"
            : "w-12 h-12 text-muted-foreground/40"
        }`}
        strokeWidth={1.2}
      />
      <h3 className="text-foreground text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground text-xs">{count}</p>
    </div>
  </motion.div>
);

const Index = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddServer, setShowAddServer] = useState(false);
  const navigate = useNavigate();
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
        <header className="flex items-center justify-between px-8 pt-6">
          <div className="w-14 h-14 rounded-xl glass overflow-hidden flex items-center justify-center">
            <Tv className="w-5 h-5 text-muted-foreground" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display text-3xl md:text-4xl tracking-[0.3em] gold-text"
          >
            NADIBOX
          </motion.h1>
          <div className="flex items-center gap-3">
            {/* Guests can still add/edit their own servers. Paid users cannot. */}
            {!isPaidUser && (
              <button
                data-testid="index-add-server-btn"
                onClick={() => setShowAddServer(true)}
                className="w-11 h-11 rounded-full glass flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {/* Settings only makes sense for guests (manage profiles). Hide for paid users. */}
            {!isPaidUser && (
              <button
                onClick={() => navigate("/account")}
                className="w-11 h-11 rounded-full glass flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {isPaidUser ? (
              <button
                data-testid="index-logout-btn"
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 h-11 rounded-full glass text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-xs tracking-[0.2em] uppercase"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <button
                onClick={() => navigate("/welcome")}
                className="w-11 h-11 rounded-full border-2 border-primary/50 overflow-hidden glass flex items-center justify-center"
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
            className="mx-8 mt-4 glass-card rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary gold-glow" />
              <div>
                <p className="text-foreground text-sm font-medium">
                  {user?.username}
                  <span className="ml-2 text-muted-foreground text-xs">· Subscriber</span>
                </p>
                <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground">
                  {expiryDate ? (
                    <>
                      Expires{" "}
                      <span className="text-foreground">
                        {new Date(expiryDate).toLocaleDateString()}
                      </span>
                    </>
                  ) : (
                    "No expiry set"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wider ${
                  isExpired
                    ? "bg-destructive/20 text-destructive border border-destructive/40"
                    : daysRemaining != null && daysRemaining <= 3
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-primary/15 text-primary border border-primary/40"
                }`}
              >
                {isExpired
                  ? "EXPIRED"
                  : daysRemaining != null
                    ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
                    : ""}
              </span>
            </div>
          </div>
        ) : (
          activeProfile && (
            <div className="text-center mt-2">
              <span className="text-muted-foreground text-xs">
                Profile:{" "}
                <span className="text-primary">{activeProfile.name}</span>
              </span>
            </div>
          )
        )}

        {isGuest && !user && (
          <div className="text-center mt-2">
            <span className="text-muted-foreground text-[11px] tracking-[0.3em] uppercase">
              Guest Mode
            </span>
          </div>
        )}

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            {categories.map((cat, i) => (
              <CategoryCard
                key={cat.title}
                {...cat}
                index={i}
                isSelected={selectedIndex === i}
                onClick={() => setSelectedIndex(i)}
                onDoubleClick={() => navigate(cat.route)}
              />
            ))}
          </div>
        </main>

        {/* Info bar */}
        <div className="text-center text-muted-foreground text-xs px-4 pb-2">
          LIVE: +5000 Channels. MOVIES: +1200 Titles. SERIES: +500 Series.
          {isPaidUser
            ? sub?.xtream.server
              ? " Connected."
              : " Awaiting server sync."
            : activeProfile
              ? " Connected."
              : " Waiting to connect."}
        </div>

        <footer className="flex items-center justify-between px-8 pb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-foreground text-sm font-medium">Timeshift</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-4 md:gap-6"
          >
            <div className="flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-primary" />
              <span className="text-foreground text-lg font-light">{currentTime}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
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
