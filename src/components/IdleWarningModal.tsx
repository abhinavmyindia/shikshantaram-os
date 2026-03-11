import { useState, useEffect } from 'react';

const IdleWarningModal = ({
  isVisible,
  onStayLoggedIn,
  onLogoutNow,
}: {
  isVisible: boolean;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}) => {
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    if (!isVisible) { setCountdown(300); return; }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); onLogoutNow(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isVisible, onLogoutNow]);

  if (!isVisible) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '40px 36px', maxWidth: 400, width: '92%',
        textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
        <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>
          Still there?
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
          You've been idle for 1 hour. For your security,
          you'll be automatically logged out in:
        </div>
        <div style={{ marginBottom: 24 }}>
          <span style={{
            fontFamily: 'Sora', fontWeight: 900, fontSize: 48, color: countdown <= 60 ? '#ef4444' : '#7c3aed',
            transition: 'color 0.3s',
          }}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            minutes remaining
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onLogoutNow} style={{
            flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#64748b', fontFamily: 'DM Sans', fontWeight: 700,
            fontSize: 13, cursor: 'pointer',
          }}>
            Log Out Now
          </button>
          <button onClick={onStayLoggedIn} style={{
            flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            ✋ I'm Still Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleWarningModal;
