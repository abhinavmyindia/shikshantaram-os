import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword } from '@/utils/passwordValidation';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

const bg: CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
  padding: 20,
};

const card: CSSProperties = {
  width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
  borderRadius: 24, padding: '40px 36px', border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.1)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#0f172a', outline: 'none',
  boxSizing: 'border-box', background: '#f8fafc', transition: 'all 0.18s', marginBottom: 16,
};

// Check password against HaveIBeenPwned API using k-anonymity (only first 5 chars of hash sent)
async function checkPwned(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) return false; // fail open — don't block user if API is down
    const text = await res.text();
    return text.split('\n').some(line => line.startsWith(suffix));
  } catch {
    return false; // fail open
  }
}

const cleanupRecoveryStorage = () => {
  sessionStorage.removeItem('supabase_recovery_flow');
  sessionStorage.removeItem('recovery_access_token');
  sessionStorage.removeItem('recovery_refresh_token');
};

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const establishRecoverySession = async () => {
      // Try to use tokens stashed by main.tsx (Layer 1)
      const accessToken = sessionStorage.getItem('recovery_access_token');
      const refreshToken = sessionStorage.getItem('recovery_refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (sessionError) {
          setInvalidLink(true);
          return;
        }
        sessionStorage.setItem('supabase_recovery_flow', 'true');
        setSessionReady(true);
        return;
      }

      // Fallback: maybe Supabase already established a recovery session via PASSWORD_RECOVERY event
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        sessionStorage.setItem('supabase_recovery_flow', 'true');
        setSessionReady(true);
        return;
      }

      // Listen briefly in case PASSWORD_RECOVERY arrives after mount
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if (cancelled) return;
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && s) {
          sessionStorage.setItem('supabase_recovery_flow', 'true');
          setSessionReady(true);
        }
      });

      // Give it 1.2s, then declare invalid
      setTimeout(() => {
        if (cancelled) return;
        subscription.unsubscribe();
        setSessionReady(prev => {
          if (!prev) setInvalidLink(true);
          return prev;
        });
      }, 1200);
    };

    establishRecoverySession();

    // Security: if the user navigates away without completing the reset,
    // sign them out so the recovery session can't be reused.
    const handleBeforeUnload = () => {
      // Use synchronous-ish cleanup; signOut is fire-and-forget
      cleanupRecoveryStorage();
      supabase.auth.signOut().catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async () => {
    if (!password) { setError('Please enter a new password.'); return; }

    const { allPassed } = validatePassword(password);
    if (!allPassed) { setError('Password does not meet all strength requirements.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');

    const isPwned = await checkPwned(password);
    if (isPwned) {
      setError('This password has appeared in a data breach. Please choose a different one.');
      setLoading(false);
      return;
    }

    // Capture the email BEFORE signOut so we can prefill the login form.
    const { data: { user: recoveryUser } } = await supabase.auth.getUser();
    const userEmail = recoveryUser?.email || '';

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Failed to reset password. The link may have expired.');
      setLoading(false);
      return;
    }

    // Success — wipe recovery state, sign the user out so they log in fresh.
    cleanupRecoveryStorage();
    if (userEmail) {
      // Persist normalized email so LoginScreen can prefill it — prevents the
      // common "wrong password" loop caused by typing a different email casing.
      try { sessionStorage.setItem('post_reset_email', userEmail.trim().toLowerCase()); } catch {}
    }
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = '/'; }, 2500);
  };

  // ── Invalid / expired link ──
  if (invalidLink) {
    return (
      <div style={bg}>
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>
              Reset Link Invalid or Expired
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
              This password reset link has expired or already been used. Reset links are valid for 1 hour and can only be used once.
            </div>
            <button
              onClick={() => { cleanupRecoveryStorage(); window.location.href = '/'; }}
              style={{
                width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
                fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              }}
            >
              ← Back to Login
            </button>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 }}>
              Use the "Forgot Password" link on the login page to request a new reset email.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={bg}>
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>Password Updated Successfully</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Your password has been changed. You'll be redirected to login with your new password in a moment...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={bg}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 20, color: '#0f172a', marginBottom: 6 }}>
            Set New Password
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748b' }}>
            {sessionReady ? 'Choose a strong password for your account.' : 'Verifying your reset link...'}
          </div>
        </div>

        {!sessionReady ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters" style={inputStyle}
            />

            <PasswordStrengthMeter password={password} />

            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Confirm Password
            </label>
            <input
              type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              style={{ ...inputStyle, marginBottom: 8 }}
            />

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
                ❌ {error}
              </div>
            )}

            <button onClick={handleReset} disabled={loading} style={{
              width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
              fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14,
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
              {loading ? 'Updating Password...' : '🔐 Set New Password →'}
            </button>

            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              You will be signed out after updating your password and must log in again with your new credentials.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
