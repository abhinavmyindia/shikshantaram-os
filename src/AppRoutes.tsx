import { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import SplashScreen from "@/pages/SplashScreen";
import LoginScreen from "@/pages/LoginScreen";
import RevokedScreen from "@/pages/RevokedScreen";
import ResetPassword from "@/pages/ResetPassword";
import AdminPanel from "@/pages/AdminPanel";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import TrialPage from "@/pages/TrialPage";
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

  // ── SECURITY: Final safety net for password recovery flow ────────────────
  // Even if Layers 1–3 fail, refuse to render the dashboard during recovery.
  const isRecoveryFlow = typeof window !== 'undefined' && sessionStorage.getItem('supabase_recovery_flow') === 'true';
  if (isRecoveryFlow && window.location.pathname !== '/reset-password') {
    window.location.replace('/reset-password');
    return <SplashScreen />;
  }

  // /reset-password and /trial must be accessible regardless of auth state.
  // Normalize: collapse repeated slashes (handles malformed links like //reset-password)
  const path = window.location.pathname.replace(/\/{2,}/g, '/');

  if (path === '/reset-password') {
    // If URL was malformed, replace it cleanly so the recovery hash is preserved
    if (window.location.pathname !== '/reset-password') {
      window.history.replaceState(null, '', '/reset-password' + window.location.search + window.location.hash);
    }
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (path === '/trial') {
    return (
      <Routes>
        <Route path="/trial" element={<TrialPage />} />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginScreen />} />
      </Routes>
    );
  }

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
