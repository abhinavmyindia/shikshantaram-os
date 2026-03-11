import { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import SplashScreen from "@/pages/SplashScreen";
import LoginScreen from "@/pages/LoginScreen";
import RevokedScreen from "@/pages/RevokedScreen";
import AdminPanel from "@/pages/AdminPanel";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import IdleWarningModal from "@/components/IdleWarningModal";
import { supabase } from "@/integrations/supabase/client";

export default function AppRoutes() {
  const { user, profile, isAdmin, loading } = useAuth();
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  const handleIdleWarning = useCallback(() => setShowIdleWarning(true), []);
  const handleIdleLogout = useCallback(() => {
    setShowIdleWarning(false);
    window.location.href = '/';
  }, []);

  const { resetActivity } = useIdleLogout(
    handleIdleWarning,
    handleIdleLogout,
    !!user
  );

  if (loading) return <SplashScreen />;
  if (!user) return <LoginScreen />;
  if (profile?.access_tier === 'revoked') return <RevokedScreen />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={isAdmin ? <AdminPanel /> : <Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <IdleWarningModal
        isVisible={showIdleWarning}
        onStayLoggedIn={() => {
          setShowIdleWarning(false);
          resetActivity();
        }}
        onLogoutNow={async () => {
          setShowIdleWarning(false);
          const sessionToken = localStorage.getItem('shikshantaram_session_token');
          if (sessionToken) {
            await supabase.functions.invoke('end-session', {
              body: { sessionToken, reason: 'user_initiated_idle_logout' }
            }).catch(() => {});
            localStorage.removeItem('shikshantaram_session_token');
          }
          await supabase.auth.signOut();
          window.location.href = '/';
        }}
      />
    </>
  );
}
