import { useState, useEffect, useRef, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithRetry } from '@/utils/retryFetch';
import { useSaveItem } from '@/hooks/useSaveItem';
import { useCreditGate } from '@/hooks/useCreditGate';

/* ───────── Types ───────── */
interface BaseBrief {
  productName: string;
  audience: string;
  beforeState: string;
  afterState: string;
  price: string;
  currency: 'inr' | 'usd' | 'gbp';
}

interface CopySection {
  id: string;
  name: string;
  icon: string;
  content: string;
}

interface CopyScore {
  overall: number;
  hookPower: number;
  clarity: number;
  emotionalPull: number;
  ctaStrength: number;
  tips: string[];
}

interface CopyType {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  description: string;
  whatYouGet: string[];
  time: string;
}

type CopyStep = 'select' | 'brief' | 'output';
type Tone = 'professional' | 'conversational' | 'bold' | 'empathetic';

/* ───────── Constants ───────── */
const s = (styles: CSSProperties): CSSProperties => styles;

const COPY_TYPES: CopyType[] = [
  { id: 'landing_page', name: 'Landing Page Copy', icon: '🏠', iconBg: 'linear-gradient(135deg,#7c3aed,#a855f7)', description: 'Capture leads with a high-converting opt-in page that makes visitors say yes instantly', whatYouGet: ['Hero headline', 'Opt-in benefits', 'CTA section'], time: '~2 min' },
  { id: 'sales_page', name: 'Sales Page Copy', icon: '💰', iconBg: 'linear-gradient(135deg,#ea580c,#f59e0b)', description: 'Full long-form sales page that takes cold visitors and turns them into buyers', whatYouGet: ['Story + problem', 'Full offer section', 'FAQ + guarantee'], time: '~3 min' },
  { id: 'order_bump', name: 'Order Bump Copy', icon: '⚡', iconBg: 'linear-gradient(135deg,#f59e0b,#eab308)', description: 'The small box on the checkout page that adds 15–30% to your average order value', whatYouGet: ['Bump headline', '3-line pitch', 'Checkbox CTA'], time: '~1 min' },
  { id: 'upsell', name: 'Upsell Copy', icon: '🚀', iconBg: 'linear-gradient(135deg,#059669,#10b981)', description: 'Post-purchase offer page that turns a ₹999 buyer into a ₹4,999 buyer', whatYouGet: ['Congratulations bridge', 'Upsell reveal', 'One-time urgency'], time: '~2 min' },
  { id: 'downsell', name: 'Downsell Copy', icon: '💙', iconBg: 'linear-gradient(135deg,#06b6d4,#3b82f6)', description: "Catch the 'no' on your upsell and convert them with a stripped-down offer", whatYouGet: ['Wait headline', 'Reduced offer', 'New price justification'], time: '~1 min' },
  { id: 'thank_you_page', name: 'Thank You Page Copy', icon: '🎉', iconBg: 'linear-gradient(135deg,#ec4899,#f43f5e)', description: 'Turn the most-ignored page into a relationship builder and next-step driver', whatYouGet: ['Confirmation message', 'Next steps', 'Community invite'], time: '~2 min' },
  { id: 'followup_email', name: 'Follow-up Email Copy', icon: '📧', iconBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', description: 'One perfectly crafted follow-up email for any stage of your buyer journey', whatYouGet: ['3 subject line options', 'Full email body', 'PS line'], time: '~2 min' },
];

const TONES: { id: Tone; emoji: string; label: string; accent: string; lightBg: string; description: string }[] = [
  { id: 'professional', emoji: '🎩', label: 'Professional', accent: '#0f172a', lightBg: 'rgba(15,23,42,0.04)', description: 'Clean, authoritative, trust-building. Perfect for B2B or premium offers.' },
  { id: 'conversational', emoji: '😊', label: 'Conversational', accent: '#ea580c', lightBg: 'rgba(234,88,12,0.04)', description: "Friendly, relatable, Indian-market-native. Feels like a friend recommending." },
  { id: 'bold', emoji: '🔥', label: 'Bold', accent: '#ef4444', lightBg: 'rgba(239,68,68,0.04)', description: "High-energy, FOMO-driven, direct. 'Stop scrolling, this changes everything.'" },
  { id: 'empathetic', emoji: '💙', label: 'Empathetic', accent: '#06b6d4', lightBg: 'rgba(6,182,212,0.04)', description: 'Deeply understanding of pain. Warm, validating, emotionally resonant.' },
];

const STEP_LABELS = ['Pick Copy Type', 'Fill Brief', 'Your Copy'];

function getScoreColor(score: number) {
  if (score >= 90) return '#7c3aed';
  if (score >= 75) return '#059669';
  if (score >= 51) return '#f59e0b';
  return '#ef4444';
}

/* ───────── Step Progress ───────── */
function StepProgress({ currentStep }: { currentStep: CopyStep }) {
  const stepIdx = currentStep === 'select' ? 0 : currentStep === 'brief' ? 1 : 2;
  return (
    <div style={s({ display: 'flex', alignItems: 'center', maxWidth: 500, margin: '0 auto 28px', gap: 0 })}>
      {STEP_LABELS.map((label, i) => {
        const completed = i < stepIdx;
        const active = i === stepIdx;
        return (
          <div key={label} style={s({ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' })}>
            <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
              <div style={s({
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Sora', fontWeight: 800, fontSize: 12,
                background: completed ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9',
                color: completed || active ? 'white' : '#94a3b8',
                boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
              })}>
                {completed ? '✓' : i + 1}
              </div>
              <span style={s({ fontFamily: 'DM Sans', fontWeight: active ? 700 : 500, fontSize: 12, color: active ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap' })}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={s({ flex: 1, height: 2, background: completed ? '#6366f1' : '#e2e8f0', margin: '0 12px', borderRadius: 2, minWidth: 30 })} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Score Ring ───────── */
function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const [display, setDisplay] = useState(0);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;
  const color = getScoreColor(score);

  useEffect(() => {
    let frame = 0;
    const target = score;
    const interval = setInterval(() => {
      frame += 2;
      if (frame >= target) { setDisplay(target); clearInterval(interval); return; }
      setDisplay(frame);
    }, 20);
    return () => clearInterval(interval);
  }, [score]);

  return (
    <div style={s({ position: 'relative', width: size, height: size })}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={s({ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' })}>
        <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: size * 0.32, color, lineHeight: 1 })}>{display}</span>
      </div>
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function CopySuite({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<CopyStep>('select');
  const [selectedType, setSelectedType] = useState<CopyType | null>(null);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  // Brief state
  const [brief, setBrief] = useState<BaseBrief>({ productName: '', audience: '', beforeState: '', afterState: '', price: '', currency: 'inr' });
  const [tone, setTone] = useState<Tone>('conversational');
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});

  // Output state
  const [sections, setSections] = useState<CopySection[]>([]);
  const [score, setScore] = useState<CopyScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const { saveItem, isSaved, isSaving } = useSaveItem();

  const mainRef = useRef<HTMLDivElement>(null);

  // Loading step animation
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const timers = [
      setTimeout(() => setLoadingStep(1), 800),
      setTimeout(() => setLoadingStep(2), 2400),
      setTimeout(() => setLoadingStep(3), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSelectType = (type: CopyType) => {
    setSelectedType(type);
    setStep('brief');
    setTypeInputs({});
    scrollToTop();
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
    setBrief({ productName: '', audience: '', beforeState: '', afterState: '', price: '', currency: 'inr' });
    setTone('conversational');
    setTypeInputs({});
    setSections([]);
    setScore(null);
    setError(null);
    scrollToTop();
  };

  const handleGenerate = async () => {
    if (!selectedType) return;
    setLoading(true);
    setError(null);
    scrollToTop();

    try {
      const { data, error: fnError } = await invokeWithRetry('generate-copy', {
        body: {
          copyType: selectedType.name,
          baseBrief: brief,
          typeSpecificInputs: typeInputs,
          tone,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Generation failed');
      if (data?.error) throw new Error(data.error);

      // Normalize: ensure every section.content is a string (AI sometimes returns objects/arrays)
      const safeSections = (data.sections || []).map((s: any) => ({
        ...s,
        content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2),
      }));
      setSections(safeSections);
      setScore(data.score || null);
      setStep('output');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = () => {
    setStep('brief');
    setSections([]);
    setScore(null);
    setTimeout(handleGenerate, 100);
  };

  const copyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = () => {
    const all = sections.map(s => `${s.icon} ${s.name}\n${'─'.repeat(30)}\n${s.content}`).join('\n\n\n');
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleSave = () => {
    if (!selectedType) return;
    saveItem({
      tool: 'copy_suite',
      item_type: 'copy_output',
      title: `${selectedType.name} — ${brief.productName}`,
      summary: sections[0]?.content?.slice(0, 120) || '',
      full_data: { copyType: selectedType, baseBrief: brief, typeSpecificInputs: typeInputs, tone, sections, score },
    });
  };

  // Validation
  const baseValid = brief.productName.trim() && brief.audience.trim() && brief.beforeState.trim() && brief.afterState.trim() && brief.price.trim();
  const validationMessages = [];
  if (!brief.productName.trim()) validationMessages.push('Fill product name to continue');
  else if (!brief.audience.trim()) validationMessages.push('✓ Product · Fill audience');
  else if (!brief.beforeState.trim() || !brief.afterState.trim()) validationMessages.push('✓ Product + audience · Add transformation');
  else if (!brief.price.trim()) validationMessages.push('✓ Product + audience + transformation · Add price');
  else validationMessages.push('✓ All fields ready — generate your copy!');

  const saveKey = selectedType ? `${selectedType.name} — ${brief.productName}` : '';
  const saved = selectedType ? isSaved('copy_suite', 'copy_output', saveKey) : false;
  const savingInProgress = selectedType ? isSaving('copy_suite', 'copy_output', saveKey) : false;

  const currencySymbol = brief.currency === 'usd' ? '$' : brief.currency === 'gbp' ? '£' : '₹';

  return (
    <div ref={mainRef} style={s({ animation: 'fadeUp 0.4s ease' })}>
      {/* Breadcrumb */}
      <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
        <span onClick={onBack} style={s({ cursor: 'pointer', fontWeight: 500 })}>Dashboard</span>
        <span> / </span>
        <span style={s({ fontWeight: 700, color: '#0f172a' })}>Copywriting Suite</span>
      </div>

      {/* Header */}
      <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 })}>
        <div>
          <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: '#0f172a', letterSpacing: '-0.02em' })}>✍️ Copywriting Suite</h1>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 4 })}>
            Pick what you need written. Fill the brief. Get copy that converts.
          </p>
        </div>
      </div>

      <StepProgress currentStep={step} />

      {/* ── STATE 1: SELECT ── */}
      {step === 'select' && (
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 24 })}>
          {COPY_TYPES.map((type, i) => {
            const isHovered = hoveredType === type.id;
            return (
              <div key={type.id}
                onClick={() => handleSelectType(type)}
                onMouseEnter={() => setHoveredType(type.id)}
                onMouseLeave={() => setHoveredType(null)}
                style={s({
                  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20,
                  padding: 22, cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.9)',
                  boxShadow: isHovered ? '0 12px 32px rgba(0,0,0,0.1)' : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: isHovered ? 'translateY(-4px)' : 'none',
                  transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  animation: `fadeUp 0.4s ease ${i * 0.06}s both`,
                })}>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' })}>
                  <div style={s({ width: 44, height: 44, borderRadius: 14, background: type.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 })}>
                    {type.icon}
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', background: '#f8fafc', borderRadius: 50, padding: '3px 10px' })}>{type.time}</span>
                </div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginTop: 12 })}>{type.name}</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.6 })}>{type.description}</div>
                <div style={s({ marginTop: 10 })}>
                  {type.whatYouGet.map(item => (
                    <div key={item} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', lineHeight: 1.8 })}>· {item}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── STATE 2: BRIEF ── */}
      {step === 'brief' && selectedType && !loading && (
        <div style={s({ animation: 'fadeUp 0.35s ease', maxWidth: 720 })}>
          <div onClick={() => { setStep('select'); scrollToTop(); }} style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', cursor: 'pointer', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 4 })}>
            ← Change Copy Type
          </div>

          {/* Type badge */}
          <div style={s({ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 50, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 20 })}>
            <span style={s({ fontSize: 16 })}>{selectedType.icon}</span>
            <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#6366f1' })}>{selectedType.name}</span>
          </div>

          <h2 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#0f172a' })}>Fill Your Brief</h2>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 24 })}>The more specific you are, the better your copy performs</p>

          {/* Field 01 */}
          <FieldLabel num="01" label="WHAT ARE YOU SELLING?" />
          <input value={brief.productName} onChange={e => setBrief(p => ({ ...p, productName: e.target.value.slice(0, 120) }))}
            placeholder="e.g. The Wedding Night Decoded — A Guide for Newly Married Couples"
            style={fieldInput()} />
          <div style={charCounter()}>{brief.productName.length}/120</div>

          {/* Field 02 */}
          <FieldLabel num="02" label="WHO IS THIS FOR?" />
          <textarea value={brief.audience} onChange={e => setBrief(p => ({ ...p, audience: e.target.value.slice(0, 400) }))}
            placeholder="e.g. Newly married couples in India aged 22-30 who feel anxious about intimacy"
            style={{ ...fieldInput(), minHeight: 80, resize: 'vertical' as const }} />
          <div style={charCounter()}>{brief.audience.length}/400</div>

          {/* Field 03 */}
          <FieldLabel num="03" label="WHAT'S THE #1 TRANSFORMATION?" />
          <div style={s({ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 })}>
            <div style={s({ flex: 1 })}>
              <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#ef4444', marginBottom: 4 })}>BEFORE</div>
              <textarea value={brief.beforeState} onChange={e => setBrief(p => ({ ...p, beforeState: e.target.value.slice(0, 200) }))}
                placeholder="Their painful reality"
                style={{ ...fieldInput(), minHeight: 60, background: 'rgba(239,68,68,0.04)', border: '1.5px solid rgba(239,68,68,0.15)' }} />
            </div>
            <span style={s({ fontSize: 20, color: '#94a3b8', marginTop: 16 })}>→</span>
            <div style={s({ flex: 1 })}>
              <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#059669', marginBottom: 4 })}>AFTER</div>
              <textarea value={brief.afterState} onChange={e => setBrief(p => ({ ...p, afterState: e.target.value.slice(0, 200) }))}
                placeholder="Their transformed life"
                style={{ ...fieldInput(), minHeight: 60, background: 'rgba(5,150,105,0.04)', border: '1.5px solid rgba(5,150,105,0.15)' }} />
            </div>
          </div>

          {/* Field 04 */}
          <FieldLabel num="04" label="WHAT'S THE PRICE?" />
          <div style={s({ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 })}>
            <div style={s({ position: 'relative', flex: 1 })}>
              <span style={s({ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#64748b' })}>{currencySymbol}</span>
              <input type="number" value={brief.price} onChange={e => setBrief(p => ({ ...p, price: e.target.value }))}
                placeholder="e.g. 1999"
                style={{ ...fieldInput(), paddingLeft: 30 }} />
            </div>
            <div style={s({ display: 'flex', gap: 4 })}>
              {(['inr', 'usd', 'gbp'] as const).map(c => (
                <button key={c} onClick={() => setBrief(p => ({ ...p, currency: c }))}
                  style={s({
                    fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, padding: '6px 12px', borderRadius: 50,
                    border: brief.currency === c ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                    background: brief.currency === c ? 'rgba(99,102,241,0.06)' : '#f8fafc',
                    color: brief.currency === c ? '#6366f1' : '#64748b', cursor: 'pointer',
                  })}>
                  {c === 'inr' ? '₹ INR' : c === 'usd' ? '$ USD' : '£ GBP'}
                </button>
              ))}
            </div>
          </div>

          {/* Field 05 — Tone */}
          <FieldLabel num="05" label="WHAT TONE SHOULD THE COPY USE?" />
          <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 })}>
            {TONES.map(t => (
              <div key={t.id} onClick={() => setTone(t.id)}
                style={s({
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  border: tone === t.id ? `1.5px solid ${t.accent}` : '1.5px solid #f1f5f9',
                  background: tone === t.id ? t.lightBg : 'white',
                  transition: 'all 0.15s ease',
                })}>
                <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 })}>
                  {t.emoji} {t.label}
                </div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', lineHeight: 1.5 })}>{t.description}</div>
              </div>
            ))}
          </div>

          {/* Type-specific fields */}
          <TypeSpecificFields typeId={selectedType.id} typeName={selectedType.name} inputs={typeInputs} setInputs={setTypeInputs} currencySymbol={currencySymbol} />

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={!baseValid}
            style={s({
              width: '100%', padding: 16, borderRadius: 16, border: 'none', cursor: baseValid ? 'pointer' : 'not-allowed',
              fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: baseValid ? 'white' : '#94a3b8',
              background: baseValid ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : '#f1f5f9',
              boxShadow: baseValid ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
              transition: 'all 0.2s ease', marginTop: 8,
            })}
            onMouseEnter={e => { if (baseValid) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(99,102,241,0.4)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; if (baseValid) e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)'; }}>
            ✍️ Write My Copy →
          </button>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: baseValid ? '#059669' : '#94a3b8', textAlign: 'center', marginTop: 8 })}>
            {validationMessages[validationMessages.length - 1]}
          </div>

          {error && <div style={s({ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' })}>{error}</div>}
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && selectedType && (
        <div style={s({
          background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '48px 32px',
          textAlign: 'center', animation: 'fadeUp 0.35s ease', maxWidth: 540, margin: '0 auto',
        })}>
          <div style={s({ fontSize: 48, animation: 'float 2s ease-in-out infinite' })}>✍️</div>
          <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginTop: 16 })}>Writing your copy...</h3>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 6, marginBottom: 28 })}>Crafting words that convert for the Indian market</p>

          {['📖 Analyzing your brief...', '🧠 Applying copywriting frameworks...', '✍️ Writing section by section...', '⚡ Scoring your copy strength...'].map((step, i) => (
            <div key={i} style={s({ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: i === 0 ? 0 : 10, animation: loadingStep >= i ? 'fadeIn 0.4s ease' : 'none', opacity: loadingStep >= i ? 1 : 0.3 })}>
              <div style={s({
                width: 8, height: 8, borderRadius: '50%',
                background: loadingStep > i ? '#059669' : loadingStep === i ? '#06b6d4' : '#cbd5e1',
                animation: loadingStep === i ? 'pulse 1.5s ease-in-out infinite' : 'none',
              })} />
              <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: loadingStep >= i ? '#0f172a' : '#94a3b8' })}>
                {loadingStep > i ? '✓ ' : ''}{step}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── STATE 3: OUTPUT ── */}
      {step === 'output' && selectedType && sections.length > 0 && (
        <div style={s({ animation: 'fadeUp 0.35s ease' })}>
          {/* Output header */}
          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 })}>
            <div style={s({ display: 'flex', alignItems: 'center', gap: 10 })}>
              <div style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 50, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' })}>
                <span>{selectedType.icon}</span>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#6366f1' })}>{selectedType.name}</span>
              </div>
              <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#0f172a' })}>Copy Ready</span>
            </div>
            <div style={s({ display: 'flex', gap: 10 })}>
              <button onClick={copyAll} style={outlineBtn()}>
                {copiedAll ? '✓ Copied!' : '📋 Copy Everything'}
              </button>
              <button onClick={handleSave} disabled={savingInProgress} style={outlineBtn()}>
                {savingInProgress ? '...' : saved ? '🔖 Saved ✓' : '🔖 Save Copy'}
              </button>
              <button onClick={handleRewrite} style={outlineBtn()}>🔄 Rewrite</button>
            </div>
          </div>

          <div style={s({ display: 'flex', gap: 24, alignItems: 'flex-start' })}>
            {/* Main sections */}
            <div style={s({ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 })}>
              {sections.map((section, i) => (
                <div key={section.id} style={s({
                  background: 'white', borderRadius: 16, border: '1px solid #f1f5f9', padding: '20px 22px',
                  animation: `fadeUp 0.35s ease ${i * 0.06}s both`,
                })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#6366f1' })}>{section.icon} {section.name}</span>
                    <button onClick={() => copyText(section.content, section.id)} style={s({
                      fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: copiedSection === section.id ? '#059669' : '#64748b',
                      background: 'none', border: 'none', cursor: 'pointer',
                    })}>
                      {copiedSection === section.id ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' })}>
                    {typeof section.content === 'string'
                      ? section.content
                      : String(JSON.stringify(section.content, null, 2))}
                  </div>
                </div>
              ))}
            </div>

            {/* Score sidebar — desktop only */}
            {score && (
              <div className="copy-score-panel" style={s({
                width: 280, flexShrink: 0, position: 'sticky' as const, top: 80,
                background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.9)', padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              })}>
                <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center' })}>
                  <ScoreRing score={score.overall} />
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 8 })}>Copy Strength</span>
                </div>

                <div style={s({ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 })}>
                  {[
                    { label: '🪝 Hook Power', value: score.hookPower, color: '#ea580c' },
                    { label: '💡 Clarity', value: score.clarity, color: '#059669' },
                    { label: '❤️ Emotional Pull', value: score.emotionalPull, color: '#ec4899' },
                    { label: '🎯 CTA Strength', value: score.ctaStrength, color: '#6366f1' },
                  ].map(d => (
                    <div key={d.label}>
                      <div style={s({ display: 'flex', justifyContent: 'space-between', marginBottom: 4 })}>
                        <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#475569' })}>{d.label}</span>
                        <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0f172a' })}>{d.value}/25</span>
                      </div>
                      <div style={s({ height: 6, borderRadius: 50, background: '#f1f5f9', overflow: 'hidden' })}>
                        <div style={s({ width: `${(d.value / 25) * 100}%`, height: '100%', borderRadius: 50, background: d.color, transition: 'width 0.6s ease' })} />
                      </div>
                    </div>
                  ))}
                </div>

                {score.tips && score.tips.length > 0 && (
                  <div style={s({ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 16 })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 })}>QUICK WINS</div>
                    {score.tips.map((tip, i) => (
                      <div key={i} style={s({ display: 'flex', gap: 8, marginBottom: 8 })}>
                        <span style={s({ fontSize: 12 })}>⚡</span>
                        <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#374151', lineHeight: 1.5 })}>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom action strip */}
          <div style={s({
            position: 'sticky' as const, bottom: 0, left: 0, right: 0,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.9)', padding: '16px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderRadius: '0 0 20px 20px', marginTop: 20,
          })}>
            <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
              <span style={s({ fontSize: 14 })}>{selectedType.icon}</span>
              <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0f172a' })}>{selectedType.name}</span>
            </div>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' })}>✍️ Need a different copy type?</span>
            <div style={s({ display: 'flex', gap: 10 })}>
              <button onClick={handleBack} style={outlineBtn()}>← Write Another Type</button>
              <button onClick={handleRewrite} style={outlineBtn()}>🔄 Rewrite This</button>
            </div>
          </div>

          {/* Mobile score card below sections */}
          {score && (
            <div className="copy-score-mobile" style={s({
              display: 'none', marginTop: 20,
              background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.9)', padding: 20,
            })}>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 16 })}>
                <ScoreRing score={score.overall} size={80} />
                <div>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a' })}>Copy Strength</div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', marginTop: 2 })}>
                    Hook: {score.hookPower}/25 · Clarity: {score.clarity}/25 · Emotion: {score.emotionalPull}/25 · CTA: {score.ctaStrength}/25
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .copy-score-panel { display: none !important; }
          .copy-score-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────── Shared Styles ───────── */
function fieldInput(): CSSProperties {
  return {
    width: '100%', fontFamily: 'DM Sans', fontSize: 14, color: '#0f172a',
    padding: '12px 16px', borderRadius: 14, border: '1.5px solid #e2e8f0',
    background: 'rgba(255,255,255,0.85)', outline: 'none', marginBottom: 4,
    transition: 'border-color 0.15s ease',
  };
}

function charCounter(): CSSProperties {
  return { fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', textAlign: 'right' as const, marginBottom: 16 };
}

function outlineBtn(): CSSProperties {
  return {
    fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#475569',
    background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12,
    padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  };
}

function FieldLabel({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12, color: '#475569', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
      <span style={{ color: '#94a3b8' }}>{num} · </span>{label}
    </div>
  );
}

/* ───────── Type-Specific Fields ───────── */
function TypeSpecificFields({ typeId, typeName, inputs, setInputs, currencySymbol }: {
  typeId: string; typeName: string; inputs: Record<string, string>;
  setInputs: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  currencySymbol: string;
}) {
  const set = (key: string, val: string) => setInputs(prev => ({ ...prev, [key]: val }));

  const divider = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>· Specific to {typeName} ·</span>
      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
    </div>
  );

  const textField = (key: string, label: string, placeholder: string, max: number = 100) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 }}>{label}</div>
      <input value={inputs[key] || ''} onChange={e => set(key, e.target.value.slice(0, max))} placeholder={placeholder} style={fieldInput()} />
    </div>
  );

  const numberField = (key: string, label: string) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#64748b' }}>{currencySymbol}</span>
        <input type="number" value={inputs[key] || ''} onChange={e => set(key, e.target.value)} placeholder="e.g. 999" style={{ ...fieldInput(), paddingLeft: 30 }} />
      </div>
    </div>
  );

  const pillSelect = (key: string, label: string, options: string[]) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => set(key, opt)}
            style={{
              fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 50,
              border: inputs[key] === opt ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
              background: inputs[key] === opt ? 'rgba(99,102,241,0.06)' : '#f8fafc',
              color: inputs[key] === opt ? '#6366f1' : '#64748b', cursor: 'pointer',
            }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  if (typeId === 'landing_page') return <>{divider}{textField('leadMagnet', "What's your lead magnet / free offer?", 'e.g. Free 7-Day Email Course')}{textField('immediateAccess', 'What do they get immediately after opting in?', 'e.g. Instant access to PDF + bonus checklist')}</>;
  if (typeId === 'sales_page') return <>{divider}<div style={{ marginBottom: 14 }}><div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 }}>List your bonuses (one per line)</div><textarea value={inputs.bonuses || ''} onChange={e => set('bonuses', e.target.value.slice(0, 300))} placeholder={'Bonus 1: Live Q&A Session\nBonus 2: Templates Pack'} style={{ ...fieldInput(), minHeight: 80, resize: 'vertical' as any }} /></div>{textField('guarantee', "What's your guarantee?", 'e.g. 30-day full refund')}{pillSelect('urgency', 'What creates urgency?', ['⏰ Time Limit', '📦 Limited Spots', '💰 Price Rising', '🎁 Bonus Expiring'])}</>;
  if (typeId === 'order_bump') return <>{divider}{textField('mainProduct', "What's the main product they're buying?", 'e.g. Instagram Growth Masterclass')}{textField('bumpOffer', "What's the bump offer name?", 'e.g. Content Calendar Templates', 80)}{numberField('bumpPrice', 'Bump offer price')}</>;
  if (typeId === 'upsell') return <>{divider}{textField('justPurchased', 'What did they just purchase?', 'e.g. Instagram Growth Masterclass')}{textField('upsellOffer', "What's the upsell offer?", 'e.g. 1-on-1 Strategy Call + VIP Community')}{numberField('upsellPrice', 'Upsell price')}</>;
  if (typeId === 'downsell') return <>{divider}{textField('declinedUpsell', 'What upsell did they just decline?', 'e.g. 1-on-1 Strategy Call + VIP Community')}{textField('strippedVersion', "What's the stripped-down version?", 'e.g. VIP Community Access Only')}{numberField('newPrice', 'New lower price')}</>;
  if (typeId === 'thank_you_page') return <>{divider}{textField('justBought', 'What did they just buy/opt into?', 'e.g. Instagram Growth Masterclass')}{textField('nextStep', "What's their #1 next step?", 'e.g. Check your email for login details')}{textField('communityLink', 'Community or group link (optional)', 't.me/yourgroup or fb.com/groups/...')}</>;
  if (typeId === 'followup_email') return <>{divider}{pillSelect('emailStage', 'What stage is this email for?', ['📥 Post Opt-in', '🛒 Post Purchase'])}<div style={{ marginBottom: 14 }}><div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 }}>How many days after?</div><input type="number" min="1" max="30" value={inputs.daysAfter || ''} onChange={e => set('daysAfter', e.target.value)} placeholder="e.g. 1" style={fieldInput()} /></div>{pillSelect('emailGoal', "What's the main goal of this email?", ['Build trust', 'Deliver value', 'Make offer', 'Re-engage'])}</>;
  return null;
}
