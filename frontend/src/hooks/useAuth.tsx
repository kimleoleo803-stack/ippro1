import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  apiLogin,
  apiMe,
  clearSession,
  getStoredUser,
  getToken,
  setSession,
  type NadiUser,
} from "@/lib/nadiAuth";
import { clearManagedProfile } from "@/hooks/useSubscriberProfileSync";

type AuthState = {
  user: NadiUser | null;
  isGuest: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<NadiUser>;
  logout: () => void;
  continueAsGuest: () => void;
  refresh: () => Promise<void>;
};

const GUEST_KEY = "nadi_is_guest";

const AuthCtx = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<NadiUser | null>(() => getStoredUser());
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GUEST_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !!getToken() && !getStoredUser());

  // Validate stored token on mount
  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setSession(res.access_token, res.user);
    setUser(res.user);
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* noop */
    }
    setIsGuest(false);
    // If admin signs in, wipe any leftover subscriber-managed profile from a previous session.
    if (res.user.role !== "user") clearManagedProfile();
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearManagedProfile();
    clearSession();
    setUser(null);
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* noop */
    }
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    clearManagedProfile();
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch {
      /* noop */
    }
    setIsGuest(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const u = await apiMe();
      setUser(u);
    } catch {
      clearSession();
      setUser(null);
    }
  }, []);

  return (
    <AuthCtx.Provider value={{ user, isGuest, loading, login, logout, continueAsGuest, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
