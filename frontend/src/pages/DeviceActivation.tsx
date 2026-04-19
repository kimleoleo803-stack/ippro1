import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Tv, Wifi, Copy, Check, RefreshCw, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProfiles } from "@/hooks/useProfiles";

const API = import.meta.env.REACT_APP_BACKEND_URL || "";

interface DeviceInfo {
  device_id: string;
  mac_address: string;
  pin: string;
}

/**
 * Device Activation Screen — shown on the TV / device app.
 * Displays MAC Address, Device ID, PIN, and a QR code pointing to the
 * pairing portal. Polls the backend until paired, then auto-loads config.
 */
const DeviceActivation = () => {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paired, setPaired] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const navigate = useNavigate();
  const { addProfile, setActiveProfileId } = useProfiles();

  // Register a new device on mount
  useEffect(() => {
    const stored = localStorage.getItem("nadibox_device");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDevice(parsed);
        setLoading(false);
        return;
      } catch { /* ignore */ }
    }

    (async () => {
      try {
        const res = await fetch(`${API}/api/device/register`, { method: "POST" });
        if (!res.ok) throw new Error("Registration failed");
        const data = await res.json();
        const info: DeviceInfo = {
          device_id: data.device_id,
          mac_address: data.mac_address,
          pin: data.pin,
        };
        localStorage.setItem("nadibox_device", JSON.stringify(info));
        setDevice(info);
      } catch (e: any) {
        toast.error(e.message || "Failed to register device");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Poll for pairing status
  useEffect(() => {
    if (!device || paired) return;
    let cancelled = false;
    let failCount = 0;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/device/status/${device.device_id}`);
        if (res.status === 404) {
          failCount++;
          // If device was deleted server-side, re-register after 3 consecutive 404s
          if (failCount >= 3 && !cancelled) {
            localStorage.removeItem("nadibox_device");
            setDevice(null);
            setLoading(true);
            try {
              const regRes = await fetch(`${API}/api/device/register`, { method: "POST" });
              const data = await regRes.json();
              const info: DeviceInfo = { device_id: data.device_id, mac_address: data.mac_address, pin: data.pin };
              localStorage.setItem("nadibox_device", JSON.stringify(info));
              setDevice(info);
            } catch { /* ignore */ }
            setLoading(false);
          }
          return;
        }
        if (!res.ok) return;
        failCount = 0;
        const data = await res.json();
        if (data.paired && !cancelled) {
          setPaired(true);
          // Fetch config and auto-add profile
          const cfgRes = await fetch(`${API}/api/device/config/${device.device_id}`);
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            const profile = addProfile({
              name: cfg.profile_name || "Paired Device",
              kind: "xtream",
              serverUrl: cfg.server_url,
              username: cfg.username,
              password: cfg.password,
            });
            setActiveProfileId(profile.id);
            toast.success("Device paired! Loading channels...");
            setTimeout(() => navigate("/"), 1500);
          }
        }
      } catch { /* ignore polling errors */ }
    };

    const interval = setInterval(poll, 3000);
    poll(); // immediate first check
    return () => { cancelled = true; clearInterval(interval); };
  }, [device, paired, addProfile, setActiveProfileId, navigate]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const resetDevice = useCallback(async () => {
    if (!device) return;
    try {
      await fetch(`${API}/api/device/unpair/${device.device_id}`, { method: "DELETE" });
    } catch { /* ignore */ }
    localStorage.removeItem("nadibox_device");
    setDevice(null);
    setPaired(false);
    setLoading(true);
    // Re-register
    try {
      const res = await fetch(`${API}/api/device/register`, { method: "POST" });
      const data = await res.json();
      const info: DeviceInfo = {
        device_id: data.device_id,
        mac_address: data.mac_address,
        pin: data.pin,
      };
      localStorage.setItem("nadibox_device", JSON.stringify(info));
      setDevice(info);
      toast.success("New device code generated");
    } catch (e: any) {
      toast.error("Failed to re-register");
    } finally {
      setLoading(false);
    }
  }, [device]);

  const pairUrl = `${window.location.origin}/pair`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (paired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-3xl p-10 text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-foreground text-xl font-semibold mb-2">Device Paired!</h2>
          <p className="text-muted-foreground text-sm">
            Loading your IPTV profile...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="device-activation-page">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: "url('/images/nebula-bg.png')" }} />
      <div className="absolute inset-0 bg-background/60" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 glass-card rounded-3xl p-8 w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-3">
            <Tv className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl tracking-[0.2em] gold-text">NADIBOX</h1>
          <p className="text-muted-foreground text-xs mt-1">Device Activation</p>
        </div>

        {device && (
          <div className="space-y-5">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl">
                <QRCodeSVG
                  value={`${pairUrl}?pin=${device.pin}`}
                  size={160}
                  level="M"
                  data-testid="pairing-qr-code"
                />
              </div>
            </div>
            <p className="text-center text-muted-foreground text-[11px]">
              Scan this QR code or visit <span className="text-primary">{pairUrl}</span>
            </p>

            {/* Device Info Cards */}
            <div className="grid grid-cols-1 gap-3">
              <InfoRow
                label="MAC Address"
                value={device.mac_address}
                onCopy={() => copyToClipboard(device.mac_address, "MAC")}
                isCopied={copied === "MAC"}
              />
              <InfoRow
                label="Device ID"
                value={device.device_id}
                onCopy={() => copyToClipboard(device.device_id, "Device ID")}
                isCopied={copied === "Device ID"}
              />
            </div>

            {/* Big PIN display */}
            <div className="glass rounded-2xl p-5 text-center" data-testid="device-pin-display">
              <p className="text-muted-foreground text-xs mb-2">Your Pairing PIN</p>
              <div className="flex justify-center gap-2">
                {device.pin.split("").map((d, i) => (
                  <span
                    key={i}
                    className="w-11 h-14 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary text-2xl font-bold font-mono"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground text-[10px] mt-3">
                Enter this PIN on the web portal to link your account
              </p>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Wifi className="w-4 h-4 animate-pulse text-primary" />
              <span className="text-xs">Waiting for pairing...</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/pair")}
                className="flex-1 py-2.5 rounded-xl glass hover:border-primary/40 text-foreground text-xs flex items-center justify-center gap-2 transition-all"
                data-testid="open-pair-portal-btn"
              >
                <Link2 className="w-3.5 h-3.5" /> Open Pair Portal
              </button>
              <button
                onClick={resetDevice}
                className="py-2.5 px-4 rounded-xl glass hover:border-primary/40 text-muted-foreground text-xs flex items-center justify-center gap-2 transition-all"
                data-testid="reset-device-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const InfoRow = ({
  label,
  value,
  onCopy,
  isCopied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
}) => (
  <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
    <div>
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="text-foreground text-sm font-mono tracking-wider">{value}</p>
    </div>
    <button
      onClick={onCopy}
      className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-primary/40 transition-all"
      data-testid={`copy-${label.toLowerCase().replace(/\s/g, "-")}-btn`}
    >
      {isCopied ? (
        <Check className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  </div>
);

export default DeviceActivation;
