import { useState, CSSProperties } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
  width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', outline: 'none', boxSizing: 'border-box',
};

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={bg}>
      <div style={card}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 50 50" fill="none" style={{ margin: '0 auto' }}>
            <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
            <circle cx="21" cy="14" r="2" fill="white"/>
            <circle cx="29" cy="14" r="2" fill="white"/>
          </svg>
          <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a', letterSpacing: '-0.03em', marginTop: 10 }}>Shikshantaram OS</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 28 }}>Your digital product universe</div>
        </div>

        {/* Access notice */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 50, padding: '6px 16px', fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>
            🔒 Access by invitation only
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={inputStyle} placeholder="you@example.com"
              onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={inputStyle} placeholder="••••••••"
              onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: '#7c3aed', cursor: 'pointer' }}>Forgot password?</span>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontFamily: 'Sora', fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)', transition: 'all 0.18s', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#991b1b', marginTop: 12 }}>
              {error}
            </div>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          Don't have access? Contact us<br />
          <span style={{ color: '#7c3aed', fontWeight: 600 }}>shikshantaram@gmail.com</span>
        </div>
      </div>
    </div>
  );
}
