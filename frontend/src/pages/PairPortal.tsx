import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Tv,
  Link2,
  Server,
  User,
  KeyRound,
  UserCircle,
  Loader2,
  Check,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.REACT_APP_BACKEND_URL || "";

/**
 * Pairing Portal — the user opens this on their phone/PC,
 * enters the 6-digit PIN shown on the TV app, and submits
 * their Xtream credentials. The TV app auto-detects the pairing.
 */
const PairPortal = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [pin, setPin] = useState(params.get("pin") || "");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profileName, setProfileName] = useState("My IPTV");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Auto-focus the PIN field if not pre-filled
  useEffect(() => {
    if (!pin) {
      const el = document.getElementById("pin-input");
      if (el) el.focus();
    }
  }, [pin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPin = pin.replace(/\s/g, "");
    if (cleanPin.length !== 6 || !/^\d+$/.test(cleanPin)) {
      setError("PIN must be exactly 6 digits");
      return;
    }
    if (!serverUrl.trim()) {
      setError("Server URL is required");
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/device/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: cleanPin,
          server_url: serverUrl.trim(),
          username: username.trim(),
          password: password.trim(),
          profile_name: profileName.trim() || "My IPTV",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Pairing failed (${res.status})`);
      }

      setSuccess(true);
      toast.success("Device paired successfully!");
    } catch (e: any) {
      setError(e.message || "Pairing failed");
      toast.error(e.message || "Pairing failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: "url('/images/nebula-bg.png')" }} />
        <div className="absolute inset-0 bg-background/80" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 glass-card rounded-3xl p-10 text-center max-w-md"
          data-testid="pair-success-card"
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-foreground text-xl font-semibold mb-2">Paired!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your TV app will load the IPTV profile automatically.
            You can close this page now.
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-primary text-xs underline"
            data-testid="go-home-btn"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="pair-portal-page">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: "url('/images/nebula-bg.png')" }} />
      <div className="absolute inset-0 bg-background/60" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 glass-card rounded-3xl p-8 w-full max-w-md"
      >
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-muted-foreground text-xs mb-4 hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-3">
            <Link2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl tracking-[0.2em] gold-text">PAIR DEVICE</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Enter the PIN shown on your TV
          </p>
        </div>

        {/* PIN Input */}
        <div className="mb-5">
          <label className="text-muted-foreground text-[11px] mb-1.5 block">
            6-Digit PIN
          </label>
          <input
            id="pin-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full text-center text-3xl font-mono tracking-[0.5em] glass-input rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground/30 outline-none"
            data-testid="pin-input"
          />
        </div>

        {/* Xtream Credentials */}
        <div className="space-y-3 mb-5">
          <p className="text-muted-foreground text-[11px]">IPTV Server Credentials</p>
          <PairField
            icon={UserCircle}
            placeholder="Profile Name (e.g. My IPTV)"
            value={profileName}
            onChange={setProfileName}
            testId="profile-name-input"
          />
          <PairField
            icon={Server}
            placeholder="Server URL (http://...)"
            value={serverUrl}
            onChange={setServerUrl}
            testId="server-url-input"
          />
          <PairField
            icon={User}
            placeholder="Username"
            value={username}
            onChange={setUsername}
            testId="username-input"
          />
          <PairField
            icon={KeyRound}
            placeholder="Password"
            value={password}
            onChange={setPassword}
            type="password"
            testId="password-input"
          />
        </div>

        {error && (
          <p className="text-destructive text-xs text-center mb-3" data-testid="pair-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary/80 to-primary/60 text-primary-foreground font-medium text-sm hover:from-primary hover:to-primary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="pair-submit-btn"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Pairing..." : "Pair Device"}
        </button>

        <p className="text-center text-muted-foreground text-[10px] mt-4">
          Your credentials are sent directly to the device and stored securely.
        </p>
      </motion.form>
    </div>
  );
};

const PairField = ({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
  testId,
}: {
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  testId: string;
}) => (
  <div className="flex items-center gap-3 glass-input rounded-xl px-4 py-3">
    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
      autoComplete="off"
      data-testid={testId}
    />
  </div>
);

export default PairPortal;
