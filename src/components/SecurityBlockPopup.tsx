import React from 'react';

interface SecurityBlockPopupProps {
  reason: string;
  message: string;
  onClose: () => void;
}

const icons: Record<string, string> = {
  blocked: '🚫',
  concurrent_session: '📱',
  ip_limit: '🔒',
};

const titles: Record<string, string> = {
  blocked: 'Account Access Blocked',
  concurrent_session: 'Already Logged In Elsewhere',
  ip_limit: 'New Device Not Recognized',
};

const SecurityBlockPopup: React.FC<SecurityBlockPopupProps> = ({ reason, message, onClose }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        maxWidth: 420, width: '100%', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{
          height: 72, background: reason === 'blocked'
            ? 'linear-gradient(135deg,#ef4444,#dc2626)'
            : reason === 'concurrent_session'
            ? 'linear-gradient(135deg,#f59e0b,#ea580c)'
            : 'linear-gradient(135deg,#7c3aed,#a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 28 }}>{icons[reason] || '⚠️'}</span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 16, color: 'white' }}>
            {titles[reason] || 'Access Restricted'}
          </span>
        </div>

        {/* Body */}
        <div style={{ background: 'white', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#475569',
            lineHeight: 1.7, marginBottom: 24,
          }}>
            {message}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#25D366', color: 'white', border: 'none', borderRadius: 12,
                padding: '12px 20px', fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              📱 Contact Support on WhatsApp
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: 12,
                padding: '12px 20px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                fontSize: 13, color: '#64748b', cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>

          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94a3b8', marginTop: 16,
          }}>
            Ref: {reason?.toUpperCase()} · {new Date().toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityBlockPopup;
