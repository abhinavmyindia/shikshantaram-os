import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SplashScreen from "@/pages/SplashScreen";
import LoginScreen from "@/pages/LoginScreen";
import RevokedScreen from "@/pages/RevokedScreen";
import AdminPanel from "@/pages/AdminPanel";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

export default function AppRoutes() {
  const { user, profile, isAdmin, loading } = useAuth();

  if (loading) return <SplashScreen />;
  if (!user) return <LoginScreen />;
  if (profile?.access_tier === 'revoked') return <RevokedScreen />;

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/admin" element={isAdmin ? <AdminPanel /> : <Index />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
