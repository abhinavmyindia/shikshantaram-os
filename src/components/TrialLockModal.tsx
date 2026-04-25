import { CSSProperties } from 'react';

const PAYMENT_LINK = 'https://rzp.io/rzp/osaccess';

export type LockedTool = 'offer' | 'funnel' | 'copy_suite' | 'knowledge_base';

interface Props {
  tool: LockedTool;
  onClose: () => void;
}

const TOOL_COPY: Record<LockedTool, { emoji: string; title: string; pitch: string; gradient: string; }> = {
  offer: {
    emoji: '🎁',
    title: 'Offer Creation is for full members',
    pitch: 'Build conversion-tested offers with pricing psychology, bonuses, and positioning frameworks. Available with full access.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  funnel: {
    emoji: '🪜',
    title: 'Funnel Builder is for full members',
    pitch: 'Map out your complete sales funnel — from lead magnet to high-ticket back-end — in 3 guided steps.',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  copy_suite: {
    emoji: '✍️',
    title: 'Copywriting Suite is for full members',
    pitch: 'Write sales pages, email sequences, ad copy, and hooks in minutes. 7 copy types, AI-powered, conversion-focused.',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
  knowledge_base: {
    emoji: '📚',
    title: 'Knowledge Base is for full members',
    pitch: 'Upload your PDFs, docs, and notes — the AI uses them as your private expertise context across every tool.',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
};

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9000,
  background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(14px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  animation: 'tlmFadeIn 0.25s ease',
};

const card: CSSProperties = {
  width: '100%', maxWidth: 440, background: 'white', borderRadius: 24, overflow: 'hidden',
  boxShadow: '0 28px 80px rgba(0,0,0,0.4)', animation: 'tlmPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
};

export default function TrialLockModal({ tool, onClose }: Props) {
  const copy = TOOL_COPY[tool];
  return (
    <div style={overlay} onClick={onClose}>
      <style>{`
        @keyframes tlmFadeIn { from { opacity:0;} to { opacity:1;} }
        @keyframes tlmPopIn { from { opacity:0; transform:scale(0.92);} to { opacity:1; transform:scale(1);} }
      `}</style>
      <div style={card} onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div style={{
          padding: '28px 24px 22px', background: copy.gradient, color: 'white',
          position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}>
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: -40, right: -40 }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>✕</button>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{copy.emoji}</div>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '3px 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', fontFamily: 'DM Sans, sans-serif' }}>🔒 PREMIUM TOOL</div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 22px' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 19, color: '#0f172a', textAlign: 'center', marginBottom: 10, letterSpacing: '-0.02em' }}>
            {copy.title}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#475569', lineHeight: 1.7, textAlign: 'center', marginBottom: 18 }}>
            {copy.pitch}
          </div>

          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#0f172a', marginBottom: 8 }}>
              ✨ Upgrade for ₹2,999 to unlock:
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: '#475569', lineHeight: 1.7 }}>
              All 8 tools · 500 bonus credits · Lifetime updates · Your trial work kept
            </div>
          </div>

          <a href={PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '13px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
              fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(124,58,237,0.35)', marginBottom: 8,
            }}>
            🚀 Upgrade to Full Access →
          </a>
          <button onClick={onClose}
            style={{
              width: '100%', padding: 10, background: 'none', border: 'none',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94a3b8', fontWeight: 600, cursor: 'pointer',
            }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
