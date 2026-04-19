import { motion } from "framer-motion";
import { MessageCircle, Lock } from "lucide-react";

/**
 * Full-screen blocker shown when a subscriber's plan has expired.
 */
const ExpiredOverlay = ({
  username,
  whatsappNumber,
  onLogout,
}: {
  username: string;
  whatsappNumber: string;
  onLogout: () => void;
}) => {
  const cleanNumber = (whatsappNumber || "").replace(/[^\d+]/g, "");
  const waHref = cleanNumber
    ? `https://wa.me/${cleanNumber.replace(/^\+/, "")}?text=${encodeURIComponent(
        `Hi, my NADIBOX subscription (${username}) has expired. I'd like to renew.`,
      )}`
    : "#";

  return (
    <motion.div
      data-testid="expired-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse at center, hsl(200, 40%, 10%) 0%, #000 80%)",
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-card rounded-3xl p-8 md:p-10 w-full max-w-lg text-center"
      >
        <div
          className="w-20 h-20 mx-auto rounded-2xl glass flex items-center justify-center mb-5"
          style={{
            border: "1px solid hsla(0, 70%, 55%, 0.4)",
            boxShadow: "0 0 40px hsla(0, 70%, 55%, 0.25)",
          }}
        >
          <Lock className="w-10 h-10 text-destructive" strokeWidth={1.4} />
        </div>
        <h2 className="font-display text-2xl md:text-3xl tracking-[0.25em] gold-text mb-3">
          SUBSCRIPTION EXPIRED
        </h2>
        <p className="text-foreground/80 text-sm md:text-base mb-1">
          Hi <span className="text-primary font-medium">{username}</span>,
        </p>
        <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed">
          Your NADIBOX subscription has ended. To continue watching, please contact
          us on WhatsApp to renew.
        </p>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="expired-whatsapp-btn"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-medium text-sm transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Contact on WhatsApp
        </a>

        {whatsappNumber && (
          <p className="text-muted-foreground text-xs mt-4">
            {whatsappNumber}
          </p>
        )}

        <button
          onClick={onLogout}
          data-testid="expired-logout-btn"
          className="block mx-auto mt-6 text-muted-foreground hover:text-foreground text-xs tracking-[0.3em] uppercase transition-colors"
        >
          Sign Out
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ExpiredOverlay;
