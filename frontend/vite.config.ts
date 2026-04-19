import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // ──────────────────────── DEV server (rarely used here) ────────────────────────
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    // HMR fully disabled — see notes in git history.
    hmr: false,
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/android/**",
        "**/ios/**",
        "**/ios-plugin/**",
        "**/supabase/.branches/**",
        "**/supabase/.temp/**",
        "**/test_reports/**",
        "**/.emergent/**",
        "**/dist/**",
        "**/build/**",
        "**/*.log",
        "**/memory/**",
      ],
    },
  },
  // ──────────────────────── PRODUCTION preview (this is what supervisor runs) ────
  //
  // `yarn start` does `vite build && vite preview`. The preview server
  // serves the static built bundle with NO dev WebSocket, NO HMR ping,
  // NO auto-reload-on-connection-loss. This is the root-cause fix for
  // "page suddenly reloads while scrolling / watching / typing" — the
  // Vite dev server's internal ping WebSocket was dropping under load
  // (or through the K8s/CDN ingress) and triggering a full page
  // reload. The production preview has none of that.
  preview: {
    host: "::",
    port: 3000,
    strictPort: true,
    // Accept any Host header (the app is reached via the Emergent
    // preview URL and possibly a custom domain in the future).
    allowedHosts: true,
  },
  envPrefix: ["VITE_", "REACT_APP_"],
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
