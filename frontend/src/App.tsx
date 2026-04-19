import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, type ReactNode } from "react";
import SplashScreen from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useSubscriberProfileSync } from "@/hooks/useSubscriberProfileSync";
import Welcome from "./pages/Welcome.tsx";
import Login from "./pages/Login.tsx";
import Admin from "./pages/Admin.tsx";
import ConnectProfile from "./pages/ConnectProfile.tsx";
import Index from "./pages/Index.tsx";
import LiveTV from "./pages/LiveTV.tsx";
import Movies from "./pages/Movies.tsx";
import SeriesPage from "./pages/SeriesPage.tsx";
import Account from "./pages/Account.tsx";
import DeviceActivation from "./pages/DeviceActivation.tsx";
import PairPortal from "./pages/PairPortal.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const SPLASH_SESSION_KEY = "nadibox_splash_shown";

// Gate the "home" pages: visitor must either be guest OR logged-in user.
const RequireEntry = ({ children }: { children: ReactNode }) => {
  const { user, isGuest, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user && !isGuest) {
    return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  }
  // Admins should land on /admin, not the regular home — unless they explicitly visit one.
  if (user?.role === "admin" && location.pathname === "/") {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
};

const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  useSubscriberProfileSync(user ? { id: user.id, role: user.role } : null);
  return (
    <Routes>
    <Route path="/welcome" element={<Welcome />} />
    <Route path="/login" element={<Login />} />
    <Route path="/connect" element={<ConnectProfile />} />

    <Route
      path="/admin"
      element={
        <RequireAdmin>
          <Admin />
        </RequireAdmin>
      }
    />

    <Route
      path="/"
      element={
        <RequireEntry>
          <Index />
        </RequireEntry>
      }
    />
    <Route
      path="/live-tv"
      element={
        <RequireEntry>
          <LiveTV />
        </RequireEntry>
      }
    />
    <Route
      path="/movies"
      element={
        <RequireEntry>
          <Movies />
        </RequireEntry>
      }
    />
    <Route
      path="/series"
      element={
        <RequireEntry>
          <SeriesPage />
        </RequireEntry>
      }
    />
    <Route
      path="/account"
      element={
        <RequireEntry>
          <Account />
        </RequireEntry>
      }
    />
    <Route path="/activate" element={<DeviceActivation />} />
    <Route path="/pair" element={<PairPortal />} />
    <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
