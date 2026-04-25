import { useEffect, useState, CSSProperties } from 'react';

interface Props {
  trialEndsAt: string; // ISO timestamp
  onClick?: () => void;
}

function fmt(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, expired: true };
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  return { d, h, m, expired: false };
}

export default function TrialCountdownPill({ trialEndsAt, onClick }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000); // 30s refresh
    return () => clearInterval(t);
  }, []);

  const endTs = new Date(trialEndsAt).getTime();
  const diff = endTs - now;
  const { d, h, m, expired } = fmt(diff);

  // urgency: <24h = red, <72h = orange, else purple
  let bg = 'linear-gradient(135deg,#7c3aed,#a855f7)';
  let shadow = '0 2px 10px rgba(124,58,237,0.35)';
  let label: string;
  if (expired) {
    bg = 'linear-gradient(135deg,#dc2626,#ef4444)';
    shadow = '0 2px 10px rgba(220,38,38,0.45)';
    label = '⛔ Trial Expired';
  } else if (diff < 24 * 3600 * 1000) {
    bg = 'linear-gradient(135deg,#dc2626,#ef4444)';
    shadow = '0 2px 12px rgba(220,38,38,0.45)';
    label = h > 0 ? `⏰ ${h}h ${m}m left` : `⏰ ${m}m left`;
  } else if (diff < 72 * 3600 * 1000) {
    bg = 'linear-gradient(135deg,#ea580c,#f59e0b)';
    shadow = '0 2px 10px rgba(234,88,12,0.4)';
    label = `⏳ ${d}d ${h}h left`;
  } else {
    label = `🎁 Trial · ${d}d ${h}h left`;
  }

  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: bg, color: 'white',
    padding: '6px 12px', borderRadius: 50, cursor: onClick ? 'pointer' : 'default',
    fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, fontWeight: 800,
    border: '1px solid rgba(255,255,255,0.25)', boxShadow: shadow,
    letterSpacing: '0.02em', whiteSpace: 'nowrap', transition: 'transform 0.18s',
  };

  return (
    <div onClick={onClick} style={style}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
      title={expired ? 'Your trial has ended' : `Trial ends ${new Date(trialEndsAt).toLocaleString('en-IN')}`}
    >
      {label}
    </div>
  );
}
