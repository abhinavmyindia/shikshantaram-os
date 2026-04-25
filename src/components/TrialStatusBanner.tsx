import { useEffect, useState, CSSProperties } from 'react';

interface Props {
  trialEndsAt: string;
  fullName?: string;
  paymentLink?: string;
}

const PAYMENT_LINK_DEFAULT = 'https://rzp.io/rzp/osaccess';

function diffParts(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, expired: true };
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  return { d, h, m, expired: false };
}

export default function TrialStatusBanner({ trialEndsAt, fullName, paymentLink = PAYMENT_LINK_DEFAULT }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const endTs = new Date(trialEndsAt).getTime();
  const diff = endTs - now;
  const { d, h, m, expired } = diffParts(diff);

  // Tone selection
  let bg = 'linear-gradient(135deg, rgba(124,58,237,0.07), rgba(168,85,247,0.05))';
  let border = '1.5px solid rgba(124,58,237,0.25)';
  let icon = '🎁';
  let titleColor = '#5b21b6';
  let pillBg = 'linear-gradient(135deg,#7c3aed,#a855f7)';
  let pillShadow = '0 4px 14px rgba(124,58,237,0.35)';
  let title = 'Your free trial is active';

  if (expired) {
    bg = 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(239,68,68,0.06))';
    border = '1.5px solid rgba(220,38,38,0.3)';
    icon = '⛔';
    titleColor = '#991b1b';
    pillBg = 'linear-gradient(135deg,#dc2626,#ef4444)';
    pillShadow = '0 4px 14px rgba(220,38,38,0.4)';
    title = 'Your trial has ended';
  } else if (diff < 24 * 3600 * 1000) {
    bg = 'linear-gradient(135deg, rgba(220,38,38,0.06), rgba(234,88,12,0.06))';
    border = '1.5px solid rgba(220,38,38,0.28)';
    icon = '⏰';
    titleColor = '#991b1b';
    pillBg = 'linear-gradient(135deg,#dc2626,#ef4444)';
    pillShadow = '0 4px 14px rgba(220,38,38,0.4)';
    title = 'Less than 24 hours left in your trial';
  } else if (diff < 72 * 3600 * 1000) {
    bg = 'linear-gradient(135deg, rgba(234,88,12,0.06), rgba(245,158,11,0.06))';
    border = '1.5px solid rgba(234,88,12,0.28)';
    icon = '⏳';
    titleColor = '#9a3412';
    pillBg = 'linear-gradient(135deg,#ea580c,#f59e0b)';
    pillShadow = '0 4px 14px rgba(234,88,12,0.4)';
    title = 'Your trial is ending soon';
  }

  const endDateStr = new Date(trialEndsAt).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const remaining = expired
    ? 'Trial expired'
    : d > 0
      ? `${d} day${d === 1 ? '' : 's'} ${h}h ${m}m remaining`
      : h > 0
        ? `${h}h ${m}m remaining`
        : `${m}m remaining`;

  const wrap: CSSProperties = {
    background: bg, border, borderRadius: 16, padding: '16px 20px',
    margin: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 16, flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    backdropFilter: 'blur(12px)',
  };

  const ctaStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: pillBg, color: 'white', border: 'none', borderRadius: 50,
    padding: '11px 22px', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 13,
    cursor: 'pointer', textDecoration: 'none', boxShadow: pillShadow,
    transition: 'transform 0.18s',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 240 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, fontSize: 22,
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{icon}</div>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: titleColor, marginBottom: 3 }}>
            {title}{fullName ? `, ${fullName.split(' ')[0]}` : ''}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{remaining}</span>
            {!expired && <span> · ends {endDateStr}</span>}
          </div>
        </div>
      </div>
      <a href={paymentLink} target="_blank" rel="noopener noreferrer" style={ctaStyle}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'}
      >
        {expired ? 'Reactivate access ₹29,500' : 'Upgrade to full access ₹29,500'} →
      </a>
    </div>
  );
}
