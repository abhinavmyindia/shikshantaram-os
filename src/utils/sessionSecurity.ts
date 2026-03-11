import { supabase } from '@/integrations/supabase/client';
import { logError } from './errorTracker';

const SESSION_TOKEN_KEY = 'shikshantaram_session_token';

export const initSession = async (
  userId: string,
  userEmail: string
): Promise<{ allowed: boolean; reason?: string; message?: string }> => {
  try {
    let sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      sessionToken = crypto.randomUUID();
      localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    }

    const { data, error } = await supabase.functions.invoke('log-session', {
      body: { userId, userEmail, userAgent: navigator.userAgent, sessionToken },
    });

    if (error) {
      console.warn('[SessionSecurity] log-session invoke error:', error);
      return { allowed: true }; // Fail open on network error
    }

    if (data?.allowed === false) {
      // CRITICAL: Sign out of Supabase immediately to prevent loophole
      localStorage.removeItem(SESSION_TOKEN_KEY);
      await supabase.auth.signOut();
      return {
        allowed: false,
        reason: data.reason,
        message: data.message,
      };
    }

    return { allowed: true };
  } catch (err: any) {
    console.warn('[SessionSecurity] initSession error:', err);
    logError('session_init_error', String(err));
    return { allowed: true }; // Fail open
  }
};

export const endSession = async () => {
  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!sessionToken) return;

  await supabase.functions.invoke('end-session', {
    body: { sessionToken, reason: 'user_logout' }
  });

  localStorage.removeItem(SESSION_TOKEN_KEY);
};
