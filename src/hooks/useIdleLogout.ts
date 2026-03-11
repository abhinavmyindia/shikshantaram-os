import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const IDLE_WARNING_MS = 60 * 60 * 1000;   // 60 minutes → show warning
const IDLE_LOGOUT_MS  = 65 * 60 * 1000;   // 65 minutes → auto logout
const CHECK_INTERVAL  = 30 * 1000;         // Check every 30 seconds

export const useIdleLogout = (
  onWarning: () => void,
  onLogout: () => void,
  isLoggedIn: boolean
) => {
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

    intervalRef.current = setInterval(async () => {
      const idleMs = Date.now() - lastActivityRef.current;

      if (idleMs >= IDLE_LOGOUT_MS) {
        clearInterval(intervalRef.current);
        events.forEach(e => window.removeEventListener(e, resetActivity));

        const sessionToken = localStorage.getItem('shikshantaram_session_token');
        if (sessionToken) {
          await supabase.functions.invoke('end-session', {
            body: { sessionToken, reason: 'idle_timeout' }
          }).catch(() => {});
          localStorage.removeItem('shikshantaram_session_token');
        }

        await supabase.auth.signOut();
        onLogout();

      } else if (idleMs >= IDLE_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        onWarning();
      }
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(intervalRef.current);
      events.forEach(e => window.removeEventListener(e, resetActivity));
    };
  }, [isLoggedIn, onWarning, onLogout, resetActivity]);

  return { resetActivity };
};
