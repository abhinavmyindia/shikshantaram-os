import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { endSession } from '@/utils/sessionSecurity';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  access_tier: 'trial' | 'basic' | 'premium' | 'beta' | 'revoked';
  payment_status: string;
  payment_amount: number;
  is_beta_user: boolean;
  is_trial?: boolean;
  trial_started_at?: string | null;
  trial_source_tier?: 'basic' | 'premium' | 'beta' | null;
  trial_ends_at?: string | null;
  trial_request_id?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setProfile(data as unknown as UserProfile);
  }, []);

  const checkAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    setIsAdmin(!!data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // ── SECURITY: Block recovery sessions from auto-logging into the dashboard ──
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('supabase_recovery_flow', 'true');
        if (window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password');
        }
        return;
      }

      // If a SIGNED_IN event fires during a recovery flow, sign out immediately.
      // (Supabase may process the hash before main.tsx intercepts it on slow loads.)
      if (event === 'SIGNED_IN' && session?.user) {
        const isRecoveryFlow = sessionStorage.getItem('supabase_recovery_flow') === 'true';
        if (isRecoveryFlow) {
          await supabase.auth.signOut();
          if (window.location.pathname !== '/reset-password') {
            window.location.replace('/reset-password');
          }
          return;
        }
      }

      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('supabase_recovery_flow');
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          await loadProfile(session.user.id);
          await checkAdmin(session.user.id);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, checkAdmin]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await endSession();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
