import { CSSProperties } from 'react';
import { useAuth } from '@/hooks/useAuth';

const bg: CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
  padding: 20,
};

export default function RevokedScreen() {
  const { signOut } = useAuth();
  return (
    <div style={bg}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
        borderRadius: 24, padding: '48px 36px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.1)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#991b1b', marginBottom: 12 }}>Access Suspended</h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
          Your access to Shikshantaram OS has been suspended. Please contact support to resolve this.
        </p>
        <a href="mailto:support@shikshantaram.com" style={{
          display: 'inline-block', padding: '10px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0',
          color: '#64748b', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, textDecoration: 'none',
          marginBottom: 12,
        }}>Contact Support →</a>
        <div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
