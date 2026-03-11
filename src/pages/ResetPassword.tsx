import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password) { setError('Please enter a new password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Failed to reset password. The link may have expired.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = '/'; }, 3000);
  };

  if (success) {
    return (
      <div style={bg}>
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>Password Reset!</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Your password has been updated successfully. Redirecting you to login...
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
            {sessionReady ? 'Enter your new password below.' : 'Verifying reset link...'}
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
              {loading ? 'Resetting...' : '🔐 Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <a href="/" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
                ← Back to Login
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
