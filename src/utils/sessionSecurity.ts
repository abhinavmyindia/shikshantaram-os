import { supabase } from '@/integrations/supabase/client';
import { logError } from './errorTracker';

const SESSION_TOKEN_KEY = 'shikshantaram_session_token';

export const initSession = async (userId: string, userEmail: string): Promise<{
  allowed: boolean;
  reason?: string;
  message?: string;
}> => {
  try {
    let sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      sessionToken = crypto.randomUUID();
      localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    }

    const result = await supabase.functions.invoke('log-session', {
      body: {
        userId,
        userEmail,
        userAgent: navigator.userAgent,
        sessionToken,
      }
    });

    return result.data || { allowed: true };
  } catch (err) {
    logError('session_init_error', String(err));
    return { allowed: true };
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
