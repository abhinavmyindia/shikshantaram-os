import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyReducedMotion, getReducedMotion } from "./hooks/useUserPrefs";

// ── SECURITY: Intercept password recovery links immediately ──────────────────
// Must run BEFORE Supabase processes the URL hash into a session.
// Without this, Supabase auto-creates a valid session from the recovery hash
// and the user lands in the dashboard without ever changing their password.
(() => {
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    sessionStorage.setItem('supabase_recovery_flow', 'true');
    if (accessToken) sessionStorage.setItem('recovery_access_token', accessToken);
    if (refreshToken) sessionStorage.setItem('recovery_refresh_token', refreshToken);

    // Strip the hash so Supabase can't read it once it initialises.
    window.history.replaceState({}, '', window.location.pathname);

    if (window.location.pathname !== '/reset-password') {
      window.location.replace('/reset-password');
      // Stop further script execution on this load
      throw new Error('__redirect_to_reset_password__');
    }
  }
})();

// Apply reduced motion preference before React mounts so the very first paint respects it.
applyReducedMotion(getReducedMotion());

createRoot(document.getElementById("root")!).render(<App />);
