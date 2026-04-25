import { CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PAYMENT_LINK = 'https://rzp.io/rzp/osaccess';

interface Props {
  fullName?: string;
  email?: string;
}

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(5,10,20,0.82)', backdropFilter: 'blur(16px) saturate(150%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  animation: 'tepFadeIn 0.3s ease',
};

const card: CSSProperties = {
  width: '100%', maxWidth: 480, borderRadius: 24, overflow: 'hidden',
  boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
  animation: 'tepPopIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
};

export default function TrialExpiryPopup({ fullName, email }: Props) {
  const handleSignOut = async () => {
    try {
      const sessionToken = localStorage.getItem('shikshantaram_session_token');
      if (sessionToken) {
        await supabase.functions.invoke('end-session', {
          body: { sessionToken, reason: 'trial_expired' },
        }).catch(() => {});
        localStorage.removeItem('shikshantaram_session_token');
      }
      await supabase.auth.signOut();
    } catch {}
    window.location.href = '/';
  };

  return (
    <div style={overlay}>
      <style>{`
        @keyframes tepFadeIn { from { opacity:0;} to { opacity:1;} }
        @keyframes tepPopIn { from { opacity:0; transform:scale(0.92) translateY(12px);} to { opacity:1; transform:scale(1) translateY(0);} }
        @keyframes tepFloat { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-6px);} }
      `}</style>
      <div style={card}>
        {/* Hero */}
        <div style={{
          padding: '32px 28px 24px', textAlign: 'center',
          background: 'linear-gradient(135deg,#dc2626,#ea580c)', color: 'white', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: -40, right: -40 }} />
          <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: -30, left: -20 }} />
          <div style={{ fontSize: 56, marginBottom: 8, animation: 'tepFloat 3s ease-in-out infinite' }}>⛔</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em' }}>
            Your Trial Has Ended
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, marginTop: 8, opacity: 0.95 }}>
            {fullName ? `Thanks for trying us out, ${fullName.split(' ')[0]}!` : 'Thanks for trying us out!'}
          </div>
        </div>

        {/* Body */}
        <div style={{ background: 'white', padding: '28px 28px 24px' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14.5, color: '#334155', lineHeight: 1.7, marginBottom: 18, textAlign: 'center' }}>
            Your 7-day free trial is over. Upgrade now to keep your work, your saved items, and unlock unlimited access to all 8 tools.
          </div>

          <div style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(168,85,247,0.04))',
            border: '1px solid rgba(124,58,237,0.18)', borderRadius: 14, padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>
              🎁 What you get with full access:
            </div>
            {[
              '✅ All 8 tools unlocked',
              '✅ Your trial work preserved',
              '✅ 500+ bonus credits on upgrade',
              '✅ Lifetime updates included',
            ].map(t => (
              <div key={t} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#475569', padding: '3px 0' }}>{t}</div>
            ))}
          </div>

          <a href={PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '14px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
              fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(124,58,237,0.4)', marginBottom: 10, transition: 'transform 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
          >
            🚀 Upgrade Now — ₹2,999
          </a>

          <button onClick={handleSignOut}
            style={{
              width: '100%', padding: 12, marginTop: 4, background: 'none', border: 'none',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: '#64748b', fontWeight: 600, cursor: 'pointer',
            }}>
            Sign out
          </button>

          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9',
            fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: '#94a3b8', textAlign: 'center',
          }}>
            Need help? Email <a href="mailto:support@shikshantaram.in" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>support@shikshantaram.in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
