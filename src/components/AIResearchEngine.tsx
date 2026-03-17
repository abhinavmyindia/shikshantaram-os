import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithRetry } from '@/utils/retryFetch';
import { useSaveItem } from '@/hooks/useSaveItem';

/* ───────── Types ───────── */
interface ProductIdea {
  productName: string;
  tagline: string;
  targetAudience: string;
  priceRange: string;
  buildTime: string;
  marketSize: string;
  demandScore: number;
  competitionLevel: string;
  impulseScore: string;
  primaryPain: string;
  searchKeyword: string;
  ideaConnection?: string;
  sourceMode?: 'niche' | 'raw';
  originalIdea?: string;
}

interface IdeaAnalysis {
  ideaSummary: string;
  detectedNiche: string;
  detectedCategory: string;
  coreProblem: string;
  targetBuyer: string;
  ideaStrengths: string[];
  ideaGaps: string[];
  marketReadiness: string;
  marketReadinessReason: string;
  angles: {
    angleId: string;
    angleName: string;
    angleDescription: string;
    productFormat: string;
    priceRange: string;
    buildTime: string;
    whyThisWorks: string;
    demandSignal: string;
  }[];
  recommendedAngle: string;
  recommendedAngleReason: string;
}

interface ResearchReport {
  marketOverview: any;
  searchDemand: any;
  painPoints: any[];
  transformation: any;
  deepestDesires: any[];
  empathyMap: any;
  primarySolution: any;
  impulsePurchaseAnalysis: any;
  competitorLandscape: any;
  nextSteps: any[];
  launchStrategy: any;
}

/* ───────── Constants ───────── */
const NICHE_PILLS = [
  '💪 Fitness', '💰 Personal Finance', '🧘 Mental Wellness', '👨‍💼 Career Growth',
  '🤖 AI Productivity', '📸 Content Creation', '🍳 Cooking', '🎯 Entrepreneurship',
  '📚 Studying & Exams', '💑 Relationships',
];

const COUNTRIES = [
  { flag: '🇮🇳', name: 'India' }, { flag: '🇺🇸', name: 'United States' },
  { flag: '🇬🇧', name: 'United Kingdom' }, { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇦🇺', name: 'Australia' }, { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇸🇬', name: 'Singapore' }, { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇳🇬', name: 'Nigeria' }, { flag: '🇵🇭', name: 'Philippines' },
  { flag: '🇩🇪', name: 'Germany' }, { flag: '🌍', name: 'Global / Other' },
];

const PRODUCT_TYPES = [
  { emoji: '📖', name: 'Ebook / Guide', price: '₹199–₹999', accent: '#f59e0b' },
  { emoji: '📋', name: 'Template / System', price: '₹299–₹1499', accent: '#8b5cf6' },
  { emoji: '🤖', name: 'Prompt Pack', price: '₹199–₹799', accent: '#06b6d4' },
  { emoji: '🎓', name: 'Micro-Course', price: '₹999–₹4999', accent: '#f97316' },
  { emoji: '🎨', name: 'Canva Design', price: '₹199–₹999', accent: '#ec4899' },
  { emoji: '📊', name: 'Spreadsheet / Tracker', price: '₹299–₹1499', accent: '#22c55e' },
  { emoji: '📁', name: 'Swipe File', price: '₹199–₹799', accent: '#f59e0b' },
  { emoji: '⚙️', name: 'AI Tool / Workflow', price: '₹499–₹2999', accent: '#06b6d4' },
  { emoji: '💻', name: 'No-Code / SaaS', price: '₹999–₹9999', accent: '#0ea5e9' },
  { emoji: '👥', name: 'Membership', price: '₹299/mo–₹999/mo', accent: '#9333ea' },
  { emoji: '📦', name: 'Done-For-You Kit', price: '₹999–₹4999', accent: '#10b981' },
  { emoji: '📝', name: 'Workbook / Journal', price: '₹199–₹799', accent: '#f97316' },
  { emoji: '🎯', name: 'Challenge / Program', price: '₹499–₹2999', accent: '#7c3aed' },
];

const STEP_COLORS = ['#7c3aed', '#ea580c', '#059669', '#0891b2', '#ec4899'];

const RAW_EXAMPLES = [
  { emoji: '💼', text: 'LinkedIn guide for Indian freelancers' },
  { emoji: '📱', text: 'Instagram templates for small restaurants' },
  { emoji: '🎓', text: 'AI study tools for CA/MBA students' },
];

const ANGLE_COLORS: Record<string, string> = { A: '#ea580c', B: '#7c3aed', C: '#059669' };

/* ───────── Helpers ───────── */
const s = (styles: CSSProperties): CSSProperties => styles;

/* ───────── Loading Screen ───────── */
function LoadingScreen({ type, data, startTime }: { type: 'ideas' | 'report' | 'raw-ideas'; data: any; startTime?: number }) {
  const [elapsed, setElapsed] = useState(0);
  const ESTIMATED_SECONDS = type === 'report' ? 90 : type === 'raw-ideas' ? 45 : 40;

  useEffect(() => {
    const start = startTime || Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const progress = Math.min(95, (elapsed / ESTIMATED_SECONDS) * 100);
  const remaining = Math.max(0, ESTIMATED_SECONDS - elapsed);
  const timeLabel = remaining > 60 ? `~${Math.ceil(remaining / 60)}m remaining` : remaining > 0 ? `~${remaining}s remaining` : 'Almost done...';

  const steps = type === 'ideas'
    ? [
        `Scanning ${data.country} market trends...`,
        `Identifying high-demand niches in ${data.niche}...`,
        `Analyzing buyer pain points and psychology...`,
        `Generating 30 tailored product ideas...`,
      ]
    : type === 'raw-ideas'
    ? [
        `Expanding your concept into product variations...`,
        `Mapping sub-audiences and price points...`,
        `Identifying adjacent opportunities...`,
        `Generating 30 ideas built around your concept...`,
      ]
    : [
        `Searching ${data.country} market for ${data.searchKeyword}...`,
        `Analyzing buyer psychology and pain points...`,
        `Mapping desires, fears, and purchase triggers...`,
        `Building your full research report...`,
      ];

  // Which step is "active" based on elapsed time
  const activeStep = Math.min(steps.length - 1, Math.floor((elapsed / ESTIMATED_SECONDS) * steps.length));

  return (
    <div style={s({ textAlign: 'center', padding: '60px 20px', maxWidth: 500, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
      <div style={s({ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' })}>
        <div style={s({ width: 80, height: 80, border: '3px solid #f1f5f9', borderTop: '3px solid #ea580c', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' })} />
        <div style={s({ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 })}>
          {type === 'raw-ideas' ? '💡' : type === 'ideas' ? '🤖' : '🔬'}
        </div>
      </div>
      <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 })}>
        {type === 'ideas' ? 'Researching your market...' : type === 'raw-ideas' ? 'Building ideas from your concept...' : `Deep Research in progress...`}
      </div>
      <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' })}>
        {type === 'ideas'
          ? `Our AI is analyzing ${data.country} market data, buyer psychology, and product opportunities for ${data.niche}.`
          : type === 'raw-ideas'
          ? `Generating 30 product ideas anchored to your original concept for ${data.country}...`
          : `Analyzing market data, buyer psychology & competitive landscape for "${data.productName}"`}
      </div>

      {/* Progress bar */}
      <div style={s({ marginTop: 24, maxWidth: 360, margin: '24px auto 0' })}>
        <div style={s({ background: '#f1f5f9', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 8 })}>
          <div style={s({
            height: '100%',
            borderRadius: 999,
            background: type === 'report' ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : '#ea580c',
            width: `${progress}%`,
            transition: 'width 1s linear',
          })} />
        </div>
        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <span style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#ea580c' })}>{Math.round(progress)}%</span>
          <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>{timeLabel}</span>
        </div>
      </div>

      {/* Steps with active indicator */}
      <div style={s({ marginTop: 20, maxWidth: 360, margin: '20px auto 0' })}>
        {steps.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div key={i} style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', opacity: isDone ? 0.5 : 1, animation: `fadeUp 0.4s ease ${i * 0.3}s both` })}>
              {isDone ? (
                <div style={s({ width: 16, height: 16, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                  <span style={s({ color: 'white', fontSize: 10, fontWeight: 900 })}>✓</span>
                </div>
              ) : (
                <div style={s({ width: 16, height: 16, borderRadius: '50%', border: '2px solid #f1f5f9', borderTop: `2px solid ${isActive ? '#ea580c' : '#cbd5e1'}`, animation: isActive ? 'spinSlow 0.8s linear infinite' : 'none', flexShrink: 0 })} />
              )}
              <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: isActive ? '#0f172a' : isDone ? '#94a3b8' : '#475569', fontWeight: isActive ? 700 : 400 })}>{step}</span>
            </div>
          );
        })}
      </div>

      {type === 'report' && (
        <div style={s({ marginTop: 20, fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>
          ⏱ Deep Research typically takes 60–90 seconds
        </div>
      )}
    </div>
  );
}

/* ───────── Idea Analyzing Screen ───────── */
function IdeaAnalyzingScreen() {
  return (
    <div style={s({ textAlign: 'center', padding: '40px 20px', animation: 'fadeUp 0.4s ease' })}>
      <div style={s({ fontSize: 56, marginBottom: 16, animation: 'floatBounce 2s ease-in-out infinite' })}>💡</div>
      <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginTop: 16 })}>Analyzing your idea...</div>
      <div style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 6 })}>Breaking down your concept into market opportunities...</div>
      <div style={s({ marginTop: 24, maxWidth: 320, margin: '24px auto 0' })}>
        <div style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', animation: 'fadeUp 0.4s ease 0s both' })}>
          <div style={s({ width: 14, height: 14, borderRadius: '50%', border: '2px solid #f1f5f9', borderTop: '2px solid #7c3aed', animation: 'spinSlow 0.8s linear infinite', flexShrink: 0 })} />
          <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569' })}>Understanding your core concept...</span>
        </div>
        <div style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', animation: 'fadeUp 0.4s ease 0.5s both' })}>
          <div style={s({ width: 14, height: 14, borderRadius: '50%', border: '2px solid #f1f5f9', borderTop: '2px solid #7c3aed', animation: 'spinSlow 0.8s linear infinite', flexShrink: 0 })} />
          <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569' })}>Identifying market angles & opportunities...</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── Report Section (with loading/error/retry) ───────── */
function ReportSection({ icon, iconBg, iconColor, title, subtitle, defaultOpen, children, glowing, status, onRetry }: {
  icon: string; iconBg: string; iconColor: string; title: string; subtitle: string;
  defaultOpen?: boolean; children: React.ReactNode; glowing?: boolean;
  status?: 'loading' | 'done' | 'error'; onRetry?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div style={s({ padding: '20px 20px 24px' })}>
          {[1, 2, 3].map(i => (
            <div key={i} style={s({ height: 14, background: '#f1f5f9', borderRadius: 8, marginBottom: 10, width: `${90 - i * 15}%`, animation: 'pulse 1.5s ease-in-out infinite' })} />
          ))}
          <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 8 })}>
            ⏳ Researching with live data...
          </div>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div style={s({ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 })}>
          <div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#dc2626' })}>⚠️ This section couldn't load</div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 2 })}>The rest of the report is complete. You can retry this section.</div>
          </div>
          {onRetry && (
            <button onClick={onRetry} style={s({ background: 'white', border: '1.5px solid #e2e8f0', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#374151', whiteSpace: 'nowrap', flexShrink: 0 })}>
              🔄 Retry
            </button>
          )}
        </div>
      );
    }
    return open ? <div style={s({ padding: '0 20px 20px' })}>{children}</div> : null;
  };

  return (
    <div style={s({
      background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20,
      border: status === 'error' ? '1px solid rgba(239,68,68,0.2)' : glowing ? '1px solid rgba(234,88,12,0.25)' : '1px solid rgba(255,255,255,0.95)',
      boxShadow: glowing ? '0 4px 20px rgba(234,88,12,0.08)' : '0 4px 16px rgba(0,0,0,0.05)',
      marginBottom: 16, overflow: 'hidden',
      opacity: status === 'loading' ? 0.7 : 1,
      transition: 'opacity 0.3s',
    })}>
      <div onClick={() => status !== 'loading' && setOpen(!open)} style={s({ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: status === 'loading' ? 'default' : 'pointer' })}>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <div style={s({ width: 30, height: 30, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 })}>{icon}</div>
          <div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14.5, color: '#0f172a' })}>{title}</div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>{subtitle}</div>
          </div>
        </div>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
          {status === 'done' && <span style={s({ fontSize: 12, color: '#10b981' })}>✅</span>}
          {status === 'loading' && <div style={s({ width: 14, height: 14, border: '2px solid #e2e8f0', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' })} />}
          {status === 'error' && <span style={s({ fontSize: 12, color: '#ef4444' })}>❌</span>}
          {status !== 'loading' && status !== 'error' && (
            <span style={s({ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12, color: '#94a3b8' })}>▼</span>
          )}
        </div>
      </div>
      {renderContent()}
    </div>
  );
}

/* ───────── Buyer Transformation Section ───────── */
function BuyerTransformationSection({ transformation: t }: { transformation: any }) {
  const [copiedBridge, setCopiedBridge] = useState(false);
  const [open, setOpen] = useState(true);
  const beforeEmojis = ['😰', '😤', '😞'];
  const afterEmojis = ['☀️', '🎯', '🙌'];

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div style={s({
      background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #ef4444, #f59e0b, #10b981) border-box',
      border: '2px solid transparent',
      borderRadius: 20,
      boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      marginBottom: 16,
      overflow: 'hidden',
    })}>
      <div onClick={() => setOpen(!open)} style={s({ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' })}>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <div style={s({ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#ef4444,#f59e0b,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 })}>✨</div>
          <div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Buyer Transformation</div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>Before & After journey of your ideal customer</div>
          </div>
        </div>
        <span style={s({ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12, color: '#94a3b8' })}>▼</span>
      </div>

      {open && (
        <div style={s({ padding: '0 20px 24px' })}>
          {/* TRANSFORMATION BRIDGE */}
          <div style={s({ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.04))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16, padding: '18px 22px', marginBottom: 22 })}>
            <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 })}>
              <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em' })}>🔀 THE TRANSFORMATION</span>
              <div style={s({ display: 'flex', gap: 6 })}>
                {t.timeToTransformation && <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0891b2', border: '1px solid #bae6fd', padding: '3px 10px', borderRadius: 50 })}>⏱ {t.timeToTransformation}</span>}
                {t.identityShift && <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '3px 10px', borderRadius: 50 })}>{t.identityShift}</span>}
              </div>
            </div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.55, fontStyle: 'italic', boxShadow: 'inset 4px 0 0 #7c3aed', paddingLeft: 16 })}>
              {t.transformationBridge}
            </div>
            <button onClick={() => copyText(t.transformationBridge, setCopiedBridge)}
              style={s({ marginTop: 12, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' })}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}>
              {copiedBridge ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          {/* BEFORE / AFTER CARDS */}
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 })}>
            {/* BEFORE */}
            <div style={s({ background: 'linear-gradient(145deg, #fff5f5, #fff7ed)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' })}>
              <div style={s({ position: 'absolute', top: -20, right: -20, opacity: 0.06, fontSize: 80, transform: 'rotate(-15deg)', pointerEvents: 'none', userSelect: 'none' } as any)}>😔</div>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 })}>
                <div style={s({ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' })} />
                <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.12em' })}>BEFORE</span>
                {t.beforeHeadline && <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#7f1d1d', marginLeft: 'auto', maxWidth: 180, textAlign: 'right', lineHeight: 1.3 })}>{t.beforeHeadline}</span>}
              </div>
              <div style={s({ position: 'relative' })}>
                <span style={s({ position: 'absolute', top: -8, left: -4, fontSize: 48, color: 'rgba(239,68,68,0.15)', fontFamily: 'serif', lineHeight: 1 })}>&ldquo;</span>
                <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.8, marginBottom: 16, paddingLeft: 8 })}>{t.beforeParagraph}</p>
              </div>
              {t.beforeMoments?.length > 0 && (
                <div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 })}>📍 SNAPSHOT MOMENTS</div>
                  {t.beforeMoments.map((m: string, i: number) => (
                    <div key={i} style={s({ background: 'rgba(239,68,68,0.05)', borderLeft: '3px solid #ef4444', borderRadius: '0 8px 8px 0', padding: '8px 12px', marginBottom: 8 })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#475569', lineHeight: 1.65, fontStyle: 'italic' })}>{beforeEmojis[i] || '😰'} {m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AFTER */}
            <div style={s({ background: 'linear-gradient(145deg, #f0fdf4, #ecfdf5)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' })}>
              <div style={s({ position: 'absolute', top: -20, right: -20, opacity: 0.06, fontSize: 80, transform: 'rotate(15deg)', pointerEvents: 'none', userSelect: 'none' } as any)}>🚀</div>
              <style>{`@keyframes transformPulse { 0%,100%{box-shadow:0 0 0 3px rgba(16,185,129,0.15)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,0.08)} }`}</style>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 })}>
                <div style={s({ width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: 'transformPulse 2s infinite' })} />
                <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.12em' })}>AFTER</span>
                {t.afterHeadline && <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#14532d', marginLeft: 'auto', maxWidth: 180, textAlign: 'right', lineHeight: 1.3 })}>{t.afterHeadline}</span>}
              </div>
              <div style={s({ position: 'relative' })}>
                <span style={s({ position: 'absolute', top: -8, left: -4, fontSize: 48, color: 'rgba(16,185,129,0.15)', fontFamily: 'serif', lineHeight: 1 })}>&ldquo;</span>
                <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.8, marginBottom: 16, paddingLeft: 8 })}>{t.afterParagraph}</p>
              </div>
              {t.afterMoments?.length > 0 && (
                <div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 })}>✨ SNAPSHOT MOMENTS</div>
                  {t.afterMoments.map((m: string, i: number) => (
                    <div key={i} style={s({ background: 'rgba(16,185,129,0.06)', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0', padding: '8px 12px', marginBottom: 8 })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#475569', lineHeight: 1.65, fontStyle: 'italic' })}>{afterEmojis[i] || '☀️'} {m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Country Dropdown (shared) ───────── */
function CountryDropdown({ value, onChange, accentColor }: { value: string; onChange: (v: string) => void; accentColor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={s({ position: 'relative' })}>
      <div onClick={() => setOpen(!open)}
        style={s({ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14.5, fontFamily: 'DM Sans', color: value ? '#0f172a' : '#94a3b8', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' })}>
        <span>{value ? `${COUNTRIES.find(c => c.name === value)?.flag} ${value}` : 'Select your target market'}</span>
        <span style={s({ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12, color: '#94a3b8' })}>▼</span>
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={s({ position: 'fixed', inset: 0, zIndex: 99 })} />
          <div style={s({ position: 'absolute', width: '100%', background: 'white', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, marginTop: 4, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' })}>
            {COUNTRIES.map(c => (
              <div key={c.name} onClick={() => { onChange(c.name); setOpen(false); }}
                style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', cursor: 'pointer' })}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={s({ fontSize: 20 })}>{c.flag}</span>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: 500, color: '#0f172a' })}>{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {value && (
        <div style={s({ display: 'inline-flex', gap: 6, alignItems: 'center', background: `${accentColor}0a`, border: `1px solid ${accentColor}25`, borderRadius: 8, padding: '6px 14px', marginTop: 8 })}>
          <span style={s({ fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 600, color: accentColor })}>✓ Using {value} market data, pricing, and buyer psychology</span>
        </div>
      )}
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function AIResearchEngine({ onBuildOffer }: { onBuildOffer?: (data: any) => void } = {}) {
  /* ── Shared state ── */
  const { saveItem, isSaved, isSaving } = useSaveItem();
  const [aiStep, setAiStep] = useState<'input' | 'loading-ideas' | 'results' | 'loading-report' | 'report'>('input');
  const [loadingStartTime, setLoadingStartTime] = useState<number>(Date.now());
  const [inputData, setInputData] = useState({ niche: '', country: '', productType: '' });
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductIdea | null>(null);
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('demand');

  /* ── Section-by-section loading state ── */
  const REPORT_SECTIONS = [
    'marketOverview', 'searchDemand', 'painPoints', 'transformation',
    'deepestDesires', 'empathyMap', 'primarySolution',
    'impulsePurchaseAnalysis', 'competitorLandscape', 'nextSteps', 'launchStrategy',
  ] as const;
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({});

  /* ── Generate More state ── */
  const [moreCount, setMoreCount] = useState(10);
  const [moreDirection, setMoreDirection] = useState('different-angle');
  const [generatingMore, setGeneratingMore] = useState(false);
  const [ideaBatches, setIdeaBatches] = useState<{ batchId: number; count: number; label: string; ideas: ProductIdea[]; direction?: string }[]>([]);
  const [moreSuccess, setMoreSuccess] = useState(false);
  const [countAnimating, setCountAnimating] = useState(false);

  /* ── Raw Idea state ── */
  const [ideaMode, setIdeaMode] = useState<'niche' | 'raw'>('niche');
  const [rawIdeaStep, setRawIdeaStep] = useState<'input' | 'analyzing' | 'analysis-result' | 'loading-ideas'>('input');
  const [rawIdeaData, setRawIdeaData] = useState({ ideaText: '', country: '', productFormat: 'ai-decide' });
  const [ideaAnalysis, setIdeaAnalysis] = useState<IdeaAnalysis | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [expandRecommendReason, setExpandRecommendReason] = useState(false);

  /* ── Tooltip once per session ── */
  useEffect(() => {
    if (!sessionStorage.getItem('rawIdeaTipShown')) {
      const t1 = setTimeout(() => setShowTooltip(true), 1000);
      const t2 = setTimeout(() => { setShowTooltip(false); sessionStorage.setItem('rawIdeaTipShown', '1'); }, 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, []);

  const allFilled = inputData.niche && inputData.country && inputData.productType;
  const rawValid = rawIdeaData.ideaText.length >= 20 && rawIdeaData.country;

  /* ── Mode switcher handler ── */
  const switchMode = (mode: 'niche' | 'raw') => {
    if (mode === ideaMode) return;
    setIdeaMode(mode);
    setRawIdeaStep('input');
    setIdeaAnalysis(null);
    setSelectedAngle(null);
    setAiStep('input');
    setProductIdeas([]);
    setResearchReport(null);
    setError('');
    // Sync country between modes
    if (mode === 'raw' && inputData.country) {
      setRawIdeaData(p => ({ ...p, country: inputData.country }));
    } else if (mode === 'niche' && rawIdeaData.country) {
      setInputData(p => ({ ...p, country: rawIdeaData.country }));
    }
  };

  /* ───── API Calls ───── */
  const generateIdeas = async () => {
    setError('');
    setLoadingStartTime(Date.now());
    setAiStep('loading-ideas');
    try {
      const { data, error: fnError } = await invokeWithRetry('ai-product-research', {
        body: { action: 'generate-ideas', niche: inputData.niche, country: inputData.country, productType: inputData.productType },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const ideas = data.result.map((idea: any) => ({ ...idea, sourceMode: 'niche' }));
      setProductIdeas(ideas);
      setIdeaBatches([{ batchId: 1, count: ideas.length, label: 'Original Research', ideas }]);
      setAiStep('results');
    } catch (err: any) {
      setError(err.message || 'Could not generate ideas. Please try again.');
      setAiStep('input');
    }
  };

  const runIdeaAnalysis = async () => {
    setError('');
    setRawIdeaStep('analyzing');
    try {
      const { data, error: fnError } = await invokeWithRetry('ai-product-research', {
        body: { action: 'analyze-idea', ideaText: rawIdeaData.ideaText, country: rawIdeaData.country },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setIdeaAnalysis(data.result);
      setSelectedAngle(data.result.recommendedAngle);
      setRawIdeaStep('analysis-result');
    } catch (err: any) {
      setError(err.message || 'Could not analyze idea. Please try again.');
      setRawIdeaStep('input');
    }
  };

  const generateIdeasFromRawIdea = async () => {
    if (!ideaAnalysis || !selectedAngle) return;
    setError('');
    setRawIdeaStep('loading-ideas');
    setLoadingStartTime(Date.now());
    setAiStep('loading-ideas');
    const chosenAngle = ideaAnalysis.angles?.find(a => a.angleId === selectedAngle);
    try {
      const { data, error: fnError } = await invokeWithRetry('ai-product-research', {
        body: {
          action: 'generate-ideas-from-raw',
          ideaText: rawIdeaData.ideaText,
          analysis: ideaAnalysis,
          chosenAngle,
          country: rawIdeaData.country,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const taggedIdeas = data.result.map((idea: any) => ({ ...idea, sourceMode: 'raw', originalIdea: rawIdeaData.ideaText }));
      setProductIdeas(taggedIdeas);
      setIdeaBatches([{ batchId: 1, count: taggedIdeas.length, label: 'Original Research', ideas: taggedIdeas }]);
      // Set inputData for deep research compatibility
      setInputData(p => ({
        ...p,
        niche: ideaAnalysis.detectedNiche,
        country: rawIdeaData.country,
        productType: chosenAngle?.productFormat || 'Digital Product',
      }));
      setAiStep('results');
    } catch (err: any) {
      setError(err.message || 'Could not generate ideas. Please try again.');
      setRawIdeaStep('analysis-result');
      setAiStep('input');
    }
  };

  const generateReport = async (product: ProductIdea) => {
    setError('');
    setSelectedProduct(product);
    setLoadingStartTime(Date.now());
    setResearchReport(null);

    // Initialize all sections as loading
    const initialStatus: Record<string, 'loading' | 'done' | 'error'> = {};
    REPORT_SECTIONS.forEach(sec => { initialStatus[sec] = 'loading'; });
    setSectionStatus(initialStatus);
    setAiStep('loading-report');

    try {
      const { data, error: fnError } = await invokeWithRetry('ai-product-research', {
        body: { action: 'deep-research', product, inputData },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const report = data.result;
      setResearchReport(report);

      // Mark each section as done or error based on presence
      const finalStatus: Record<string, 'loading' | 'done' | 'error'> = {};
      REPORT_SECTIONS.forEach(sec => {
        finalStatus[sec] = report[sec] ? 'done' : 'error';
      });
      setSectionStatus(finalStatus);
      setAiStep('report');
    } catch (err: any) {
      // Mark all sections as error
      const errorStatus: Record<string, 'loading' | 'done' | 'error'> = {};
      REPORT_SECTIONS.forEach(sec => { errorStatus[sec] = 'error'; });
      setSectionStatus(errorStatus);
      setError(err.message || 'Could not generate report. Please try again.');
      setAiStep('results');
    }
  };

  /* ── Retry a single failed section ── */
  const retrySingleSection = async (sectionKey: string) => {
    if (!selectedProduct) return;
    setSectionStatus(prev => ({ ...prev, [sectionKey]: 'loading' }));

    try {
      const { data, error: fnError } = await invokeWithRetry('ai-product-research', {
        body: { action: 'deep-research', product: selectedProduct, inputData },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const report = data.result;
      if (report?.[sectionKey]) {
        setResearchReport((prev: any) => ({ ...prev, [sectionKey]: report[sectionKey] }));
        setSectionStatus(prev => ({ ...prev, [sectionKey]: 'done' }));
        // Also fill any other sections that were missing
        REPORT_SECTIONS.forEach(sec => {
          if (report[sec] && sectionStatus[sec] === 'error') {
            setResearchReport((prev: any) => ({ ...prev, [sec]: report[sec] }));
            setSectionStatus(prev => ({ ...prev, [sec]: 'done' }));
          }
        });
      } else {
        setSectionStatus(prev => ({ ...prev, [sectionKey]: 'error' }));
      }
    } catch {
      setSectionStatus(prev => ({ ...prev, [sectionKey]: 'error' }));
    }
  };

  /* ───── Generate More Ideas ───── */
  const DIRECTION_OPTIONS = [
    { id: 'different-angle', emoji: '🔀', name: 'Different Angle', desc: 'Explore new sub-niches you haven\'t seen yet', accent: '#06b6d4' },
    { id: 'more-specific', emoji: '🎯', name: 'More Specific', desc: 'Go deeper and narrower on the same topic', accent: '#7c3aed' },
    { id: 'easier-to-build', emoji: '⚡', name: 'Easier to Build', desc: 'Low-effort products, fast to create', accent: '#22c55e' },
    { id: 'higher-ticket', emoji: '💎', name: 'Higher Ticket', desc: 'Premium products with bigger price points', accent: '#f59e0b' },
    { id: 'impulse-buy', emoji: '🔥', name: 'Impulse Buys', desc: 'High impulse score, quick purchase decisions', accent: '#ef4444' },
    { id: 'trending-now', emoji: '📈', name: 'Trending Now', desc: 'Products riding current market trends', accent: '#ec4899' },
  ];
  const directionLabels: Record<string, string> = Object.fromEntries(DIRECTION_OPTIONS.map(d => [d.id, d.name]));

  const generateMoreIdeas = async () => {
    setGeneratingMore(true);
    setError('');
    try {
      const existingNames = productIdeas.map(p => p.productName);
      const rawIdea = isRawResultsMode ? productIdeas[0]?.originalIdea : undefined;
      const { data, error: fnError } = await invokeWithRetry('ai-product-research', {
        body: {
          action: 'generate-more',
          niche: inputData.niche,
          country: inputData.country,
          productType: inputData.productType,
          existingNames,
          moreCount,
          direction: moreDirection,
          rawIdea,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const newIdeas: ProductIdea[] = data.result.map((idea: any) => ({
        ...idea,
        sourceMode: isRawResultsMode ? 'raw' : 'niche',
        originalIdea: isRawResultsMode ? productIdeas[0]?.originalIdea : undefined,
        batchId: ideaBatches.length + 1,
      }));

      setProductIdeas(prev => [...prev, ...newIdeas]);
      const newBatch = {
        batchId: ideaBatches.length + 1,
        count: newIdeas.length,
        label: `+${newIdeas.length} ${directionLabels[moreDirection] || 'New'}`,
        ideas: newIdeas,
        direction: moreDirection,
      };
      setIdeaBatches(prev => [...prev, newBatch]);

      // Animate count
      setCountAnimating(true);
      setTimeout(() => setCountAnimating(false), 600);

      // Success flash
      setMoreSuccess(true);
      setTimeout(() => setMoreSuccess(false), 2500);

      // Reset direction
      setMoreDirection('different-angle');

      // Scroll to separator
      setTimeout(() => {
        const sep = document.getElementById(`batch-${newBatch.batchId}`);
        if (sep) sep.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err: any) {
      setError(err.message || 'Could not generate more ideas. Please try again.');
    } finally {
      setGeneratingMore(false);
    }
  };

  /* ───── Filter & Sort ───── */
  const filteredIdeas = productIdeas.filter(idea => {
    if (filter === 'All') return true;
    if (filter === 'high-impulse') return idea.impulseScore === 'High';
    if (filter === 'low-comp') return idea.competitionLevel === 'Low';
    if (filter === 'latest-batch') {
      const lastBatch = ideaBatches[ideaBatches.length - 1];
      return lastBatch && lastBatch.ideas.includes(idea);
    }
    return true;
  });

  const sortedIdeas = [...filteredIdeas].sort((a, b) => {
    if (sortBy === 'demand') return b.demandScore - a.demandScore;
    if (sortBy === 'competition') {
      const order: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
      return (order[a.competitionLevel] ?? 1) - (order[b.competitionLevel] ?? 1);
    }
    if (sortBy === 'impulse') {
      const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      return (order[a.impulseScore] ?? 1) - (order[b.impulseScore] ?? 1);
    }
    if (sortBy === 'buildTime') {
      const getWeeks = (str?: string) => {
        if (!str) return 99;
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1]) : 99;
      };
      return getWeeks(a.buildTime) - getWeeks(b.buildTime);
    }
    return 0;
  });

  /* ── Idea quality dots ── */
  const charLen = rawIdeaData.ideaText.length;
  const qualityLevel = charLen >= 121 ? 3 : charLen >= 51 ? 2 : charLen >= 20 ? 1 : 0;
  const qualityLabel = qualityLevel === 3 ? 'Great detail — ready to analyze!' : qualityLevel === 2 ? 'Good start!' : 'Add more detail...';
  const qualityColor = qualityLevel === 3 ? '#059669' : '#f59e0b';

  /* ── Raw validation hint ── */
  const rawHint = !rawIdeaData.ideaText ? { text: '✏ Paste your idea above to get started', color: '#94a3b8' }
    : rawIdeaData.ideaText.length < 20 ? { text: 'Add a bit more detail to your idea', color: '#f59e0b' }
    : !rawIdeaData.country ? { text: 'Select your target country', color: '#f59e0b' }
    : { text: `✓ Ready to analyze your idea for ${rawIdeaData.country}`, color: '#059669' };

  const isRawResultsMode = productIdeas.length > 0 && productIdeas[0]?.sourceMode === 'raw';

  /* ── Sub-mode switcher component ── */
  const ModeSwitcher = () => (
    <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 })}>
      <div style={s({ display: 'inline-flex', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 50, padding: 3, gap: 2 })}>
        <button onClick={() => switchMode('niche')}
          style={s({
            padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, transition: 'all 0.2s',
            ...(ideaMode === 'niche'
              ? { background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#0f172a', fontWeight: 700 }
              : { background: 'transparent', color: '#94a3b8', fontWeight: 500 }),
          })}>
          🎯 By Niche
        </button>
        <button onClick={() => switchMode('raw')}
          style={s({
            padding: '7px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, transition: 'all 0.2s',
            ...(ideaMode === 'raw'
              ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', boxShadow: '0 2px 10px rgba(124,58,237,0.3)', fontWeight: 700 }
              : { background: 'transparent', color: '#94a3b8', fontWeight: 500 }),
          })}>
          💡 Raw Idea
        </button>
      </div>
      {showTooltip && ideaMode === 'niche' && (
        <div style={s({ marginTop: 10, fontFamily: 'DM Sans', fontSize: 12, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', padding: '6px 14px', borderRadius: 50, border: '1px solid rgba(124,58,237,0.15)', animation: 'fadeUp 0.5s ease both' })}>
          💡 Have your own idea? Try the Raw Idea mode →
        </div>
      )}
    </div>
  );

  /* ═══════════════════ RAW IDEA: ANALYZING ═══════════════════ */
  if (aiStep === 'input' && ideaMode === 'raw' && rawIdeaStep === 'analyzing') {
    return (
      <div style={s({ maxWidth: 680, margin: '0 auto' })}>
        <div style={s({ textAlign: 'center', marginBottom: 32 })}>
          <div style={s({ display: 'inline-flex', gap: 6, alignItems: 'center', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 50, padding: '5px 16px', marginBottom: 12 })}>
            <span>💡</span>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' })}>Raw Idea Analysis</span>
          </div>
        </div>
        <div style={s({ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.07)' })}>
          <IdeaAnalyzingScreen />
        </div>
      </div>
    );
  }

  /* ═══════════════════ RAW IDEA: ANALYSIS RESULT ═══════════════════ */
  if (aiStep === 'input' && ideaMode === 'raw' && rawIdeaStep === 'analysis-result' && ideaAnalysis) {
    const a = ideaAnalysis;
    const chosenAngle = a.angles?.find(ang => ang.angleId === selectedAngle);
    const readinessBadge = a.marketReadiness === 'High'
      ? { bg: 'linear-gradient(135deg,#059669,#10b981)', label: '🔥 High Demand' }
      : a.marketReadiness === 'Medium'
      ? { bg: 'linear-gradient(135deg,#f59e0b,#ea580c)', label: '⚡ Medium Demand' }
      : { bg: '#f1f5f9', label: '💤 Low Demand' };
    const readinessColor = a.marketReadiness === 'Low' ? '#64748b' : 'white';

    return (
      <div style={s({ maxWidth: 680, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
        {error && (
          <div style={s({ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' })}>{error}</span>
            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <button onClick={() => { setError(''); generateIdeas(); }} style={s({ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' })}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🔄 Try Again</button>
              <button onClick={() => setError('')} style={s({ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 })}>✕</button>
            </div>
          </div>
        )}

        {/* TOP — IDEA VALIDATION HEADER */}
        <div style={s({ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.07)', marginBottom: 16 })}>
          {/* Row 1 */}
          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 })}>
            <div style={s({ flex: 1, minWidth: 280 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' })}>💡 YOUR IDEA</div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.4, marginTop: 4, maxWidth: 480 })}>{a.ideaSummary}</div>
            </div>
            <div style={s({ textAlign: 'right' })}>
              <div style={s({ background: readinessBadge.bg, color: readinessColor, fontFamily: 'Sora', fontWeight: 800, fontSize: 12, padding: '6px 16px', borderRadius: 50, display: 'inline-block' })}>{readinessBadge.label}</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4, maxWidth: 180 })}>{a.marketReadinessReason}</div>
            </div>
          </div>

          {/* Row 2 — info pills */}
          <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 })}>
            <span style={s({ background: '#f0f9ff', color: '#0891b2', border: '1px solid #bae6fd', padding: '5px 12px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 700 })}>📂 {a.detectedNiche}</span>
            <span style={s({ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', padding: '5px 12px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 700 })}>👤 {a.targetBuyer.length > 40 ? a.targetBuyer.substring(0, 40) + '...' : a.targetBuyer}</span>
            <span style={s({ background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '5px 12px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 700 })}>🎯 {a.detectedCategory}</span>
          </div>

          {/* Row 3 — Strengths & Gaps */}
          <div style={s({ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' })}>
            <div style={s({ flex: 1, minWidth: 200 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 6 })}>✅ What's strong about your idea</div>
              {a.ideaStrengths.map((str, i) => (
                <div key={i} style={s({ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 })}>
                  <div style={s({ width: 6, height: 6, borderRadius: '50%', background: '#059669', marginTop: 6, flexShrink: 0 })} />
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#334155', lineHeight: 1.6 })}>{str}</span>
                </div>
              ))}
            </div>
            <div style={s({ flex: 1, minWidth: 200 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 6 })}>⚠ Things to keep in mind</div>
              {a.ideaGaps.map((gap, i) => (
                <div key={i} style={s({ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 })}>
                  <div style={s({ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginTop: 6, flexShrink: 0 })} />
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#334155', lineHeight: 1.6 })}>{gap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Edit link */}
          <div style={s({ textAlign: 'right', marginTop: 12 })}>
            <span onClick={() => setRawIdeaStep('input')} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', cursor: 'pointer', fontWeight: 600 })}>✏ Edit my idea</span>
          </div>
        </div>

        {/* MIDDLE — CORE PROBLEM REFRAME */}
        <div style={s({ background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(168,85,247,0.04))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 16, padding: '20px 20px 20px 24px', marginBottom: 16, position: 'relative', overflow: 'hidden' })}>
          <div style={s({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#7c3aed', borderRadius: '4px 0 0 4px' })} />
          <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 })}>🎯 THE REAL PROBLEM YOU'RE SOLVING</div>
          <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: '#0f172a', lineHeight: 1.55 })}>{a.coreProblem}</div>
        </div>

        {/* BOTTOM — 3 PRODUCT ANGLES */}
        <div style={s({ marginBottom: 16 })}>
          <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 })}>Choose Your Product Angle</div>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 14 })}>
            AI recommends Angle <strong style={{ color: '#7c3aed' }}>{a.recommendedAngle}</strong> · You can pick any one
          </div>

          <div style={s({ display: 'flex', flexDirection: 'column', gap: 12 })}>
            {a.angles.map((angle) => {
              const isSelected = selectedAngle === angle.angleId;
              const isRecommended = a.recommendedAngle === angle.angleId;
              const dotColor = ANGLE_COLORS[angle.angleId] || '#7c3aed';
              const demandBg = angle.demandSignal === 'High' ? '#dcfce7' : angle.demandSignal === 'Medium' ? '#fef9c3' : '#f1f5f9';
              const demandColor = angle.demandSignal === 'High' ? '#059669' : angle.demandSignal === 'Medium' ? '#92400e' : '#64748b';

              return (
                <div key={angle.angleId} onClick={() => setSelectedAngle(angle.angleId)}
                  style={s({
                    borderRadius: 16, padding: '18px 20px', cursor: 'pointer', position: 'relative',
                    border: `2px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                    background: isSelected ? 'rgba(124,58,237,0.04)' : '#f8fafc',
                    boxShadow: isSelected ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  })}>
                  {isRecommended && (
                    <div style={s({ position: 'absolute', top: -1, right: 16, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', padding: '3px 10px', borderRadius: '0 0 8px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em' })}>⭐ AI Recommended</div>
                  )}
                  {/* Top row */}
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                    <div style={s({ display: 'flex', alignItems: 'center', gap: 10 })}>
                      <div style={s({ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${dotColor},${dotColor}cc)`, color: 'white', fontFamily: 'Sora', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>{angle.angleId}</div>
                      <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>{angle.angleName}</span>
                    </div>
                    <div style={s({ display: 'flex', gap: 6 })}>
                      <span style={s({ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: demandBg, color: demandColor })}>{angle.demandSignal} Demand</span>
                      <span style={s({ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: '#f0f9ff', color: '#0891b2' })}>🛠 {angle.buildTime}</span>
                    </div>
                  </div>
                  {/* Description */}
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569', lineHeight: 1.7, marginTop: 8, marginBottom: 10 })}>{angle.angleDescription}</div>
                  {/* Bottom row */}
                  <div style={s({ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' })}>
                    <span style={s({ background: 'rgba(234,88,12,0.08)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.2)', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50 })}>{angle.productFormat}</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#059669' })}>{angle.priceRange}</span>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>Why this works:</span>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#0f172a', fontWeight: 600 })}>{angle.whyThisWorks}</span>
                  </div>
                  {/* Why AI chose this */}
                  {isRecommended && (
                    <div style={s({ marginTop: 8 })}>
                      <span onClick={(e) => { e.stopPropagation(); setExpandRecommendReason(!expandRecommendReason); }}
                        style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#7c3aed', cursor: 'pointer' })}>
                        Why AI recommends this angle {expandRecommendReason ? '↑' : '↓'}
                      </span>
                      {expandRecommendReason && (
                        <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#475569', lineHeight: 1.7, background: 'rgba(124,58,237,0.04)', borderRadius: 8, padding: '10px 14px', marginTop: 8 })}>
                          {a.recommendedAngleReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* GENERATE BUTTON */}
        <div style={s({ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 })}>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#059669' })}>
            {selectedAngle && chosenAngle ? `✓ Generating 30 ideas for Angle ${selectedAngle}: ${chosenAngle.angleName} · ${rawIdeaData.country}` : 'Select an angle to continue'}
          </div>
          <button onClick={generateIdeasFromRawIdea} disabled={!selectedAngle}
            style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: selectedAngle ? 'pointer' : 'not-allowed', opacity: selectedAngle ? 1 : 0.45, boxShadow: selectedAngle ? '0 4px 20px rgba(234,88,12,0.35)' : 'none', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' })}
            onMouseEnter={e => { if (selectedAngle) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,88,12,0.45)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = selectedAngle ? '0 4px 20px rgba(234,88,12,0.35)' : 'none'; }}>
            🚀 Generate 30 Product Ideas →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════ STEP 1: INPUT FORM ═══════════════════ */
  if (aiStep === 'input') {
    return (
      <div style={s({ maxWidth: 680, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
        {/* Hero */}
        <div style={s({ textAlign: 'center', marginBottom: 32 })}>
          <div style={s({ display: 'inline-flex', gap: 6, alignItems: 'center', background: ideaMode === 'raw' ? 'rgba(124,58,237,0.08)' : 'rgba(234,88,12,0.08)', border: `1px solid ${ideaMode === 'raw' ? 'rgba(124,58,237,0.2)' : 'rgba(234,88,12,0.2)'}`, borderRadius: 50, padding: '5px 16px', marginBottom: 12 })}>
            <span>{ideaMode === 'raw' ? '💡' : '🤖'}</span>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: ideaMode === 'raw' ? '#7c3aed' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.08em' })}>{ideaMode === 'raw' ? 'Raw Idea Analyzer' : 'AI-Powered Research'}</span>
          </div>
          <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 'clamp(22px, 4vw, 32px)', color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 8 })}>
            {ideaMode === 'raw' ? 'Validate & Expand Your Idea' : 'Find Your Perfect Product Idea'}
          </h2>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' })}>
            {ideaMode === 'raw' ? 'Paste your raw idea. AI analyzes, validates, and generates 30 product ideas built around your concept.' : 'Tell us 3 things. Our AI does the research — real market data, real pain points, real opportunities.'}
          </p>
        </div>

        {error && (
          <div style={s({ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' })}>{error}</span>
            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <button onClick={() => { setError(''); if (ideaMode === 'raw') runIdeaAnalysis(); else generateIdeas(); }} style={s({ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' })}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🔄 Try Again</button>
              <button onClick={() => setError('')} style={s({ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 })}>✕</button>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div style={s({ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.07)', animation: 'fadeUp 0.4s ease 0.08s both' })}>

          {/* MODE SWITCHER */}
          <ModeSwitcher />

          {/* ═══ NICHE MODE ═══ */}
          {ideaMode === 'niche' && (
            <div style={s({ animation: 'fadeUp 0.3s ease' })}>
              {/* INPUT 1 — NICHE */}
              <div>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                  <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#ea580c' })}>01</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Your Niche</span>
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>e.g. fitness, finance, parenting, AI tools</span>
                </div>
                <input
                  value={inputData.niche}
                  onChange={e => setInputData(p => ({ ...p, niche: e.target.value }))}
                  placeholder="e.g. Personal finance for young professionals in India"
                  style={s({ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' })}
                  onFocus={e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <div style={s({ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 })}>
                  {NICHE_PILLS.map(pill => (
                    <button key={pill} onClick={() => setInputData(p => ({ ...p, niche: pill.replace(/^[^\s]+\s/, '') }))}
                      style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 50, padding: '5px 12px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' })}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,88,12,0.06)'; e.currentTarget.style.borderColor = 'rgba(234,88,12,0.25)'; e.currentTarget.style.color = '#ea580c'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}>
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT 2 — COUNTRY */}
              <div style={s({ marginTop: 24 })}>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                  <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#ea580c' })}>02</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Target Country</span>
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>Where will you sell this product?</span>
                </div>
                <CountryDropdown value={inputData.country} onChange={v => setInputData(p => ({ ...p, country: v }))} accentColor="#059669" />
              </div>

              {/* INPUT 3 — PRODUCT TYPE */}
              <div style={s({ marginTop: 24 })}>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                  <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#ea580c' })}>03</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Product Type</span>
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>What format do you want to create?</span>
                </div>
                <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginTop: 8 })}>
                  {PRODUCT_TYPES.map(pt => {
                    const selected = inputData.productType === pt.name;
                    return (
                      <div key={pt.name} onClick={() => setInputData(p => ({ ...p, productType: pt.name }))}
                        style={s({ borderRadius: 12, padding: '12px 10px', cursor: 'pointer', border: `2px solid ${selected ? pt.accent : '#e2e8f0'}`, background: selected ? `${pt.accent}08` : '#f8fafc', textAlign: 'center', transition: 'all 0.18s', boxShadow: selected ? `0 0 0 3px ${pt.accent}15` : 'none' })}>
                        <span style={s({ fontSize: 22, display: 'block', marginBottom: 6 })}>{pt.emoji}</span>
                        <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0f172a' })}>{pt.name}</div>
                        <div style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', marginTop: 2 })}>{pt.price}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GENERATE BUTTON */}
              <div style={s({ marginTop: 28, paddingTop: 24, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 })}>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: allFilled ? '#059669' : '#94a3b8' })}>
                  {allFilled ? `✓ Ready to research ${inputData.niche} ${inputData.productType} for ${inputData.country}` : 'Fill all 3 fields to continue'}
                </div>
                <button onClick={generateIdeas} disabled={!allFilled}
                  style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: allFilled ? 'pointer' : 'not-allowed', opacity: allFilled ? 1 : 0.45, boxShadow: allFilled ? '0 4px 20px rgba(234,88,12,0.35)' : 'none', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' })}
                  onMouseEnter={e => { if (allFilled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,88,12,0.45)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = allFilled ? '0 4px 20px rgba(234,88,12,0.35)' : 'none'; }}>
                  🤖 Generate 30 Product Ideas →
                </button>
              </div>
            </div>
          )}

          {/* ═══ RAW IDEA MODE ═══ */}
          {ideaMode === 'raw' && rawIdeaStep === 'input' && (
            <div style={s({ animation: 'fadeUp 0.3s ease' })}>
              {/* FIELD 1 — RAW IDEA INPUT */}
              <div>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                  <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#7c3aed' })}>01</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Your Raw Idea</span>
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>{charLen}/300</span>
                </div>
                <textarea
                  value={rawIdeaData.ideaText}
                  onChange={e => { if (e.target.value.length <= 300) setRawIdeaData(p => ({ ...p, ideaText: e.target.value })); }}
                  placeholder={`Describe your idea in your own words...\n\nExamples:\n- 'I want to create a guide for Indian freelancers on how to get clients from LinkedIn'\n- 'A template system for small restaurant owners to manage their Instagram content without hiring an agency'\n- 'An AI prompt pack for CA students to summarize lengthy ICAI study material faster'`}
                  style={s({ width: '100%', minHeight: 120, maxHeight: 200, padding: '14px 16px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.75, transition: 'all 0.18s' })}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                />

                {/* Quality indicator */}
                {charLen >= 20 && (
                  <div style={s({ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 })}>
                    {[1, 2, 3].map(dot => (
                      <div key={dot} style={s({ width: 8, height: 8, borderRadius: '50%', background: dot <= qualityLevel ? qualityColor : '#e2e8f0', transition: 'background 0.3s' })} />
                    ))}
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: qualityColor })}>{qualityLabel}</span>
                  </div>
                )}

                {/* Example pills */}
                <div style={s({ marginTop: 10 })}>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 })}>✨ Try an example:</div>
                  <div style={s({ display: 'flex', flexWrap: 'wrap', gap: 6 })}>
                    {RAW_EXAMPLES.map((ex, i) => (
                      <button key={i} onClick={() => setRawIdeaData(p => ({ ...p, ideaText: ex.text }))}
                        style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '7px 12px', fontFamily: 'DM Sans', fontSize: 12, color: '#475569', cursor: 'pointer', lineHeight: 1.5, display: 'inline-block', transition: 'all 0.15s' })}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'; e.currentTarget.style.color = '#7c3aed'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>
                        {ex.emoji} {ex.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FIELD 2 — COUNTRY */}
              <div style={s({ marginTop: 20 })}>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                  <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#7c3aed' })}>02</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Target Country</span>
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>Where will you sell this?</span>
                </div>
                <CountryDropdown value={rawIdeaData.country} onChange={v => setRawIdeaData(p => ({ ...p, country: v }))} accentColor="#7c3aed" />
              </div>

              {/* FIELD 3 — FORMAT PREFERENCE */}
              <div style={s({ marginTop: 20 })}>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                  <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#7c3aed' })}>03</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Format Preference</span>
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>Optional — AI will suggest if left blank</span>
                </div>

                {/* Let AI Decide card */}
                <div onClick={() => setRawIdeaData(p => ({ ...p, productFormat: 'ai-decide' }))}
                  style={s({
                    background: rawIdeaData.productFormat === 'ai-decide' ? 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(168,85,247,0.04))' : '#f8fafc',
                    border: `1.5px solid ${rawIdeaData.productFormat === 'ai-decide' ? 'rgba(124,58,237,0.2)' : '#e2e8f0'}`,
                    borderRadius: 12, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  })}>
                  <span style={s({ fontSize: 20 })}>🤖</span>
                  <div style={s({ flex: 1 })}>
                    <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13.5, color: '#7c3aed' })}>Let AI Decide Best Format</div>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 })}>AI will pick the format that best fits your idea</div>
                  </div>
                  <div style={s({ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${rawIdeaData.productFormat === 'ai-decide' ? '#7c3aed' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                    {rawIdeaData.productFormat === 'ai-decide' && <div style={s({ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' })} />}
                  </div>
                </div>

                <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 8 })}>Or choose a specific format:</div>
                <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 })}>
                  {PRODUCT_TYPES.map(pt => {
                    const selected = rawIdeaData.productFormat === pt.name;
                    return (
                      <div key={pt.name} onClick={() => setRawIdeaData(p => ({ ...p, productFormat: pt.name }))}
                        style={s({ borderRadius: 10, padding: '8px 6px', cursor: 'pointer', border: `1.5px solid ${selected ? pt.accent : '#e2e8f0'}`, background: selected ? `${pt.accent}08` : '#f8fafc', textAlign: 'center', transition: 'all 0.18s' })}>
                        <span style={s({ fontSize: 18, display: 'block', marginBottom: 4 })}>{pt.emoji}</span>
                        <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 10.5, color: '#0f172a' })}>{pt.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ANALYZE BUTTON */}
              <div style={s({ marginTop: 28, paddingTop: 24, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 })}>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: rawHint.color })}>
                  {rawHint.text}
                </div>
                <button onClick={runIdeaAnalysis} disabled={!rawValid}
                  style={s({ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: rawValid ? 'pointer' : 'not-allowed', opacity: rawValid ? 1 : 0.45, boxShadow: rawValid ? '0 4px 20px rgba(124,58,237,0.35)' : 'none', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' })}
                  onMouseEnter={e => { if (rawValid) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(124,58,237,0.45)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = rawValid ? '0 4px 20px rgba(124,58,237,0.35)' : 'none'; }}>
                  🔍 Analyze My Idea →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════ LOADING IDEAS ═══════════════════ */
  if (aiStep === 'loading-ideas') {
    return <LoadingScreen type={isRawResultsMode || rawIdeaStep === 'loading-ideas' ? 'raw-ideas' : 'ideas'} data={{ ...inputData, country: rawIdeaData.country || inputData.country }} startTime={loadingStartTime} />;
  }

  /* ═══════════════════ LOADING REPORT (Section Checklist) ═══════════════════ */
  if (aiStep === 'loading-report') {
    const sectionMeta = [
      { key: 'marketOverview', icon: '🌍', label: 'Market Overview & Competitors' },
      { key: 'searchDemand', icon: '🔍', label: 'Search Volume & Trends' },
      { key: 'painPoints', icon: '😤', label: 'Customer Pain Points' },
      { key: 'transformation', icon: '✨', label: 'Buyer Transformation' },
      { key: 'deepestDesires', icon: '💎', label: 'Deepest Desires' },
      { key: 'empathyMap', icon: '🧠', label: 'Empathy Map' },
      { key: 'primarySolution', icon: '🎯', label: 'Product Solution Design' },
      { key: 'impulsePurchaseAnalysis', icon: '⚡', label: 'Impulse Purchase Analysis' },
      { key: 'competitorLandscape', icon: '⚔️', label: 'Competitor Landscape' },
      { key: 'nextSteps', icon: '🚀', label: 'Action Plan & Next Steps' },
      { key: 'launchStrategy', icon: '📣', label: 'Launch Strategy' },
    ];

    return (
      <div style={s({ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' })}>
        <div style={s({ maxWidth: 480, width: '100%', padding: '40px 20px' })}>
          <LoadingScreen type="report" data={{ ...inputData, productName: selectedProduct?.productName, searchKeyword: selectedProduct?.searchKeyword }} startTime={loadingStartTime} />

          {/* Section checklist */}
          <div style={s({ marginTop: 24, background: 'rgba(255,255,255,0.9)', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px 20px' })}>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 })}>📋 BUILDING YOUR REPORT</div>
            {sectionMeta.map((sec, i) => {
              const st = sectionStatus[sec.key];
              return (
                <div key={sec.key} style={s({ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', animation: `fadeUp 0.3s ease ${i * 0.08}s both` })}>
                  <div style={s({ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                    {st === 'done' ? (
                      <span style={s({ fontSize: 13, color: '#10b981' })}>✅</span>
                    ) : (
                      <div style={s({ width: 14, height: 14, borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#ea580c', animation: 'spinSlow 0.8s linear infinite' })} />
                    )}
                  </div>
                  <span style={s({ fontSize: 14, marginRight: 4 })}>{sec.icon}</span>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: st === 'done' ? '#10b981' : '#475569', fontWeight: st === 'done' ? 700 : 400 })}>{sec.label}</span>
                </div>
              );
            })}
          </div>

          <div style={s({ textAlign: 'center', marginTop: 20 })}>
            <button onClick={() => setAiStep('results')} style={s({ background: 'none', border: 'none', fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', cursor: 'pointer' })}>← Back to results</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════ STEP 2: 30 IDEAS ═══════════════════ */
  if (aiStep === 'results') {
    return (
      <div style={s({ animation: 'fadeUp 0.4s ease' })}>
        {/* Header */}
        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 })}>
          <div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
              <span onClick={() => {
                if (isRawResultsMode) {
                  setAiStep('input');
                  setRawIdeaStep('analysis-result');
                } else {
                  setAiStep('input');
                  setProductIdeas([]);
                }
              }} style={s({ cursor: 'pointer' })}>AI Research</span> → <span style={s({ fontWeight: 700, color: '#0f172a' })}>Results</span>
            </div>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 })}>
              {isRawResultsMode ? (
                <><span style={s({ display: 'inline-block', transform: countAnimating ? 'scale(1.15)' : 'scale(1)', color: countAnimating ? '#059669' : undefined, transition: 'all 0.3s' } as any)}>{productIdeas.length}</span> Ideas Built Around <span style={s({ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as any)}>Your Concept</span></>
              ) : (
                <><span style={s({ display: 'inline-block', transform: countAnimating ? 'scale(1.15)' : 'scale(1)', color: countAnimating ? '#059669' : undefined, transition: 'all 0.3s' } as any)}>{productIdeas.length}</span> Product Ideas for <span style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as any)}>{inputData.niche}</span></>
              )}
            </h2>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 3 })}>
              {isRawResultsMode
                ? `Based on: '${(productIdeas[0]?.originalIdea || '').substring(0, 60)}${(productIdeas[0]?.originalIdea || '').length > 60 ? '...' : ''}' · ${ideaAnalysis?.angles?.find(a => a.angleId === selectedAngle)?.angleName || ''} · ${inputData.country}`
                : `${inputData.productType} products for ${inputData.country} market · Click any idea for deep research →`}
            </p>
          </div>
          <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <button onClick={() => {
              if (isRawResultsMode) {
                setAiStep('input');
                setRawIdeaStep('analysis-result');
              } else {
                setAiStep('input');
                setProductIdeas([]);
              }
            }} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 50, padding: '5px 14px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' })}>
              {isRawResultsMode ? '← Back to Idea Analysis' : '← New Search'}
            </button>
          </div>
        </div>

        {error && (
          <div style={s({ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16 })}>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' })}>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div style={s({ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' })}>
          {[
            { key: 'All', label: 'All' },
            { key: 'high-impulse', label: '🔥 High Impulse' },
            { key: 'low-comp', label: '🟢 Low Competition' },
            ...(ideaBatches.length > 1 ? [{ key: 'latest-batch', label: '✨ Latest Batch' }] : []),
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={s({ padding: '5px 14px', borderRadius: 50, border: 'none', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: filter === f.key ? '#ea580c' : '#f1f5f9', color: filter === f.key ? 'white' : '#64748b', transition: 'all 0.15s' })}>
              {f.label}
            </button>
          ))}
          <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginLeft: 8 })}>Sort by:</span>
          {[{ key: 'demand', label: 'Demand ↓' }, { key: 'competition', label: 'Competition ↑' }, { key: 'buildTime', label: '🛠 Build Time ↑' }, { key: 'impulse', label: 'Impulse ↓' }].map(so => (
            <button key={so.key} onClick={() => setSortBy(so.key)}
              style={s({ padding: '4px 10px', borderRadius: 50, border: 'none', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: sortBy === so.key ? '#ea580c' : '#f1f5f9', color: sortBy === so.key ? 'white' : '#64748b' })}>
              {so.label}
            </button>
          ))}
        </div>

        {/* Grid with batch separators */}
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 })}>
          {filter === 'All' || filter === 'latest-batch' ? (
            // Render by batch with separators
            (() => {
              const batchesToRender = filter === 'latest-batch' && ideaBatches.length > 1
                ? [ideaBatches[ideaBatches.length - 1]]
                : ideaBatches;
              let globalIdx = 0;
              return batchesToRender.map((batch, bIdx) => {
                const batchIdeas = batch.ideas;
                // Sort within batch
                const sorted = [...batchIdeas].sort((a, b) => {
                  if (sortBy === 'demand') return b.demandScore - a.demandScore;
                  if (sortBy === 'competition') { const o: Record<string, number> = { Low: 0, Medium: 1, High: 2 }; return (o[a.competitionLevel] ?? 1) - (o[b.competitionLevel] ?? 1); }
                  if (sortBy === 'impulse') { const o: Record<string, number> = { High: 0, Medium: 1, Low: 2 }; return (o[a.impulseScore] ?? 1) - (o[b.impulseScore] ?? 1); }
                  return 0;
                });
                const startIdx = globalIdx;
                globalIdx += sorted.length;
                return [
                  // Batch separator (not for batch 1)
                  batch.batchId > 1 && (
                    <div key={`sep-${batch.batchId}`} id={`batch-${batch.batchId}`} style={s({ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', marginTop: 8 })}>
                      <div style={s({ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #e2e8f0)' })} />
                      <span style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', borderRadius: 50, padding: '5px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' })}>✨ {batch.count} New Ideas Added</span>
                      <div style={s({ flex: 1, height: 1, background: 'linear-gradient(90deg, #e2e8f0, transparent)' })} />
                    </div>
                  ),
                  // Batch ideas
                  ...sorted.map((idea, i) => {
                    const cardIdx = startIdx + i;
                    const animDelay = batch.batchId > 1 ? i * 0.06 : cardIdx * 0.04;
                    return (
                      <div key={`${batch.batchId}-${i}`} onClick={() => generateReport(idea)}
                        style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)', animation: `fadeUp 0.4s ease ${animDelay}s both` })}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(234,88,12,0.12)'; e.currentTarget.style.borderColor = 'rgba(234,88,12,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.95)'; }}>
                        <div style={s({ height: 4, background: isRawResultsMode ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'linear-gradient(90deg,#ea580c,#f59e0b)', width: `${(idea.demandScore / 10) * 100}%` })} />
                        <div style={s({ padding: '16px 18px 18px' })}>
                          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 })}>
                            <div style={s({ width: 22, height: 22, borderRadius: '50%', background: isRawResultsMode ? 'rgba(124,58,237,0.1)' : 'rgba(234,88,12,0.1)', color: isRawResultsMode ? '#7c3aed' : '#ea580c', fontFamily: 'Sora', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>#{cardIdx + 1}</div>
                            <span style={s({ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: idea.impulseScore === 'High' ? '#dcfce7' : idea.impulseScore === 'Medium' ? '#fef9c3' : '#f1f5f9', color: idea.impulseScore === 'High' ? '#15803d' : idea.impulseScore === 'Medium' ? '#92400e' : '#64748b' })}>
                              {idea.impulseScore === 'High' ? '🔥 High Impulse' : idea.impulseScore === 'Medium' ? '⚡ Mid Impulse' : '💤 Low Impulse'}
                            </span>
                          </div>
                          <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 })}>{idea.productName}</div>
                          <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 12 })}>{idea.tagline}</div>
                          <div style={s({ background: 'rgba(234,88,12,0.05)', borderLeft: '3px solid #ea580c', borderRadius: '0 8px 8px 0', padding: '8px 12px', marginBottom: 12 })}>
                            <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#334155', lineHeight: 1.6 })}>😤 {idea.primaryPain}</span>
                          </div>
                          {idea.sourceMode === 'raw' && idea.ideaConnection && (
                            <div style={s({ background: 'rgba(124,58,237,0.04)', borderLeft: '2px solid #7c3aed', borderRadius: '0 6px 6px 0', padding: '6px 10px', marginBottom: 12 })}>
                              <span style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#7c3aed', fontWeight: 600, fontStyle: 'italic' })}>💡 {idea.ideaConnection}</span>
                            </div>
                          )}
                          <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 })}>
                            <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: idea.demandScore >= 8 ? '#dcfce7' : idea.demandScore >= 5 ? '#fef9c3' : '#fee2e2', color: idea.demandScore >= 8 ? '#059669' : idea.demandScore >= 5 ? '#92400e' : '#991b1b' })}>🔍 {idea.demandScore}/10</span>
                            <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: idea.competitionLevel === 'Low' ? '#dcfce7' : idea.competitionLevel === 'Medium' ? '#fef9c3' : '#fee2e2', color: idea.competitionLevel === 'Low' ? '#059669' : idea.competitionLevel === 'Medium' ? '#92400e' : '#991b1b' })}>⚔ {idea.competitionLevel}</span>
                            <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0891b2' })}>🛠 {idea.buildTime}</span>
                          </div>
                          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                            <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#059669' })}>{idea.priceRange}</span>
                            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
                              <span onClick={(e) => { e.stopPropagation(); saveItem({ tool: 'product_navigator', item_type: 'product_idea', title: idea.productName, summary: idea.tagline, full_data: idea }); }}
                                style={s({ cursor: 'pointer', opacity: isSaving('product_navigator', 'product_idea', idea.productName) ? 0.5 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'center' })}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved('product_navigator', 'product_idea', idea.productName) ? '#ea580c' : 'none'} stroke="#ea580c" strokeWidth="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                              </span>
                              <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#ea580c', display: 'flex', gap: 4, alignItems: 'center' })}>Deep Research →</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }),
                ];
              });
            })()
          ) : (
            // Non-batch filters: render flat sorted
            sortedIdeas.map((idea, i) => (
              <div key={i} onClick={() => generateReport(idea)}
                style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)', animation: `fadeUp 0.4s ease ${i * 0.04}s both` })}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(234,88,12,0.12)'; e.currentTarget.style.borderColor = 'rgba(234,88,12,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.95)'; }}>
                <div style={s({ height: 4, background: isRawResultsMode ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'linear-gradient(90deg,#ea580c,#f59e0b)', width: `${(idea.demandScore / 10) * 100}%` })} />
                <div style={s({ padding: '16px 18px 18px' })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 })}>
                    <div style={s({ width: 22, height: 22, borderRadius: '50%', background: isRawResultsMode ? 'rgba(124,58,237,0.1)' : 'rgba(234,88,12,0.1)', color: isRawResultsMode ? '#7c3aed' : '#ea580c', fontFamily: 'Sora', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>#{i + 1}</div>
                    <span style={s({ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: idea.impulseScore === 'High' ? '#dcfce7' : idea.impulseScore === 'Medium' ? '#fef9c3' : '#f1f5f9', color: idea.impulseScore === 'High' ? '#15803d' : idea.impulseScore === 'Medium' ? '#92400e' : '#64748b' })}>
                      {idea.impulseScore === 'High' ? '🔥 High Impulse' : idea.impulseScore === 'Medium' ? '⚡ Mid Impulse' : '💤 Low Impulse'}
                    </span>
                  </div>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 })}>{idea.productName}</div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 12 })}>{idea.tagline}</div>
                  <div style={s({ background: 'rgba(234,88,12,0.05)', borderLeft: '3px solid #ea580c', borderRadius: '0 8px 8px 0', padding: '8px 12px', marginBottom: 12 })}>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#334155', lineHeight: 1.6 })}>😤 {idea.primaryPain}</span>
                  </div>
                  {idea.sourceMode === 'raw' && idea.ideaConnection && (
                    <div style={s({ background: 'rgba(124,58,237,0.04)', borderLeft: '2px solid #7c3aed', borderRadius: '0 6px 6px 0', padding: '6px 10px', marginBottom: 12 })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#7c3aed', fontWeight: 600, fontStyle: 'italic' })}>💡 {idea.ideaConnection}</span>
                    </div>
                  )}
                  <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 })}>
                    <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: idea.demandScore >= 8 ? '#dcfce7' : idea.demandScore >= 5 ? '#fef9c3' : '#fee2e2', color: idea.demandScore >= 8 ? '#059669' : idea.demandScore >= 5 ? '#92400e' : '#991b1b' })}>🔍 {idea.demandScore}/10</span>
                    <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: idea.competitionLevel === 'Low' ? '#dcfce7' : idea.competitionLevel === 'Medium' ? '#fef9c3' : '#fee2e2', color: idea.competitionLevel === 'Low' ? '#059669' : idea.competitionLevel === 'Medium' ? '#92400e' : '#991b1b' })}>⚔ {idea.competitionLevel}</span>
                    <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0891b2' })}>🛠 {idea.buildTime}</span>
                  </div>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#059669' })}>{idea.priceRange}</span>
                    <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
                      <span onClick={(e) => { e.stopPropagation(); saveItem({ tool: 'product_navigator', item_type: 'product_idea', title: idea.productName, summary: idea.tagline, full_data: idea }); }}
                        style={s({ cursor: 'pointer', opacity: isSaving('product_navigator', 'product_idea', idea.productName) ? 0.5 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'center' })}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved('product_navigator', 'product_idea', idea.productName) ? '#ea580c' : 'none'} stroke="#ea580c" strokeWidth="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      </span>
                      <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#ea580c', display: 'flex', gap: 4, alignItems: 'center' })}>Deep Research →</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ═══════════ GENERATE MORE BAR ═══════════ */}
        <div style={s({ marginTop: 32, animation: 'fadeUp 0.5s ease 0.3s both' })}>
          <div style={s({
            background: moreSuccess ? 'rgba(5,150,105,0.06)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)', borderRadius: 24,
            border: moreSuccess ? '1px solid rgba(5,150,105,0.25)' : '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.07)', padding: '24px 28px',
            transition: 'all 0.3s',
          })}>
            {productIdeas.length >= 100 ? (
              /* ── MAX IDEAS REACHED ── */
              <div style={s({ textAlign: 'center', padding: 20 })}>
                <div style={s({ fontSize: 32 })}>🏆</div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginTop: 8 })}>100 ideas generated!</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 400, margin: '6px auto 0', lineHeight: 1.7 })}>You've explored the full research depth for this niche. Time to pick your winner and build.</div>
                <div style={s({ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 })}>
                  <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b', cursor: 'pointer' })}>🔍 Deep Research Any Idea</button>
                </div>
              </div>
            ) : (
              <>
                {/* Top row */}
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 })}>
                  <div>
                    {moreSuccess ? (
                      <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#059669' })}>✓ {moreCount} new ideas added! Scroll up to see them.</div>
                    ) : (
                      <>
                        <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 })}>🔄 WANT MORE IDEAS?</div>
                        <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' })}>Generate more ideas from the same research</div>
                        <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 2 })}>New ideas will never repeat what's already shown above</div>
                      </>
                    )}
                  </div>
                  <div style={s({ textAlign: 'right' })}>
                    <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#64748b' })}>{productIdeas.length} ideas generated</div>
                    <div style={s({ width: 120, height: 4, background: '#f1f5f9', borderRadius: 50, marginTop: 4 })}>
                      <div style={s({ width: `${Math.min(productIdeas.length / 100, 1) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#ea580c,#f59e0b)', borderRadius: 50, transition: 'width 0.5s' })} />
                    </div>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', marginTop: 2 })}>{Math.max(100 - productIdeas.length, 0)} more possible</div>
                  </div>
                </div>

                <div style={s({ opacity: generatingMore ? 0.5 : 1, pointerEvents: generatingMore ? 'none' : 'auto', transition: 'opacity 0.2s' })}>
                  {/* Quantity picker */}
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 })}>HOW MANY MORE?</div>
                  <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap' })}>
                    {[5, 10, 15, 20].map(n => {
                      const remaining = 100 - productIdeas.length;
                      const disabled = n > remaining;
                      return (
                        <button key={n} onClick={() => !disabled && setMoreCount(n)}
                          style={s({
                            borderRadius: 50, padding: '8px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
                            border: moreCount === n ? '2px solid transparent' : '2px solid #e2e8f0',
                            background: moreCount === n ? 'linear-gradient(135deg,#ea580c,#f59e0b)' : '#f8fafc',
                            color: moreCount === n ? 'white' : '#64748b',
                            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                            boxShadow: moreCount === n ? '0 3px 12px rgba(234,88,12,0.3)' : 'none',
                            transform: moreCount === n ? 'scale(1.04)' : 'scale(1)',
                            opacity: disabled ? 0.4 : 1,
                            transition: 'all 0.18s',
                          })}>
                          +{n} Ideas
                        </button>
                      );
                    })}
                  </div>

                  {/* Direction picker */}
                  <div style={s({ marginTop: 18 })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 })}>WHAT KIND OF IDEAS?</div>
                    <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 })}>
                      {DIRECTION_OPTIONS.map(d => (
                        <div key={d.id} onClick={() => setMoreDirection(d.id)}
                          style={s({
                            borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                            border: moreDirection === d.id ? `1.5px solid ${d.accent}` : '1.5px solid #e2e8f0',
                            background: moreDirection === d.id ? `${d.accent}08` : '#f8fafc',
                            boxShadow: moreDirection === d.id ? `0 0 0 3px ${d.accent}12` : 'none',
                            transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                          })}
                          onMouseEnter={e => { if (moreDirection !== d.id) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${d.accent}4d`; } }}
                          onMouseLeave={e => { if (moreDirection !== d.id) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}>
                          <div style={s({ display: 'flex', gap: 10, alignItems: 'flex-start' })}>
                            <span style={s({ fontSize: 20, flexShrink: 0, marginTop: 1 })}>{d.emoji}</span>
                            <div>
                              <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2 })}>{d.name}</div>
                              <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 })}>{d.desc}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate button row */}
                <div style={s({ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 })}>
                  {generatingMore ? (
                    <div style={s({ display: 'flex', alignItems: 'center', gap: 10 })}>
                      <div style={s({ width: 20, height: 20, border: '2px solid #f1f5f9', borderTop: '2px solid #ea580c', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' })} />
                      <div>
                        <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#ea580c' })}>Generating {moreCount} new ideas...</div>
                        <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>Finding ideas you haven't seen yet...</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' })}>
                        Generating {moreCount} <strong style={{ color: '#0f172a' }}>{directionLabels[moreDirection]}</strong> ideas for <strong style={{ color: '#0f172a' }}>{inputData.niche}</strong> · {inputData.country}
                      </div>
                      <button onClick={generateMoreIdeas}
                        style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 14, padding: '12px 26px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 18px rgba(234,88,12,0.35)', transition: 'all 0.2s' })}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,88,12,0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(234,88,12,0.35)'; }}>
                        ✨ Generate {moreCount} More Ideas →
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════ STEP 3: DEEP RESEARCH REPORT ═══════════════════ */
  if (aiStep === 'report' && researchReport && selectedProduct) {
    const r = researchReport;
    const isRawReport = selectedProduct.sourceMode === 'raw';
    const chosenAngle = ideaAnalysis?.angles?.find(a => a.angleId === selectedAngle);

    return (
      <div style={s({ animation: 'fadeUp 0.4s ease', paddingBottom: 80 })}>
        {/* Breadcrumb & Header */}
        <div style={s({ marginBottom: 28 })}>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
            <span onClick={() => { setAiStep('input'); setProductIdeas([]); setResearchReport(null); }} style={s({ cursor: 'pointer' })}>AI Research</span>
            {' → '}<span onClick={() => setAiStep('results')} style={s({ cursor: 'pointer' })}>Results</span>
            {' → '}<span style={s({ fontWeight: 700, color: '#0f172a' })}>Research Report</span>
          </div>
          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 })}>
            <div>
              <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 24, color: '#0f172a', letterSpacing: '-0.02em' })}>{selectedProduct.productName}</h2>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 4 })}>{selectedProduct.tagline}</p>
              <div style={s({ display: 'flex', gap: 6, marginTop: 8 })}>
                <span style={s({ fontSize: 10, fontWeight: 700, background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 20 })}>{inputData.productType}</span>
                <span style={s({ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#059669', padding: '3px 10px', borderRadius: 20 })}>{inputData.country}</span>
                <span style={s({ fontSize: 10, fontWeight: 700, background: '#fef9c3', color: '#92400e', padding: '3px 10px', borderRadius: 20 })}>{selectedProduct.impulseScore} Impulse</span>
              </div>
            </div>
            <div style={s({ display: 'flex', gap: 8 })}>
              <button onClick={() => setAiStep('results')} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 50, padding: '7px 18px', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' })}>← Back to 30 Ideas</button>
              <button onClick={() => { setAiStep('input'); setProductIdeas([]); setResearchReport(null); }} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 50, padding: '7px 18px', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' })}>🔄 New Search</button>
              <button onClick={() => saveItem({ tool: 'product_navigator', item_type: 'deep_research', title: selectedProduct.productName, summary: `Deep research report for ${selectedProduct.productName}`, full_data: { product: selectedProduct, report: researchReport } })}
                style={s({ background: isSaved('product_navigator', 'deep_research', selectedProduct.productName) ? 'linear-gradient(135deg,#ea580c,#f59e0b)' : 'none', border: isSaved('product_navigator', 'deep_research', selectedProduct.productName) ? 'none' : '1px solid #e2e8f0', borderRadius: 50, padding: '7px 18px', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: isSaved('product_navigator', 'deep_research', selectedProduct.productName) ? 'white' : '#64748b', cursor: 'pointer', opacity: isSaving('product_navigator', 'deep_research', selectedProduct.productName) ? 0.5 : 1, transition: 'all 0.2s' })}>
                {isSaved('product_navigator', 'deep_research', selectedProduct.productName) ? '🔖 Saved' : '🔖 Save Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 })}>
          {[
            { label: 'Market Size', value: r.marketOverview?.totalAddressableMarket || 'N/A', icon: '📈', color: '#059669' },
            { label: 'Search Trend', value: r.searchDemand?.trendDirection || 'N/A', icon: '🔍', color: r.searchDemand?.trendDirection === 'Rising' ? '#059669' : r.searchDemand?.trendDirection === 'Declining' ? '#ef4444' : '#0891b2' },
            { label: 'Impulse Score', value: `${r.impulsePurchaseAnalysis?.rating || '?'}/10`, icon: '⚡', color: '#ea580c' },
            { label: 'Time to First Sale', value: r.launchStrategy?.firstSaleIn || 'N/A', icon: '🚀', color: '#ea580c' },
          ].map((m, i) => (
            <div key={i} style={s({ background: 'rgba(255,255,255,0.88)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.95)' })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 })}>{m.icon} {m.label}</div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: m.color })}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── SECTION 0: YOUR IDEA vs THE MARKET (raw mode only) ── */}
        {isRawReport && selectedProduct.originalIdea && (
          <ReportSection icon="✨" iconBg="linear-gradient(135deg,#7c3aed,#a855f7)" iconColor="white" title="Your Idea vs The Market" subtitle="How your original concept maps to real market demand">
            <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 })}>
              {/* Left — Original Idea */}
              <div style={s({ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: 16 })}>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 6 })}>💡 What You Described</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.7, fontStyle: 'italic' })}>{selectedProduct.originalIdea}</div>
              </div>
              {/* Right — Market Reality */}
              <div style={s({ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 12, padding: 16 })}>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 6 })}>📊 Market Reality</div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 })}>{selectedProduct.productName}</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' })}>{selectedProduct.tagline}</div>
              </div>
            </div>

            {/* Alignment bar */}
            <div style={s({ marginTop: 16 })}>
              <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#64748b' })}>Idea-Market Alignment</span>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#7c3aed', fontWeight: 700 })}>{(selectedProduct.demandScore || 7) * 10}% aligned</span>
              </div>
              <div style={s({ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden' })}>
                <div style={s({ width: `${(selectedProduct.demandScore || 7) * 10}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 50, transition: 'width 0.8s ease' })} />
              </div>
            </div>

            {/* Monetization bridge */}
            {(ideaAnalysis?.recommendedAngleReason || chosenAngle?.whyThisWorks) && (
              <div style={s({ marginTop: 14, background: 'linear-gradient(135deg,rgba(234,88,12,0.06),rgba(245,158,11,0.04))', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 12, padding: '14px 16px' })}>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', marginBottom: 6 })}>🚀 How to Bridge Your Idea to Income:</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.7 })}>
                  {ideaAnalysis?.recommendedAngleReason}{chosenAngle?.whyThisWorks ? ` ${chosenAngle.whyThisWorks}` : ''}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* SECTIONS */}
        <ReportSection icon="🌍" iconBg="#dcfce7" iconColor="#059669" title="Market Overview" subtitle="Total addressable market & audience">
          <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 })}>
            {[
              { label: 'Total Addressable Market', value: r.marketOverview?.totalAddressableMarket },
              { label: 'Growth Rate', value: r.marketOverview?.growthRate },
              { label: 'Audience Size', value: r.marketOverview?.audienceSize },
              { label: 'Buying Power', value: r.marketOverview?.buyingPower },
            ].map((item, i) => (
              <div key={i} style={s({ background: '#f8fafc', borderRadius: 10, padding: 12 })}>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 })}>{item.label}</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#0f172a' })}>{item.value || 'N/A'}</div>
              </div>
            ))}
          </div>
          {r.marketOverview?.primaryAudience && (
            <div style={s({ background: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 12 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 })}>Primary Audience</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', lineHeight: 1.6 })}>{r.marketOverview.primaryAudience}</div>
            </div>
          )}
          {r.marketOverview?.platformsTheyUseToFind && (
            <div style={s({ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 })}>
              {r.marketOverview.platformsTheyUseToFind.map((p: string, i: number) => (
                <span key={i} style={s({ background: '#dcfce7', color: '#059669', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700 })}>{p}</span>
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection icon="🔍" iconBg="#f0f9ff" iconColor="#0891b2" title="Search Demand" subtitle="Keywords, trends & timing">
          {r.searchDemand?.primaryKeyword && (
            <div style={s({ display: 'inline-block', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 50, padding: '8px 20px', fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0891b2', marginBottom: 12 })}>{r.searchDemand.primaryKeyword}</div>
          )}
          <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569', marginBottom: 8 })}>Est. monthly searches: <strong>{r.searchDemand?.estimatedMonthlySearches || 'N/A'}</strong></div>
          {r.searchDemand?.trendNote && <div style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#475569', lineHeight: 1.7, marginBottom: 12 })}>{r.searchDemand.trendNote}</div>}
          {r.searchDemand?.bestTimeToLaunch && (
            <div style={s({ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 13, color: '#92400e', marginBottom: 12 })}>🗓 Best time to launch: {r.searchDemand.bestTimeToLaunch}</div>
          )}
          {r.searchDemand?.relatedKeywords && (
            <div style={s({ display: 'flex', gap: 6, flexWrap: 'wrap' })}>
              {r.searchDemand.relatedKeywords.map((kw: string, i: number) => (
                <span key={i} style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 50, padding: '4px 12px', fontFamily: 'DM Sans', fontSize: 12, color: '#475569' })}>{kw}</span>
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection icon="😤" iconBg="#fee2e2" iconColor="#ef4444" title="5 Pain Points" subtitle="What keeps your buyer up at night">
          {r.painPoints?.map((pp: any, i: number) => {
            const rankColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];
            return (
              <div key={i} style={s({ borderLeft: `4px solid ${rankColors[i] || '#94a3b8'}`, background: '#f8fafc', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 10 })}>
                <div style={s({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 })}>
                  <div style={s({ width: 22, height: 22, borderRadius: '50%', background: rankColors[i] || '#94a3b8', color: 'white', fontFamily: 'Sora', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>{pp.rank || i + 1}</div>
                  <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' })}>{pp.title}</span>
                  <span style={s({ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: pp.emotionalWeight === 'High' ? '#fee2e2' : pp.emotionalWeight === 'Medium' ? '#fef9c3' : '#f1f5f9', color: pp.emotionalWeight === 'High' ? '#991b1b' : pp.emotionalWeight === 'Medium' ? '#92400e' : '#64748b' })}>{pp.emotionalWeight}</span>
                </div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#475569', lineHeight: 1.7 })}>{pp.description}</div>
                {pp.trigger && <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#ea580c', fontWeight: 600, marginTop: 6 })}>⚡ Trigger: {pp.trigger}</div>}
              </div>
            );
          })}
        </ReportSection>

        {/* ── SECTION 4: BUYER TRANSFORMATION ── */}
        {r.transformation && <BuyerTransformationSection transformation={r.transformation} />}

        <ReportSection icon="💎" iconBg="#ede9fe" iconColor="#7c3aed" title="Deepest Desires" subtitle="What they really want">
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 })}>
            {r.deepestDesires?.map((d: any, i: number) => (
              <div key={i} style={s({ background: 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(168,85,247,0.03))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: 16 })}>
                <span style={s({ fontSize: 20, display: 'block', marginBottom: 8 })}>💎</span>
                <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, color: '#0f172a', lineHeight: 1.4, marginBottom: 8 })}>{d.desire}</div>
                <div style={s({ borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 6 })}>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', fontStyle: 'italic', marginBottom: 6 })}>{d.underlyingBelief}</div>
                  <span style={s({ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50 })}>{d.emotionalDriver}</span>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection icon="🧠" iconBg="#fff7ed" iconColor="#ea580c" title="Empathy Map" subtitle="Inside your buyer's mind">
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 })}>
            {[
              { key: 'thinks', emoji: '💭', label: 'THINKS' },
              { key: 'feels', emoji: '❤️', label: 'FEELS' },
              { key: 'sees', emoji: '👁', label: 'SEES' },
              { key: 'hears', emoji: '👂', label: 'HEARS' },
              { key: 'says', emoji: '💬', label: 'SAYS' },
              { key: 'does', emoji: '🎯', label: 'DOES' },
            ].map(cell => (
              <div key={cell.key} style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 })}>
                <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 })}>{cell.emoji} {cell.label}</div>
                {r.empathyMap?.[cell.key]?.map((item: string, i: number) => (
                  <div key={i} style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#334155', lineHeight: 1.7, marginBottom: 4 })}>→ {item}</div>
                ))}
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection icon="🎯" iconBg="#dcfce7" iconColor="#059669" title="Primary Solution" subtitle="How this product solves the problem">
          <div style={s({ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 12 })}>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#166534', lineHeight: 1.75 })}>{r.primarySolution?.howProductSolvesIt}</div>
          </div>
          <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 })}>
            <div style={s({ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 12, padding: 14 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#ea580c', marginBottom: 4 })}>TRANSFORMATION</div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, color: '#0f172a' })}>{r.primarySolution?.transformationStatement}</div>
            </div>
            <div style={s({ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 12, padding: 14 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 4 })}>QUICK WIN (24 hrs)</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a' })}>{r.primarySolution?.quickWin}</div>
            </div>
          </div>
        </ReportSection>

        <ReportSection icon="⚡" iconBg="#fef9c3" iconColor="#f59e0b" title="Impulse Purchase Analysis" subtitle="Why they buy now">
          {r.impulsePurchaseAnalysis?.rating && (
            <div style={s({ textAlign: 'center', marginBottom: 16 })}>
              <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 48, background: 'linear-gradient(135deg,#ea580c,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as any)}>{r.impulsePurchaseAnalysis.rating}</span>
              <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#94a3b8' })}>/10</span>
              <div style={s({ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 50, marginTop: 8 })}>
                <div style={s({ width: `${(r.impulsePurchaseAnalysis.rating / 10) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#ea580c,#f59e0b)', borderRadius: 50, transition: 'width 0.8s ease' })} />
              </div>
            </div>
          )}
          <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.7, marginBottom: 16 })}>{r.impulsePurchaseAnalysis?.whyTheyBuyNow}</div>
          <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 })}>
            {r.impulsePurchaseAnalysis?.purchaseTriggers?.map((t: string, i: number) => (
              <div key={i} style={s({ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 13, color: '#9a3412' })}>{t}</div>
            ))}
          </div>
          {r.impulsePurchaseAnalysis?.objections && (
            <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 })}>
              {r.impulsePurchaseAnalysis.objections.map((obj: string, i: number) => (
                <div key={i} style={s({ display: 'contents' })}>
                  <div style={s({ background: '#fee2e2', borderRadius: 8, padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b', lineHeight: 1.6 })}>❌ {obj}</div>
                  <div style={s({ background: '#dcfce7', borderRadius: 8, padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 13, color: '#166534', lineHeight: 1.6 })}>✅ {r.impulsePurchaseAnalysis.objectionHandlers?.[i] || ''}</div>
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection icon="⚔️" iconBg="#fce7f3" iconColor="#be185d" title="Competitor Landscape" subtitle="Who you're up against">
          <div style={s({ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 })}>
            {r.competitorLandscape?.directCompetitors?.map((comp: any, i: number) => (
              <div key={i} style={s({ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', minWidth: 200, flex: 1 })}>
                <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' })}>{comp.name}</div>
                <span style={s({ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 4 })}>{comp.platform}</span>
                <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#059669', marginTop: 6 })}>{comp.price}</div>
                <div style={s({ borderTop: '1px solid #f1f5f9', paddingTop: 6, marginTop: 6, fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b' })}>🎯 Gap: {comp.weakness}</div>
              </div>
            ))}
          </div>
          {r.competitorLandscape?.marketGap && (
            <div style={s({ background: 'linear-gradient(135deg,rgba(236,72,153,0.06),rgba(192,38,211,0.04))', border: '1px solid rgba(236,72,153,0.15)', borderRadius: 12, padding: 16 })}>
              <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#be185d', marginBottom: 4 })}>🏆 Your Market Gap:</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.7 })}>{r.competitorLandscape.marketGap}</div>
            </div>
          )}
        </ReportSection>

        <ReportSection icon="🚀" iconBg="#fff7ed" iconColor="#ea580c" title="Your Next Steps" subtitle="Start building today" glowing>
          {r.nextSteps?.map((step: any, i: number) => (
            <div key={i} style={s({ background: 'white', borderRadius: 14, padding: 16, marginBottom: 10, border: '1px solid #f1f5f9', borderLeft: `4px solid ${STEP_COLORS[i % STEP_COLORS.length]}` })}>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 })}>
                <div style={s({ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${STEP_COLORS[i % STEP_COLORS.length]},${STEP_COLORS[(i + 1) % STEP_COLORS.length]})`, color: 'white', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>{step.step || i + 1}</div>
                <div style={s({ flex: 1 })}>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14.5, color: '#0f172a' })}>{step.action}</div>
                </div>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: '#f8fafc', color: '#64748b', padding: '3px 10px', borderRadius: 50 })}>{step.timeframe}</span>
              </div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 4 })}>🛠 {step.tool}</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.65 })}>{step.details}</div>
            </div>
          ))}
        </ReportSection>

        <ReportSection icon="📣" iconBg="#cffafe" iconColor="#0e7490" title="Launch Strategy" subtitle="Platform, pricing & content plan">
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 })}>
            <div style={s({ background: '#f8fafc', borderRadius: 12, padding: 14 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 })}>Best Platform</div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: '#0f172a' })}>{r.launchStrategy?.recommendedPlatform}</div>
            </div>
            <div style={s({ background: '#f8fafc', borderRadius: 12, padding: 14 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 })}>Pricing Strategy</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', lineHeight: 1.6 })}>{r.launchStrategy?.pricingStrategy}</div>
            </div>
            <div style={s({ background: '#f8fafc', borderRadius: 12, padding: 14 })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 })}>First Sale In</div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#059669', lineHeight: 1.6 })}>{r.launchStrategy?.firstSaleIn}</div>
            </div>
          </div>
          {r.launchStrategy?.launchContent && (
            <div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 })}>LAUNCH CONTENT IDEAS</div>
              {r.launchStrategy.launchContent.map((c: string, i: number) => (
                <div key={i} style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 8, fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.7 })}>
                  <span style={s({ color: '#ea580c', fontWeight: 700, fontSize: 11 })}>📱 Content Idea {i + 1}:</span><br />{c}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* CTA Footer — separated from report */}
        <div style={s({ marginTop: 32, background: 'linear-gradient(135deg, #f0fdf4 0%, #fffbeb 50%, #fef2f2 100%)', border: '2px solid #e2e8f0', borderRadius: 20, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' })}>
          <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a' })}>Ready to build {selectedProduct.productName}?</span>
          <div style={s({ display: 'flex', gap: 10 })}>
            <button onClick={() => setAiStep('results')} style={s({ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 50, padding: '10px 22px', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' })}>← Explore Other Ideas</button>
            <button onClick={() => {
              if (!onBuildOffer || !selectedProduct) return;
              onBuildOffer({
                productName: `${selectedProduct.productName} — ${selectedProduct.tagline}`,
                audience: r.marketOverview?.primaryAudience || selectedProduct.targetAudience || '',
                beforeState: r.transformation?.beforeParagraph
                  || `Someone struggling with: ${selectedProduct.primaryPain}`,
                afterState: r.transformation?.afterParagraph
                  || `Someone who has solved this with ${selectedProduct.productName}`,
                transformationBridge: r.transformation?.transformationBridge || '',
                sourceProduct: selectedProduct.productName,
                sourceNiche: inputData.niche || rawIdeaData.ideaText?.slice(0, 40) || '',
                sourceCountry: inputData.country || rawIdeaData.country || '',
                sourcedAt: new Date().toISOString(),
              });
            }}
              style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 22px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 18px rgba(234,88,12,0.35)', transition: 'all 0.2s' })}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,88,12,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(234,88,12,0.35)'; }}>
              🎁 Build Offer for This Product →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
