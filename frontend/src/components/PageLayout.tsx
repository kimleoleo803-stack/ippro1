import { motion } from "framer-motion";
import { Settings, User, Clock, CloudSun, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const PageLayout = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [currentTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/nebula-bg.png')" }} />
      <div className="absolute inset-0 bg-background/40" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 pt-4">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full glass flex items-center justify-center hover:border-primary/40 transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-xl tracking-[0.2em] gold-text">
            {title}
          </motion.h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/account")} className="w-9 h-9 rounded-full glass flex items-center justify-center hover:border-primary/40">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => navigate("/account")} className="w-9 h-9 rounded-full border-2 border-primary/50 glass flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-4 py-3">{children}</main>

        <footer className="flex items-center justify-between px-6 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-xs">Timeshift</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CloudSun className="w-4 h-4 text-primary" />
            <span className="text-foreground font-light">{currentTime}</span>
            <div className="h-4 w-px bg-border" />
            <span className="text-foreground text-xs">Los Angeles 24°</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PageLayout;
