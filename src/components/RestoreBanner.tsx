import { CSSProperties } from 'react';

const s = (styles: CSSProperties): CSSProperties => styles;

const fmtRelative = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

interface RestoreBannerProps {
  title: string;
  createdAt?: string;
  onRestore: () => void;
  onDismiss: () => void;
}

export default function RestoreBanner({ title, createdAt, onRestore, onDismiss }: RestoreBannerProps) {
  return (
    <div style={s({
      background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(168,85,247,0.04))',
      border: '1px solid rgba(124,58,237,0.15)',
      borderRadius: 16,
      padding: '14px 18px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      animation: 'fadeUp 0.3s ease',
    })}>
      <div style={s({ display: 'flex', alignItems: 'center', gap: 12 })}>
        <span style={s({ fontSize: 20 })}>🕐</span>
        <div>
          <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a' })}>
            Continue where you left off?
          </div>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#64748b', marginTop: 2 })}>
            {title}
            {createdAt && <> · {fmtRelative(createdAt)}</>}
          </div>
        </div>
      </div>
      <div style={s({ display: 'flex', gap: 8, flexShrink: 0 })}>
        <button
          onClick={onDismiss}
          style={s({
            padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
            background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans',
            fontWeight: 600, fontSize: 12, color: '#64748b',
          })}
        >
          Dismiss
        </button>
        <button
          onClick={onRestore}
          style={s({
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: 'white',
          })}
        >
          ↩ Restore
        </button>
      </div>
    </div>
  );
}
