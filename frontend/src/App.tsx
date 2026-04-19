import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index.tsx";
import LiveTV from "./pages/LiveTV.tsx";
import Movies from "./pages/Movies.tsx";
import SeriesPage from "./pages/SeriesPage.tsx";
import Account from "./pages/Account.tsx";
import Login from "./pages/Login.tsx";
import DeviceActivation from "./pages/DeviceActivation.tsx";
import PairPortal from "./pages/PairPortal.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const SPLASH_SESSION_KEY = "nadibox_splash_shown";

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
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/live-tv" element={<LiveTV />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/account" element={<Account />} />
            <Route path="/login" element={<Login />} />
            <Route path="/activate" element={<DeviceActivation />} />
            <Route path="/pair" element={<PairPortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
