import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.livetv.app",
  appName: "Live TV",
  webDir: "dist",
  // Allow HTTP (cleartext) traffic for IPTV/Xtream servers that don't use HTTPS.
  android: {
    allowMixedContent: true,
  },
  server: {
    // Load the bundled web assets on device (default).
    // For live debugging against a dev server, uncomment and set your LAN URL:
    // url: "http://192.168.1.10:3000",
    androidScheme: "https",
    cleartext: true,
  },
};

export default config;
