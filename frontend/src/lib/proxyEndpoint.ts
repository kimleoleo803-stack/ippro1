// Resolves which IPTV proxy endpoint to use at runtime.
//
// Preference order:
//   1. `VITE_SUPABASE_URL` (when configured to a real supabase.co host)  →
//       `<supabase>/functions/v1/iptv-proxy`
//   2. `REACT_APP_BACKEND_URL` (our FastAPI) →  `<backend>/api/iptv-proxy`
//   3. Same-origin fallback (`""/api/iptv-proxy`) — works in Vite dev too
//      because the backend is behind the same `/api` ingress prefix.
//
// This keeps the user's existing Supabase deployment working while letting
// the preview and self-hosted setups run without Supabase at all.

const SUPABASE_URL: string | undefined = (import.meta as any).env?.VITE_SUPABASE_URL;
const BACKEND_URL: string | undefined =
  (import.meta as any).env?.REACT_APP_BACKEND_URL ||
  (typeof process !== "undefined" ? (process as any).env?.REACT_APP_BACKEND_URL : undefined);

const isUsableSupabase = (u?: string): u is string => {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    // A "placeholder" host is any non-supabase.co or literal "placeholder".
    if (parsed.hostname.includes("placeholder")) return false;
    return parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
};

export const proxyEndpoint = (): string => {
  if (isUsableSupabase(SUPABASE_URL)) {
    return `${SUPABASE_URL!.replace(/\/$/, "")}/functions/v1/iptv-proxy`;
  }
  if (BACKEND_URL) {
    return `${BACKEND_URL.replace(/\/$/, "")}/api/iptv-proxy`;
  }
  // Same-origin fallback (Vite dev w/ proxy, or backend serving the frontend).
  return "/api/iptv-proxy";
};

export const proxyMode = (): "supabase" | "backend" => {
  return isUsableSupabase(SUPABASE_URL) ? "supabase" : "backend";
};
