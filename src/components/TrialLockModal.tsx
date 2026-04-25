import { CSSProperties } from 'react';

export type LockedTool = 'offer' | 'funnel' | 'copy_suite' | 'knowledge_base';

interface Props {
  tool: LockedTool;
  onClose: () => void;
  onUpgrade: () => void;
}

const TRIAL_LOCK_MESSAGES: Record<LockedTool, { emoji: string; headline: string; body: string; gradient: string; }> = {
  offer: {
    emoji: '🎁',
    headline: "Offer Creation is a full-access feature",
    body: "You just found the tool that turns your product idea into a complete, irresistible offer — pricing strategy, value stack, guarantee script, objection handlers, the works. Trial users get the ideas. Full members get the offer that actually sells them. One upgrade away.",
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  funnel: {
    emoji: '🔀',
    headline: "Honestly? Seeing Funnel Builder would just make you upgrade faster.",
    body: "So we saved you the temptation. It builds your complete sales funnel — every page, every step, every email in the sequence — in one go. Trial users get to imagine it. Full members get to use it. You already know which one you want.",
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  copy_suite: {
    emoji: '✍️',
    headline: "The words that make people buy are behind this wall",
    body: "The Copy Suite writes your sales page, email sequence, social posts, and ads — all tuned to your exact niche and offer. Not generic copy. Your copy. Trial gives you the idea. Full membership gives you the words to sell it. That gap is ₹29,500.",
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
  knowledge_base: {
    emoji: '📚',
    headline: "Knowledge Base is where it gets scary personal",
    body: "Upload your resume, notes, or any document — and the AI finds product ideas only you could build, based on what you actually know. It's the most personalised feature on the platform. And yes, it's behind the upgrade. Because once you experience ideas built from your own expertise, generic AI tools feel broken forever.",
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
  width: '100%', maxWidth: 460, background: 'white', borderRadius: 24, overflow: 'hidden',
  boxShadow: '0 28px 80px rgba(0,0,0,0.4)', animation: 'tlmPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
};

export default function TrialLockModal({ tool, onClose, onUpgrade }: Props) {
  const copy = TRIAL_LOCK_MESSAGES[tool];
  const handleUpgrade = () => { onClose(); onUpgrade(); };

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
          <button onClick={onClose} aria-label="Close" style={{
            position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>✕</button>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{copy.emoji}</div>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '3px 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', fontFamily: 'DM Sans, sans-serif' }}>🔒 PREMIUM TOOL</div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 22px' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 19, color: '#0f172a', textAlign: 'center', marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {copy.headline}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#475569', lineHeight: 1.7, textAlign: 'center', marginBottom: 18 }}>
            {copy.body}
          </div>

          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#0f172a', marginBottom: 8 }}>
              ✨ Upgrade for ₹29,500 to unlock:
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: '#475569', lineHeight: 1.7 }}>
              All 8 tools · 500 bonus credits · Lifetime updates · Your trial work kept
            </div>
          </div>

          <button onClick={handleUpgrade}
            style={{
              display: 'block', width: '100%', textAlign: 'center', padding: '13px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', cursor: 'pointer',
              fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14,
              boxShadow: '0 4px 20px rgba(124,58,237,0.35)', marginBottom: 8,
            }}>
            Upgrade to Full Access — ₹29,500 →
          </button>
          <button onClick={onClose}
            style={{
              width: '100%', padding: 10, background: 'none', border: 'none',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94a3b8', fontWeight: 600, cursor: 'pointer',
            }}>
            Go back to trial
          </button>
        </div>
      </div>
    </div>
  );
}
