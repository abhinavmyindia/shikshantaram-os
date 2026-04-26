import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PAYMENT_LINK = 'https://rzp.io/rzp/osaccess';

interface Props {
  fullName?: string;
  email?: string;
}

export default function TrialExpiryPopup({ fullName }: Props) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
        overflowY: 'auto',
        animation: 'tepFadeIn 0.3s ease',
      }}
    >
      <style>{`
        @keyframes tepFadeIn { from { opacity:0;} to { opacity:1;} }
        @keyframes tepPopIn { from { opacity:0; transform:scale(0.94) translateY(12px);} to { opacity:1; transform:scale(1) translateY(0);} }
        @keyframes tepSlideUp { from { opacity:0; transform: translateY(40px);} to { opacity:1; transform: translateY(0);} }
        @keyframes tepFloat { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-6px);} }
        .tep-card::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        className="tep-card"
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 520,
          maxHeight: isMobile ? '92vh' : 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: isMobile ? '24px 24px 0 0' : 20,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none' as any,
          animation: isMobile
            ? 'tepSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)'
            : 'tepPopIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Hero / Orange header */}
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? '28px 24px 22px' : '36px 32px 28px',
            textAlign: 'center',
            background: 'linear-gradient(135deg,#dc2626,#ea580c)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: isMobile ? '24px 24px 0 0' : '20px 20px 0 0',
          }}
        >
          <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: -40, right: -40 }} />
          <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: -30, left: -20 }} />
          <div style={{ fontSize: isMobile ? 48 : 56, marginBottom: 8, animation: 'tepFloat 3s ease-in-out infinite', position: 'relative' }}>⛔</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: isMobile ? 22 : 26, letterSpacing: '-0.02em', position: 'relative' }}>
            Your Trial Has Ended
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: isMobile ? 13 : 13.5, marginTop: 8, opacity: 0.95, position: 'relative' }}>
            {fullName ? `Thanks for trying us out, ${fullName.split(' ')[0]}!` : 'Thanks for trying us out!'}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            padding: isMobile
              ? '22px 24px calc(28px + env(safe-area-inset-bottom))'
              : '28px 32px 32px',
          }}
        >
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: isMobile ? 13.5 : 14.5,
            color: '#334155', lineHeight: 1.7, marginBottom: 18, textAlign: 'center',
          }}>
            Your 7-day free trial is over. Upgrade now to keep your work, your saved items, and unlock unlimited access to all 8 tools.
          </div>

          {/* Founder note */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(236,72,153,0.04))',
            borderLeft: '3px solid #7c3aed', borderRadius: 10, padding: '14px 16px', marginBottom: 18,
          }}>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic',
              fontSize: isMobile ? 13.5 : 13.5, color: '#334155', lineHeight: 1.7,
            }}>
              "I built Shikshantaram OS for exactly one reason — to help people like you stop overthinking and start building something real. Your trial showed you what's possible. Now let's make it permanent. The full platform, unlimited access, all tools, forever — for ₹29,500. That's less than what one client project pays you."
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 700, color: '#7c3aed', marginTop: 8 }}>
              — Abhinav, Founder
            </div>
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
              <div key={t} style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: isMobile ? 14 : 13,
                color: '#475569', padding: '3px 0',
              }}>{t}</div>
            ))}
          </div>

          <a
            href={PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center',
              padding: isMobile ? '14px 24px' : '14px 20px',
              borderRadius: 14,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: 'white',
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 15,
              textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
              marginBottom: 10,
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
          >
            🚀 Upgrade Now — ₹29,500
          </a>

          <a
            href="https://wa.me/918933966250?text=Hi%2C%20I%20already%20paid%20for%20Shikshantaram%20OS%20full%20access.%20Please%20upgrade%20my%20account."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center',
              padding: '10px 14px', marginBottom: 6,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: isMobile ? 12 : 12.5,
              color: '#475569', textDecoration: 'none', fontWeight: 600,
            }}
          >
            💬 Already paid? WhatsApp us and we'll upgrade your access within 2 hours.
          </a>

          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: 12,
              marginTop: isMobile ? 12 : 'auto',
              background: 'none',
              border: 'none',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: isMobile ? 12 : 12.5,
              color: '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
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
