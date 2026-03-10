import { useState, useEffect, useRef, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithRetry } from '@/utils/retryFetch';
import { useSaveItem } from '@/hooks/useSaveItem';

/* ───────── Types ───────── */
interface OfferBrief {
  productName: string;
  audience: string;
  beforeState: string;
  afterState: string;
  priceRange: string;
  platforms: string[];
  currency: 'inr' | 'usd';
}

interface OfferStructure {
  structureId: string;
  structureName: string;
  tagline: string;
  price: string;
  originalPrice: string;
  coreProduct: { name: string; description: string; perceivedValue: string };
  bonuses: { name: string; description: string; perceivedValue: string; relevanceScore: number }[];
  guarantee: { type: string; statement: string; strength: string };
  urgency: { mechanism: string; statement: string; authenticity: string };
  totalPerceivedValue: string;
  valueMultiple: string;
  targetBuyer: string;
  positioningAngle: string;
  strengthScore: number;
  whyThisWorks: string;
}

interface OfferData {
  offerHeadline: string;
  offerSubheadline: string;
  oneLinerPitch: string;
  hook: string;
  valueStack: { item: string; type: string; actualCost: string; perceivedValue: string; description: string }[];
  totalPerceivedValue: string;
  yourPrice: string;
  valueSentence: string;
  pricingPsychology: { anchorPrice: string; anchorReason: string; charmPricing: string; splitOption: string };
  guaranteeScript: string;
  urgencyScript: string;
  callToAction: string;
  offerDescription: string;
  dmScript: string;
  socialCaption?: string;
  emailPitch?: string;
  emailSubject?: string;
  offerScore: {
    total: number;
    valuePriceRatio: number;
    bonusRelevance: number;
    guaranteeStrength: number;
    urgencyMechanism: number;
    positioningClarity: number;
    improvements: string[];
  };
}

type OfferStep = 'brief' | 'generating' | 'structures' | 'building' | 'builder' | 'output';

/* ───────── Helpers ───────── */
const s = (styles: CSSProperties): CSSProperties => styles;

const PRICE_RANGES_INR = [
  { range: '₹199–₹499', type: 'Impulse Buy' },
  { range: '₹499–₹1,999', type: 'Low Ticket' },
  { range: '₹1,999–₹9,999', type: 'Mid Ticket' },
  { range: '₹9,999+', type: 'High Ticket' },
];
const PRICE_RANGES_USD = [
  { range: '$7–$27', type: 'Impulse Buy' },
  { range: '$27–$97', type: 'Low Ticket' },
  { range: '$97–$497', type: 'Mid Ticket' },
  { range: '$497+', type: 'High Ticket' },
];

const PLATFORMS = [
  { emoji: '🌐', name: 'Your Website', subtitle: 'Custom domain, full control', accent: '#0f172a' },
  { emoji: '📱', name: 'Social Media', subtitle: 'Instagram · LinkedIn · Twitter', accent: '#ec4899' },
  { emoji: '🛒', name: 'Marketplace', subtitle: 'Gumroad · Lemon Squeezy · Instamojo', accent: '#f59e0b' },
  { emoji: '💳', name: 'Direct Payment', subtitle: 'Razorpay · UPI · PayPal', accent: '#22c55e' },
  { emoji: '📧', name: 'Email List', subtitle: 'Newsletter · ConvertKit · Mailchimp', accent: '#7c3aed' },
];

const STEP_LABELS = ['Brief', 'Structure', 'Builder', 'Output'];

function getScoreGradient(score: number) {
  if (score >= 90) return 'linear-gradient(135deg,#7c3aed,#a855f7)';
  if (score >= 71) return 'linear-gradient(135deg,#059669,#10b981)';
  if (score >= 41) return 'linear-gradient(135deg,#f59e0b,#ea580c)';
  return 'linear-gradient(135deg,#ef4444,#f97316)';
}
function getScoreLabel(score: number) {
  if (score >= 90) return 'Irresistible ✦';
  if (score >= 71) return 'Strong Offer';
  if (score >= 41) return 'Good Offer';
  return 'Weak Offer';
}

function getStepIndex(step: OfferStep): number {
  switch (step) {
    case 'brief': return 0;
    case 'generating': case 'structures': return 1;
    case 'building': case 'builder': return 2;
    case 'output': return 3;
    default: return 0;
  }
}

/* ───────── Step Progress ───────── */
function StepProgress({ currentStep }: { currentStep: OfferStep }) {
  const activeIdx = getStepIndex(currentStep);
  return (
    <div style={s({ display: 'flex', alignItems: 'center', maxWidth: 500, margin: '0 auto 28px', gap: 0 })}>
      {STEP_LABELS.map((label, i) => {
        const completed = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={label} style={s({ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : undefined })}>
            <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 })}>
              <div style={s({
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: completed ? '#059669' : active ? 'white' : '#94a3b8',
                background: completed ? '#dcfce7' : active ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#f1f5f9',
                boxShadow: active ? '0 0 0 4px rgba(245,158,11,0.2)' : 'none',
              })}>
                {completed ? '✓' : i + 1}
              </div>
              <span style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: completed ? '#059669' : active ? '#f59e0b' : '#94a3b8' })}>{label}</span>
            </div>
            {i < 3 && (
              <div style={s({ flex: 1, height: 2, margin: '0 8px', marginBottom: 18, background: completed ? '#059669' : active ? 'linear-gradient(90deg,#059669,#f1f5f9)' : '#f1f5f9' })} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Loading Screen ───────── */
function OfferLoadingScreen({ type }: { type: 'structures' | 'building' }) {
  const steps = type === 'structures'
    ? ['Analyzing your product + transformation...', 'Researching competitor offers in your niche...', 'Calculating optimal price anchors...', 'Designing 3 offer structures...']
    : ['Finalizing value stack...', 'Writing offer headline...', 'Building positioning script...', 'Calculating offer score...'];
  const emoji = type === 'structures' ? '🎁' : '🔨';
  const title = type === 'structures' ? 'Building your offer architecture...' : 'Crafting your complete offer...';
  const sub = type === 'structures' ? 'Analyzing pricing psychology for your market...' : 'Assembling your irresistible offer package...';

  return (
    <div style={s({ textAlign: 'center', padding: '60px 20px', maxWidth: 500, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
      <div style={s({ fontSize: 56, marginBottom: 16, animation: 'float 2s ease-in-out infinite' })}>{emoji}</div>
      <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginTop: 12 })}>{title}</div>
      <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 8 })}>{sub}</div>
      <div style={s({ marginTop: 28, maxWidth: 360, margin: '28px auto 0' })}>
        {steps.map((step, i) => (
          <div key={i} style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', animation: `fadeUp 0.4s ease ${i * 0.6}s both` })}>
            <div style={s({ width: 16, height: 16, borderRadius: '50%', border: '2px solid #f1f5f9', borderTop: '2px solid #f59e0b', animation: 'spinSlow 0.8s linear infinite', flexShrink: 0 })} />
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569' })}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Collapsible Section ───────── */
function EditorSection({ icon, iconBg, title, defaultOpen, children }: {
  icon: string; iconBg: string; title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', marginBottom: 16, overflow: 'hidden' })}>
      <div onClick={() => setOpen(!open)} style={s({ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' })}>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 10 })}>
          <div style={s({ width: 30, height: 30, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 })}>{icon}</div>
          <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14.5, color: '#0f172a' })}>{title}</span>
        </div>
        <span style={s({ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12, color: '#94a3b8' })}>▼</span>
      </div>
      {open && <div style={s({ padding: '0 20px 20px' })}>{children}</div>}
    </div>
  );
}

/* ───────── Copy Button ───────── */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={s({
      fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: copied ? '#059669' : '#f59e0b',
      background: copied ? '#dcfce7' : 'rgba(245,158,11,0.08)', border: copied ? '1px solid #bbf7d0' : '1px solid rgba(245,158,11,0.2)',
      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
    })}>
      {copied ? '✓ Copied!' : label || '📋 Copy'}
    </button>
  );
}

/* ───────── Main Component ───────── */
export default function OfferCreation({ onBack, prefill, onPrefillConsumed, onBuildFunnel }: { onBack: () => void; prefill?: any; onPrefillConsumed?: () => void; onBuildFunnel?: (data: any) => void }) {
  const { saveItem, isSaved, isSaving } = useSaveItem();
  const [offerStep, setOfferStep] = useState<OfferStep>('brief');
  const [offerBrief, setOfferBrief] = useState<OfferBrief>({ productName: '', audience: '', beforeState: '', afterState: '', priceRange: '', platforms: [], currency: 'inr' });
  const [showPrefillBanner, setShowPrefillBanner] = useState(false);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [autoSelectedPrice, setAutoSelectedPrice] = useState(false);
  const [offerStructures, setOfferStructures] = useState<OfferStructure[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [offerData, setOfferData] = useState<OfferData | null>(null);
  const [offerScore, setOfferScore] = useState(0);
  const [error, setError] = useState('');
  const [outputTab, setOutputTab] = useState<'page' | 'dm' | 'social' | 'email'>('page');
  const platformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefill?.sourceProduct) {
      setOfferBrief(prev => ({
        ...prev,
        productName: prefill.productName || '',
        audience: prefill.audience || '',
        beforeState: prefill.beforeState || '',
        afterState: prefill.afterState || '',
        priceRange: '',
        platforms: [],
      }));

      setPrefilledFields(new Set(['productName', 'audience', 'beforeState', 'afterState']));
      setAutoSelectedPrice(false);
      setShowPrefillBanner(true);

      // Scroll to price range section after a brief delay
      setTimeout(() => {
        platformRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
    }
  }, [prefill]);

  // Fresh start when no prefill
  useEffect(() => {
    if (!prefill) {
      setOfferBrief({ productName: '', audience: '', beforeState: '', afterState: '', priceRange: '', platforms: [], currency: 'inr' });
      setOfferStep('brief');
      setOfferStructures([]);
      setSelectedStructure(null);
      setOfferData(null);
      setOfferScore(0);
      setError('');
      setPrefilledFields(new Set());
      setAutoSelectedPrice(false);
      setShowPrefillBanner(false);
    }
  }, []);

  const priceRanges = offerBrief.currency === 'inr' ? PRICE_RANGES_INR : PRICE_RANGES_USD;

  const briefValid = offerBrief.productName.trim() && offerBrief.audience.trim() && offerBrief.beforeState.trim() && offerBrief.afterState.trim() && offerBrief.priceRange && offerBrief.platforms.length > 0;

  const togglePlatform = (name: string) => {
    setOfferBrief(p => ({
      ...p,
      platforms: p.platforms.includes(name) ? p.platforms.filter(x => x !== name) : p.platforms.length < 2 ? [...p.platforms, name] : p.platforms,
    }));
  };

  /* ── API Call 1: Generate Structures ── */
  const generateOfferStructures = async () => {
    setError('');
    setOfferStep('generating');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('offer-creation', {
        body: { action: 'generate-structures', brief: offerBrief },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setOfferStructures(data.result);
      setOfferStep('structures');
    } catch (err: any) {
      setError(err.message || 'Could not generate structures. Please try again.');
      setOfferStep('brief');
    }
  };

  /* ── API Call 2: Build Full Offer ── */
  const buildFullOffer = async () => {
    setError('');
    setOfferStep('building');
    const chosen = offerStructures?.find(s => s.structureId === selectedStructure);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('offer-creation', {
        body: { action: 'build-offer', brief: offerBrief, chosenStructure: chosen },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setOfferData(data.result);
      setOfferScore(data.result.offerScore?.total || 0);
      setOfferStep('builder');
    } catch (err: any) {
      setError(err.message || 'Could not build offer. Please try again.');
      setOfferStep('structures');
    }
  };

  /* ── Value stack helpers ── */
  const updateValueItem = (idx: number, field: string, value: string) => {
    if (!offerData) return;
    const newStack = [...offerData.valueStack];
    (newStack[idx] as any)[field] = value;
    setOfferData({ ...offerData, valueStack: newStack });
  };
  const removeValueItem = (idx: number) => {
    if (!offerData) return;
    const newStack = offerData.valueStack.filter((_, i) => i !== idx);
    setOfferData({ ...offerData, valueStack: newStack });
  };
  const addBonus = () => {
    if (!offerData) return;
    setOfferData({ ...offerData, valueStack: [...offerData.valueStack, { item: 'New Bonus', type: 'bonus', actualCost: '₹0', perceivedValue: '₹0', description: '' }] });
  };

  const totalPerceivedValue = offerData?.valueStack.reduce((sum, v) => {
    const num = parseInt(v.perceivedValue.replace(/[^\d]/g, '')) || 0;
    return sum + num;
  }, 0) || 0;

  const copyAll = () => {
    if (!offerData) return;
    const text = `${offerData.offerHeadline}\n${offerData.offerSubheadline}\n\n${offerData.oneLinerPitch}\n\n${offerData.offerDescription}\n\nPrice: ${offerData.yourPrice}\n\n${offerData.guaranteeScript}\n\n${offerData.urgencyScript}`;
    navigator.clipboard.writeText(text);
  };

  const resetOffer = () => {
    setOfferStep('brief');
    setOfferBrief({ productName: '', audience: '', beforeState: '', afterState: '', priceRange: '', platforms: [], currency: 'inr' });
    setOfferStructures([]);
    setSelectedStructure(null);
    setOfferData(null);
    setOfferScore(0);
    setError('');
    setPrefilledFields(new Set());
    setAutoSelectedPrice(false);
    setShowPrefillBanner(false);
    onPrefillConsumed?.();
  };

  const clearPrefillField = (field: string) => {
    setPrefilledFields(prev => { const n = new Set(prev); n.delete(field); return n; });
  };

  /* ───────── RENDER ───────── */
  return (
    <div style={s({ animation: 'fadeUp 0.4s ease' })}>
      {/* Page Header */}
      <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 })}>
        <div>
          <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
            <span onClick={onBack} style={s({ cursor: 'pointer', fontWeight: 500 })}>Dashboard</span>
            <span> / </span>
            <span style={s({ fontWeight: 700, color: '#0f172a' })}>Offer Creation</span>
          </div>
          <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 })}>Offer Creation</h1>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 })}>Build an irresistible offer that makes saying YES feel obvious.</p>
        </div>
        {offerScore > 0 && (
          <div title="Score updates as you build. Aim for 80+." style={s({
            background: getScoreGradient(offerScore), borderRadius: 50, padding: '6px 16px',
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'default',
          })}>
            <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: 'white' })}>⚡ {offerScore}/100 Offer Score</span>
          </div>
        )}
      </div>

      {/* Step Progress */}
      <StepProgress currentStep={offerStep} />

      {/* Error */}
      {error && (
        <div style={s({ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#ef4444' })}>{error}</span>
          <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <button onClick={() => { setError(''); if (offerStep === 'brief') generateOfferStructures(); else if (offerStep === 'structures') buildFullOffer(); }} style={s({ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' })}
              onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🔄 Try Again</button>
            <button onClick={() => setError('')} style={s({ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 })}>✕</button>
          </div>
        </div>
      )}

      {/* ═══ STEP 1 — BRIEF ═══ */}
      {offerStep === 'brief' && (
        <div style={s({ maxWidth: 680, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
          <div style={s({ textAlign: 'center', marginBottom: 28 })}>
            <span style={s({ fontSize: 10, fontWeight: 800, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '3px 10px', borderRadius: 50 })}>Step 1 of 4</span>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: '#0f172a', marginTop: 10 })}>Tell us about your product</h2>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 6 })}>5 quick inputs. AI does the rest.</p>
          </div>

          {showPrefillBanner && prefill?.sourceProduct && (
            <div style={s({ background: 'linear-gradient(135deg, rgba(234,88,12,0.07), rgba(245,158,11,0.05))', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start', animation: 'fadeUp 0.4s cubic-bezier(0.34,1.56,0.64,1)' })}>
              <div style={s({ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#ea580c,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                <span style={s({ fontSize: 18 })}>🎁</span>
              </div>
              <div style={s({ flex: 1 })}>
                <div style={s({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 })}>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.08em' })}>From Product Navigator</span>
                  <span style={s({ background: 'rgba(234,88,12,0.1)', color: '#92400e', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 50, padding: '2px 8px', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700 })}>{prefill.sourceNiche} · {prefill.sourceCountry}</span>
                </div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a', lineHeight: 1.4, marginBottom: 8 })}>
                  3 fields pre-filled from "{prefill.sourceProduct}"
                </div>
                <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
                  {['Product Name', 'Target Audience', 'Transformation'].map(f => (
                    <span key={f} style={s({ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 50, padding: '3px 10px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, display: 'inline-flex', gap: 4, alignItems: 'center' })}>✓ {f}</span>
                  ))}
                </div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6 })}>2 things left to fill: your price range and where you'll sell.</div>
              </div>
              <span onClick={() => setShowPrefillBanner(false)} style={s({ fontFamily: 'DM Sans', fontSize: 16, color: '#94a3b8', cursor: 'pointer', alignSelf: 'flex-start' })}>✕</span>
            </div>
          )}
          <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' })}>
            {/* Field 1 */}
            <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#f59e0b' })}>01 · WHAT ARE YOU SELLING?</label>
              {prefilledFields.has('productName') && <span style={s({ background: 'rgba(234,88,12,0.08)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 50, padding: '1px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700 })}>✓ From Product Navigator</span>}
            </div>
            <input value={offerBrief.productName} onChange={e => { setOfferBrief(p => ({ ...p, productName: e.target.value })); clearPrefillField('productName'); }}
              placeholder="e.g. 'LinkedIn Client Acquisition Guide for Indian Freelancers'"
              style={s({ width: '100%', padding: '13px 16px', borderRadius: 12, border: prefilledFields.has('productName') ? '1.5px solid rgba(234,88,12,0.35)' : '1.5px solid #e2e8f0', fontSize: 14.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' })} />
            <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4, marginBottom: 20 })}>Be specific — 'freelancer guide' is weak, 'LinkedIn guide for Indian developers' is strong</p>

            {/* Field 2 */}
            <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#f59e0b' })}>02 · WHO IS THIS FOR?</label>
              {prefilledFields.has('audience') && <span style={s({ background: 'rgba(234,88,12,0.08)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 50, padding: '1px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700 })}>✓ From Product Navigator</span>}
            </div>
            <textarea value={offerBrief.audience} onChange={e => { setOfferBrief(p => ({ ...p, audience: e.target.value.slice(0, 750) })); clearPrefillField('audience'); }}
              placeholder="e.g. 'Mid-level software engineers in India (3-7 years exp) who want to freelance on the side but don't know how to get clients'"
              style={s({ width: '100%', minHeight: 100, padding: '13px 16px', borderRadius: 12, border: prefilledFields.has('audience') ? '1.5px solid rgba(234,88,12,0.35)' : '1.5px solid #e2e8f0', fontSize: 14.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', resize: 'vertical', boxSizing: 'border-box' })} />
            <div style={s({ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 20 })}>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>The more specific, the better your offer will perform</p>
              <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: offerBrief.audience.length > 700 ? '#ef4444' : '#94a3b8' })}>{offerBrief.audience.length}/750</span>
            </div>

            {/* Field 3 — Transformation */}
            <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#f59e0b' })}>03 · WHAT TRANSFORMATION DOES THIS DELIVER?</label>
              {(prefilledFields.has('beforeState') || prefilledFields.has('afterState')) && <span style={s({ background: 'rgba(234,88,12,0.08)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 50, padding: '1px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700 })}>✓ From Product Navigator</span>}
            </div>
            <div style={s({ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 })}>
              <div style={s({ flex: 1 })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: 4 })}>Before 😔</span>
                <textarea value={offerBrief.beforeState} onChange={e => { setOfferBrief(p => ({ ...p, beforeState: e.target.value.slice(0, 400) })); clearPrefillField('beforeState'); }}
                  placeholder="e.g. 'Stuck in a 9-5, no freelance clients'"
                  style={s({ width: '100%', minHeight: 80, padding: '11px 14px', borderRadius: 10, border: prefilledFields.has('beforeState') ? '1.5px solid rgba(234,88,12,0.35)' : '1.5px solid #fecaca', background: '#fee2e2', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' })} />
              </div>
              <div style={s({ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#64748b', flexShrink: 0 })}>→</div>
              <div style={s({ flex: 1 })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#059669', display: 'block', marginBottom: 4 })}>After 🚀</span>
                <textarea value={offerBrief.afterState} onChange={e => { setOfferBrief(p => ({ ...p, afterState: e.target.value.slice(0, 400) })); clearPrefillField('afterState'); }}
                  placeholder="e.g. 'Earning ₹50,000/month from freelance projects'"
                  style={s({ width: '100%', minHeight: 80, padding: '11px 14px', borderRadius: 10, border: prefilledFields.has('afterState') ? '1.5px solid rgba(234,88,12,0.35)' : '1.5px solid #bbf7d0', background: '#f0fdf4', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' })} />
              </div>
            </div>

            {/* Field 4 — Price Range */}
            <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 20 })}>
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#f59e0b' })}>04 · WHAT PRICE RANGE ARE YOU THINKING?</label>
            </div>
            <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 })}>
              {priceRanges.map(pr => (
                <div key={pr.range} onClick={() => { setOfferBrief(p => ({ ...p, priceRange: pr.range })); }}
                  style={s({
                    borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'center',
                    border: offerBrief.priceRange === pr.range ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                    background: offerBrief.priceRange === pr.range ? 'rgba(245,158,11,0.06)' : '#f8fafc',
                    transition: 'all 0.15s',
                  })}>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' })}>{pr.range}</div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', marginTop: 2 })}>{pr.type}</div>
                </div>
              ))}
            </div>
            <span onClick={() => setOfferBrief(p => ({ ...p, currency: p.currency === 'inr' ? 'usd' : 'inr', priceRange: '' }))}
              style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' })}>
              {offerBrief.currency === 'inr' ? 'Selling in USD/GBP instead?' : 'Switch to INR pricing'}
            </span>

            {/* Field 5 — Platform */}
            <style>{`@keyframes highlightPulse { 0%,100%{border-color:#e2e8f0} 50%{border-color:rgba(234,88,12,0.5)} }`}</style>
            <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#f59e0b', display: 'block', marginBottom: 8, marginTop: 20 })}>05 · WHERE WILL YOU SELL THIS?</label>
            <div ref={platformRef} style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, ...(prefill?.sourceProduct ? { animation: 'highlightPulse 0.6s ease 0.5s 2' } : {}) })}>
              {PLATFORMS.map(p => {
                const selected = offerBrief.platforms.includes(p.name);
                return (
                  <div key={p.name} onClick={() => togglePlatform(p.name)}
                    style={s({
                      borderRadius: 10, padding: '12px 10px', cursor: 'pointer', textAlign: 'center',
                      border: selected ? `2px solid ${p.accent}` : '2px solid #e2e8f0',
                      background: selected ? `${p.accent}0f` : '#f8fafc',
                      boxShadow: selected ? `0 0 0 3px ${p.accent}15` : 'none',
                      transition: 'all 0.15s',
                    })}>
                    <div style={s({ fontSize: 24, marginBottom: 8, display: 'block' })}>{p.emoji}</div>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#0f172a' })}>{p.name}</div>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 })}>{p.subtitle}</div>
                  </div>
                );
              })}
            </div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 6 })}>Choose up to 2 platforms where you'll sell this offer</div>

            {/* Generate Button */}
            <div style={s({ marginTop: 28, borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
              <span style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: briefValid ? '#059669' : '#f59e0b' })}>
                {briefValid ? '✓ Ready to build your offer structure' : 'Fill all fields to continue'}
              </span>
              <button onClick={generateOfferStructures} disabled={!briefValid}
                style={s({
                  background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', border: 'none',
                  borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15,
                  cursor: briefValid ? 'pointer' : 'default', opacity: briefValid ? 1 : 0.45,
                  boxShadow: '0 4px 20px rgba(245,158,11,0.4)', transition: 'all 0.2s',
                })}>
                🎁 Generate Offer Structures →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOADING — GENERATING ═══ */}
      {offerStep === 'generating' && <OfferLoadingScreen type="structures" />}

      {/* ═══ STEP 2 — CHOOSE STRUCTURE ═══ */}
      {offerStep === 'structures' && (
        <div style={s({ maxWidth: 900, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 })}>
            <div>
              <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 24, color: '#0f172a' })}>Choose Your Offer Structure</h2>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 4 })}>AI has designed 3 offer architectures for your product. Pick one to build on.</p>
            </div>
            <span onClick={() => setOfferStep('brief')} style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' })}>← Edit Brief</span>
          </div>

          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 })}>
            {offerStructures.map((struct) => {
              const isB = struct.structureId === 'B';
              const isSelected = selectedStructure === struct.structureId;
              const gradColor = struct.structureId === 'A' ? 'linear-gradient(135deg,#64748b,#94a3b8)' : isB ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#7c3aed,#a855f7)';
              const priceColor = struct.structureId === 'A' ? '#64748b' : isB ? '#f59e0b' : '#7c3aed';

              return (
                <div key={struct.structureId} onClick={() => setSelectedStructure(struct.structureId)}
                  style={s({
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderRadius: 22, overflow: 'hidden', cursor: 'pointer',
                    border: isSelected ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                    boxShadow: isSelected ? '0 0 0 4px rgba(245,158,11,0.15)' : 'none',
                    transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'flex', flexDirection: 'column', position: 'relative',
                  })}>
                  {isB && <div style={s({ height: 4, background: 'linear-gradient(135deg,#f59e0b,#ef4444)' })} />}

                  <div style={s({ padding: '20px 20px 0' })}>
                    <div style={s({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 })}>
                      <div style={s({ width: 28, height: 28, borderRadius: '50%', background: gradColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: 'white' })}>{struct.structureId}</div>
                      <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', flex: 1 })}>{struct.structureName}</span>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: priceColor, background: `${priceColor}12`, padding: '2px 8px', borderRadius: 50 })}>{struct.strengthScore}/100</span>
                    </div>
                    {isB && <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 9, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: 50, marginBottom: 8, display: 'inline-block' })}>⭐ Best Value</span>}
                  </div>

                  {/* Price */}
                  <div style={s({ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 })}>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 500, fontSize: 16, color: '#94a3b8', textDecoration: 'line-through' })}>{struct.originalPrice}</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: priceColor })}>{struct.price}</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#92400e', padding: '3px 8px', borderRadius: 50 })}>🔥 {struct.valueMultiple} value</span>
                  </div>

                  {/* Core */}
                  <div style={s({ padding: '14px 20px' })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 })}>📦 Core Product</div>
                    <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13.5, color: '#0f172a' })}>{struct.coreProduct.name}</div>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', lineHeight: 1.6, marginTop: 2 })}>{struct.coreProduct.description}</div>
                  </div>

                  {/* Bonuses */}
                  <div style={s({ padding: '0 20px 14px' })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 })}>🎁 Bonuses</div>
                    {struct.bonuses.slice(0, 3).map((b, i) => (
                      <div key={i} style={s({ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' })}>
                        <div style={s({ width: 12, height: 12, borderRadius: '50%', background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0, marginTop: 2 })}>✓</div>
                        <span style={s({ fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 600, color: '#0f172a', flex: 1 })}>{b.name}</span>
                        <span style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#059669' })}>{b.perceivedValue}</span>
                      </div>
                    ))}
                  </div>

                  {/* Guarantee */}
                  <div style={s({ padding: '10px 20px', background: '#f0fdf4', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center' })}>
                    <span>🛡</span>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#15803d' })}>{struct.guarantee.type}</span>
                  </div>

                  {/* Total */}
                  <div style={s({ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' })}>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>Total Value:</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#059669' })}>{struct.totalPerceivedValue}</span>
                  </div>

                  {/* Select */}
                  <div style={s({ padding: '16px 20px', marginTop: 'auto' })}>
                    <button style={s({
                      width: '100%', borderRadius: 12, border: isSelected ? 'none' : '1px solid #e2e8f0', padding: '12px 0',
                      fontFamily: 'Sora', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      background: isSelected ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#f8fafc',
                      color: isSelected ? 'white' : '#64748b',
                      boxShadow: isSelected ? '0 4px 14px rgba(245,158,11,0.35)' : 'none',
                      transition: 'all 0.2s',
                    })}>
                      {isSelected ? '✓ Selected' : 'Select This Structure'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Proceed */}
          <div style={s({ textAlign: 'center', marginTop: 24 })}>
            <button onClick={buildFullOffer} disabled={!selectedStructure}
              style={s({
                background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', border: 'none',
                borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15,
                cursor: selectedStructure ? 'pointer' : 'default', opacity: selectedStructure ? 1 : 0.45,
                boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
              })}>
              🎁 Build My Offer →
            </button>
          </div>
        </div>
      )}

      {/* ═══ LOADING — BUILDING ═══ */}
      {offerStep === 'building' && <OfferLoadingScreen type="building" />}

      {/* ═══ STEP 3 — INTERACTIVE BUILDER ═══ */}
      {offerStep === 'builder' && offerData && (
        <div style={s({ display: 'flex', gap: 20, alignItems: 'flex-start' })}>
          {/* Left — Editor */}
          <div style={s({ flex: 1, minWidth: 0 })}>
            {/* Section 1 — Headline */}
            <EditorSection icon="✍️" iconBg="#fff7ed" title="Headline & Hook" defaultOpen>
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>OFFER HEADLINE</label>
              <textarea value={offerData.offerHeadline} onChange={e => setOfferData({ ...offerData, offerHeadline: e.target.value.slice(0, 120) })}
                style={s({ width: '100%', minHeight: 70, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', resize: 'vertical', boxSizing: 'border-box' })} />
              <div style={s({ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 12 })}>{offerData.offerHeadline.length}/120</div>

              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>SUB-HEADLINE</label>
              <input value={offerData.offerSubheadline} onChange={e => setOfferData({ ...offerData, offerSubheadline: e.target.value })}
                style={s({ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', marginBottom: 12 })} />

              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>ONE-LINER PITCH</label>
              <textarea value={offerData.oneLinerPitch} onChange={e => setOfferData({ ...offerData, oneLinerPitch: e.target.value })}
                style={s({ width: '100%', minHeight: 60, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', resize: 'vertical', boxSizing: 'border-box' })} />
              <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4 })}>Use this in DMs, bio, and social posts</p>
            </EditorSection>

            {/* Section 2 — Value Stack */}
            <EditorSection icon="📦" iconBg="#f0fdf4" title="Value Stack" defaultOpen>
              <div style={s({ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 12 })}>
                <div style={s({ display: 'grid', gridTemplateColumns: '1fr 80px 100px 50px', padding: '8px 14px', background: '#f8fafc', gap: 8, fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#94a3b8' })}>
                  <span>Item</span><span>Type</span><span>Value</span><span></span>
                </div>
                {offerData.valueStack.map((v, i) => (
                  <div key={i} style={s({ display: 'grid', gridTemplateColumns: '1fr 80px 100px 50px', padding: '10px 14px', borderTop: '1px solid #f1f5f9', gap: 8, alignItems: 'center' })}>
                    <input value={v.item} onChange={e => updateValueItem(i, 'item', e.target.value)}
                      style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', border: 'none', background: 'transparent', outline: 'none', width: '100%' })} />
                    <span style={s({
                      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 20,
                      color: v.type === 'core' ? '#ea580c' : v.type === 'bonus' ? '#059669' : '#0891b2',
                      background: v.type === 'core' ? '#fff7ed' : v.type === 'bonus' ? '#f0fdf4' : '#f0f9ff',
                    })}>{v.type}</span>
                    <input value={v.perceivedValue} onChange={e => updateValueItem(i, 'perceivedValue', e.target.value)}
                      style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#059669', border: 'none', background: 'transparent', outline: 'none', width: '100%' })} />
                    {v.type === 'bonus' && (
                      <span onClick={() => removeValueItem(i)} style={s({ cursor: 'pointer', fontSize: 14, color: '#94a3b8' })}>🗑</span>
                    )}
                  </div>
                ))}
              </div>
              <div onClick={addBonus} style={s({ border: '2px dashed #e2e8f0', borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginBottom: 12 })}>+ Add Bonus</div>

              <div style={s({ background: 'rgba(5,150,105,0.06)', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 })}>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#059669' })}>Total Perceived Value</span>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#059669' })}>₹{totalPerceivedValue.toLocaleString()}</span>
              </div>

              <div style={s({ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px' })}>
                <textarea value={offerData.valueSentence} onChange={e => setOfferData({ ...offerData, valueSentence: e.target.value })}
                  style={s({ width: '100%', border: 'none', background: 'transparent', fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', outline: 'none', resize: 'none', boxSizing: 'border-box' })} />
                <p style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', marginTop: 4 })}>Use this exact sentence on your offer page</p>
              </div>
            </EditorSection>

            {/* Section 3 — Pricing */}
            <EditorSection icon="💰" iconBg="#fef9c3" title="Pricing Strategy">
              <div style={s({ display: 'flex', gap: 12, marginBottom: 14 })}>
                <div style={s({ flex: 1 })}>
                  <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>CROSSED-OUT PRICE (ANCHOR)</label>
                  <input value={offerData.pricingPsychology.anchorPrice} onChange={e => setOfferData({ ...offerData, pricingPsychology: { ...offerData.pricingPsychology, anchorPrice: e.target.value } })}
                    style={s({ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' })} />
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4 })}>{offerData.pricingPsychology.anchorReason}</p>
                </div>
                <div style={s({ flex: 1 })}>
                  <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>YOUR PRICE</label>
                  <input value={offerData.yourPrice} onChange={e => setOfferData({ ...offerData, yourPrice: e.target.value })}
                    style={s({ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' })} />
                </div>
              </div>
              <div style={s({ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#92400e' })}>💡 {offerData.pricingPsychology.charmPricing}</span>
              </div>
            </EditorSection>

            {/* Section 4 — Guarantee */}
            <EditorSection icon="🛡" iconBg="#f0f9ff" title="Guarantee">
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>GUARANTEE STATEMENT</label>
              <textarea value={offerData.guaranteeScript} onChange={e => setOfferData({ ...offerData, guaranteeScript: e.target.value })}
                style={s({ width: '100%', minHeight: 90, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', resize: 'vertical', boxSizing: 'border-box' })} />
            </EditorSection>

            {/* Section 5 — Urgency */}
            <EditorSection icon="⏰" iconBg="#fee2e2" title="Urgency & Scarcity">
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>URGENCY STATEMENT</label>
              <textarea value={offerData.urgencyScript} onChange={e => setOfferData({ ...offerData, urgencyScript: e.target.value })}
                style={s({ width: '100%', minHeight: 70, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', resize: 'vertical', boxSizing: 'border-box' })} />
            </EditorSection>

            {/* Section 6 — CTA */}
            <EditorSection icon="🚀" iconBg="linear-gradient(135deg,#f59e0b,#ef4444)" title="Call to Action">
              <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 })}>CTA BUTTON TEXT</label>
              <input value={offerData.callToAction} onChange={e => setOfferData({ ...offerData, callToAction: e.target.value })}
                placeholder="e.g. 'Yes! I Want The Complete System →'"
                style={s({ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, fontFamily: 'DM Sans', color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', marginBottom: 16 })} />
              <div style={s({ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', borderRadius: 14, padding: 16, textAlign: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 20px rgba(245,158,11,0.35)' })}>
                {offerData.callToAction || 'Your CTA Here'}
              </div>
            </EditorSection>

            {/* Proceed to output */}
            <button onClick={() => setOfferStep('output')}
              style={s({ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', border: 'none', borderRadius: 14, padding: '14px 0', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.4)', marginTop: 8 })}>
              📋 See Complete Offer Output →
            </button>
          </div>

          {/* Right — Score + Preview (sticky) */}
          <div style={s({ width: 320, flexShrink: 0, position: 'sticky', top: 24 })}>
            {/* Score Card */}
            <div style={s({ background: getScoreGradient(offerScore), borderRadius: 20, padding: 20, color: 'white', marginBottom: 16 })}>
              <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, opacity: 0.8 })}>⚡ Offer Score</span>
                <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 42 })}>{offerScore}</span>
              </div>
              {[
                { label: 'Value-Price Ratio', val: offerData.offerScore.valuePriceRatio },
                { label: 'Bonus Relevance', val: offerData.offerScore.bonusRelevance },
                { label: 'Guarantee Strength', val: offerData.offerScore.guaranteeStrength },
                { label: 'Urgency', val: offerData.offerScore.urgencyMechanism },
                { label: 'Positioning', val: offerData.offerScore.positioningClarity },
              ].map(d => (
                <div key={d.label} style={s({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 })}>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 10, opacity: 0.8, width: 120 })}>{d.label}</span>
                  <div style={s({ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 50 })}>
                    <div style={s({ width: `${(d.val / 20) * 100}%`, height: '100%', background: 'white', borderRadius: 50, transition: 'width 0.3s' })} />
                  </div>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, width: 30, textAlign: 'right' })}>{d.val}/20</span>
                </div>
              ))}
              {offerData.offerScore.improvements.length > 0 && (
                <>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 10, opacity: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 })}>How to reach 90+:</div>
                  {offerData.offerScore.improvements.map((imp, i) => (
                    <div key={i} style={s({ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 10px', fontFamily: 'DM Sans', fontSize: 11, marginBottom: 4 })}>{imp}</div>
                  ))}
                </>
              )}
            </div>

            {/* Mini Preview */}
            <div style={s({ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.95)' })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 })}>📋 Offer Preview</div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.4, marginBottom: 8 })}>{offerData.offerHeadline}</div>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 6 })}>
                <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#f59e0b' })}>{offerData.yourPrice}</span>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 500, fontSize: 14, color: '#94a3b8', textDecoration: 'line-through' })}>{offerData.pricingPsychology.anchorPrice}</span>
              </div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#059669', marginTop: 4 })}>🎁 + {offerData.valueStack.filter(v => v.type === 'bonus').length} bonuses included</div>
              <div onClick={() => setOfferStep('output')} style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#f59e0b', cursor: 'pointer', marginTop: 12, textAlign: 'right' })}>View Full Output →</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 4 — OUTPUT ═══ */}
      {offerStep === 'output' && offerData && (
        <div style={s({ maxWidth: 800, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
          {/* Output Header */}
          <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 })}>
            <div>
              <span onClick={() => setOfferStep('builder')} style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' })}>← Back to Builder</span>
              <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 24, color: '#0f172a', marginTop: 4 })}>Your Complete Offer</h2>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b' })}>Everything ready to copy, paste, and launch</p>
            </div>
            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <button onClick={() => saveItem({ tool: 'offer_creation', item_type: 'offer_output', title: offerData.offerHeadline, summary: offerData.oneLinerPitch, full_data: { brief: offerBrief, offer: offerData } })}
                style={s({ background: isSaved('offer_creation', 'offer_output', offerData.offerHeadline) ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'none', border: isSaved('offer_creation', 'offer_output', offerData.offerHeadline) ? 'none' : '1px solid #e2e8f0', borderRadius: 50, padding: '6px 14px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: isSaved('offer_creation', 'offer_output', offerData.offerHeadline) ? 'white' : '#64748b', cursor: 'pointer', opacity: isSaving('offer_creation', 'offer_output', offerData.offerHeadline) ? 0.5 : 1, transition: 'all 0.2s' })}>
                {isSaved('offer_creation', 'offer_output', offerData.offerHeadline) ? '🔖 Saved' : '🔖 Save Offer'}
              </button>
              <div style={s({ background: getScoreGradient(offerScore), borderRadius: 50, padding: '6px 14px' })}>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: 'white' })}>⚡ {offerScore}/100</span>
              </div>
              <CopyButton text={`${offerData.offerHeadline}\n${offerData.offerSubheadline}\n\n${offerData.offerDescription}\n\nPrice: ${offerData.yourPrice}`} label="📋 Copy All" />
            </div>
          </div>

          {/* Offer Summary Hero Card */}
          <div style={s({ borderRadius: 24, overflow: 'hidden', marginBottom: 20, boxShadow: '0 8px 40px rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' })}>
            <div style={s({ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', padding: 28 })}>
              <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 'clamp(20px,3vw,28px)', color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 })}>{offerData.offerHeadline}</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 8 })}>{offerData.offerSubheadline}</div>
              <div style={s({ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 })}>
                <span style={s({ fontFamily: 'Sora', fontWeight: 600, fontSize: 20, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' })}>{offerData.pricingPsychology.anchorPrice}</span>
                <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 40, color: 'white' })}>{offerData.yourPrice}</span>
              </div>
            </div>
            <div style={s({ padding: 24, background: 'white' })}>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 15, color: '#334155', lineHeight: 1.7, borderLeft: '4px solid #f59e0b', paddingLeft: 16, marginBottom: 20, fontStyle: 'italic' })}>{offerData.oneLinerPitch}</div>

              {offerData.valueStack.map((v, i) => (
                <div key={i} style={s({ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc' })}>
                  <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: '#0f172a' })}>{v.type === 'core' ? '📦' : v.type === 'bonus' ? '🎁' : '🛡'} {v.item}</span>
                  <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#059669' })}>{v.perceivedValue}</span>
                </div>
              ))}
              <div style={s({ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', marginTop: 8 })}>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 800, fontSize: 14, color: '#059669' })}>Total Value</span>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#059669' })}>₹{totalPerceivedValue.toLocaleString()}</span>
              </div>

              <div style={s({ display: 'flex', gap: 12, marginTop: 16 })}>
                <div style={s({ flex: 1, background: '#f0f9ff', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' })}>
                  <span>🛡</span>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#0891b2' })}>Guarantee Included</span>
                </div>
                <div style={s({ flex: 1, background: '#fff7ed', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' })}>
                  <span>⏰</span>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#ea580c' })}>Limited Time</span>
                </div>
              </div>

              <div style={s({ marginTop: 20, textAlign: 'center' })}>
                <div style={s({ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', borderRadius: 14, padding: 16, fontFamily: 'Sora', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 20px rgba(245,158,11,0.35)' })}>{offerData.callToAction}</div>
              </div>
            </div>
          </div>

          {/* Copy-Ready Assets — Tabs */}
          <div style={s({ marginBottom: 20 })}>
            <div style={s({ display: 'flex', gap: 4, marginBottom: 16 })}>
              {([['page', '📝 Offer Page'], ['dm', '💬 DM Script'], ['social', '📱 Social Caption'], ['email', '📧 Email Pitch']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setOutputTab(key)}
                  style={s({
                    fontFamily: 'DM Sans', fontWeight: outputTab === key ? 700 : 500, fontSize: 13, padding: '8px 16px',
                    border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                    background: outputTab === key ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: outputTab === key ? '#0f172a' : '#94a3b8',
                    borderBottom: outputTab === key ? '2px solid #f59e0b' : '2px solid transparent',
                  })}>
                  {label}
                </button>
              ))}
            </div>

            <div style={s({ background: '#f8fafc', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' })}>
              <div style={s({ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 })}>
                <CopyButton text={
                  outputTab === 'page' ? (offerData.offerDescription || '') :
                  outputTab === 'dm' ? (offerData.dmScript || '') :
                  outputTab === 'social' ? (offerData.socialCaption || `${offerData.offerHeadline}\n\n${offerData.oneLinerPitch}\n\nPrice: ${offerData.yourPrice}`) :
                  (offerData.emailPitch || offerData.offerDescription || '')
                } />
              </div>

              {outputTab === 'page' && (
                <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' })}>{offerData.offerDescription}</div>
              )}

              {outputTab === 'dm' && (
                <div>
                  {(offerData.dmScript || '').split(/Message \d+:|message \d+:/i).filter(Boolean).map((msg, i) => (
                    <div key={i} style={s({ marginBottom: 10 })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4, display: 'block' })}>Message {i + 1}:</span>
                      <div style={s({ background: 'white', borderRadius: '18px 18px 18px 4px', padding: '14px 16px', maxWidth: '85%', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: 'DM Sans', fontSize: 13.5, color: '#0f172a', lineHeight: 1.6 })}>{msg.trim()}</div>
                    </div>
                  ))}
                </div>
              )}

              {outputTab === 'social' && (
                <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' })}>
                  {offerData.socialCaption || `${offerData.offerHeadline}\n\n${offerData.oneLinerPitch}\n\n${offerData.valueSentence}\n\n${offerData.callToAction}\n\n#digitalproducts #creator #offer`}
                </div>
              )}

              {outputTab === 'email' && (
                <div>
                  <div style={s({ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 })}>
                    <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: '#92400e' })}>Subject: {offerData.emailSubject || offerData.offerHeadline}</span>
                  </div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' })}>
                    {offerData.emailPitch || offerData.offerDescription}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.95)', marginBottom: 24 })}>
            <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 16 })}>Offer Score Breakdown</h3>
            {[
              { icon: '📊', label: 'Value-Price Ratio', val: offerData.offerScore.valuePriceRatio, color: '#f59e0b' },
              { icon: '🎁', label: 'Bonus Relevance', val: offerData.offerScore.bonusRelevance, color: '#059669' },
              { icon: '🛡', label: 'Guarantee Strength', val: offerData.offerScore.guaranteeStrength, color: '#0891b2' },
              { icon: '⏰', label: 'Urgency Mechanism', val: offerData.offerScore.urgencyMechanism, color: '#ef4444' },
              { icon: '🎯', label: 'Positioning Clarity', val: offerData.offerScore.positioningClarity, color: '#7c3aed' },
            ].map(d => (
              <div key={d.label} style={s({ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' })}>
                <span style={s({ fontSize: 16, width: 24 })}>{d.icon}</span>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', width: 160 })}>{d.label}</span>
                <div style={s({ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 50 })}>
                  <div style={s({ width: `${(d.val / 20) * 100}%`, height: '100%', background: d.color, borderRadius: 50, transition: 'width 0.3s' })} />
                </div>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: d.color, width: 40, textAlign: 'right' })}>{d.val}/20</span>
              </div>
            ))}
          </div>

          {/* Next Steps Footer */}
          <div style={s({ background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(168,85,247,0.04))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 })}>
            <div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a' })}>🚀 Offer Complete! What's next?</div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 })}>Take your offer to the next module and build your sales funnel.</div>
            </div>
            <div style={s({ display: 'flex', gap: 10, flexWrap: 'wrap' })}>
              <button onClick={resetOffer} style={s({ border: '1px solid #e2e8f0', background: 'white', color: '#64748b', borderRadius: 12, padding: '10px 20px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer' })}>🔄 Build New Offer</button>
              <button onClick={() => {
                if (onBuildFunnel) {
                  const prefillData = {
                    productName: offerBrief.productName,
                    offerDescription: offerData?.oneLinerPitch || offerData?.offerHeadline || offerBrief.productName,
                    targetBuyer: offerBrief.audience,
                    priceRange: offerBrief.priceRange,
                    sourceProduct: offerBrief.productName,
                  };
                  onBuildFunnel(prefillData);
                }
              }} style={s({
                background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none',
                borderRadius: 14, padding: '14px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15,
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', display: 'flex', alignItems: 'center', gap: 8,
              })}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(6,182,212,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(6,182,212,0.35)'; }}>
                🔀 Build a Funnel for This Offer →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
