// Lightweight auth client for NADIBOX custom JWT auth.
// Token is stored in localStorage (role-agnostic).
const TOKEN_KEY = "nadi_auth_token";
const USER_KEY = "nadi_auth_user";

const BASE = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "";

export type NadiUser = {
  id: string;
  username: string;
  role: "admin" | "user";
  created_at?: string;
  expiry_at?: string | null;
  days_remaining?: number | null;
  is_expired?: boolean;
  xtream_mode?: "shared" | "own";
  xtream_server?: string;
  xtream_username?: string;
  xtream_password?: string;
  note?: string;
};

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredUser = (): NadiUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as NadiUser) : null;
  } catch {
    return null;
  }
};

export const setSession = (token: string, user: NadiUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export function formatApiErrorDetail(detail: unknown): string {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof (detail as any).msg === "string") return (detail as any).msg;
  return String(detail);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth: boolean = false,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* no json */
  }
  if (!res.ok) {
    const msg = formatApiErrorDetail(data?.detail) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ---- Public auth ----
export const apiLogin = (username: string, password: string) =>
  request<{ access_token: string; user: NadiUser }>("POST", "/api/auth/login", {
    username,
    password,
  });

export const apiMe = () => request<NadiUser>("GET", "/api/auth/me", undefined, true);

// ---- Subscription (authenticated) ----
export type SubscriptionStatus = {
  user: NadiUser;
  xtream: { server: string; username: string; password: string };
  whatsapp_number: string;
};

export const apiSubscriptionStatus = () =>
  request<SubscriptionStatus>("GET", "/api/subscription/status", undefined, true);

// ---- Admin ----
export const apiListUsers = () =>
  request<NadiUser[]>("GET", "/api/admin/users", undefined, true);

export type CreateUserInput = {
  username: string;
  password: string;
  days: number;
  xtream_mode: "shared" | "own";
  xtream_server?: string;
  xtream_username?: string;
  xtream_password?: string;
  note?: string;
};

export const apiCreateUser = (body: CreateUserInput) =>
  request<NadiUser>("POST", "/api/admin/users", body, true);

export type UpdateUserInput = Partial<{
  password: string;
  extend_days: number;
  set_expiry_at: string;
  xtream_mode: "shared" | "own";
  xtream_server: string;
  xtream_username: string;
  xtream_password: string;
  note: string;
}>;

export const apiUpdateUser = (id: string, body: UpdateUserInput) =>
  request<NadiUser>("PUT", `/api/admin/users/${id}`, body, true);

export const apiDeleteUser = (id: string) =>
  request<{ ok: boolean }>("DELETE", `/api/admin/users/${id}`, undefined, true);

export type Settings = {
  whatsapp_number: string;
  shared_xtream_server: string;
  shared_xtream_username: string;
  shared_xtream_password: string;
};

export const apiGetSettings = () =>
  request<Settings>("GET", "/api/admin/settings", undefined, true);

export const apiUpdateSettings = (body: Partial<Settings>) =>
  request<Settings>("PUT", "/api/admin/settings", body, true);
