import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

interface ResearchReport {
  marketOverview: any;
  searchDemand: any;
  painPoints: any[];
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

/* ───────── Helpers ───────── */
const s = (styles: CSSProperties): CSSProperties => styles;

/* ───────── Loading Screen ───────── */
function LoadingScreen({ type, data }: { type: 'ideas' | 'report'; data: any }) {
  const steps = type === 'ideas'
    ? [
        `Scanning ${data.country} market trends...`,
        `Identifying high-demand niches in ${data.niche}...`,
        `Analyzing buyer pain points and psychology...`,
        `Generating 30 tailored product ideas...`,
      ]
    : [
        `Searching ${data.country} market for ${data.searchKeyword}...`,
        `Analyzing buyer psychology and pain points...`,
        `Mapping desires, fears, and purchase triggers...`,
        `Building your full research report...`,
      ];

  return (
    <div style={s({ textAlign: 'center', padding: '60px 20px', maxWidth: 500, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
      <div style={s({ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' })}>
        <div style={s({ width: 80, height: 80, border: '3px solid #f1f5f9', borderTop: '3px solid #ea580c', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' })} />
        <div style={s({ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 })}>
          {type === 'ideas' ? '🤖' : '🔬'}
        </div>
      </div>
      <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 })}>
        {type === 'ideas' ? 'Researching your market...' : `Researching ${data.productName}...`}
      </div>
      <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' })}>
        {type === 'ideas'
          ? `Our AI is analyzing ${data.country} market data, buyer psychology, and product opportunities for ${data.niche}.`
          : `Pulling real market data, search trends & buyer psychology for ${data.country}...`}
      </div>
      <div style={s({ marginTop: 28, maxWidth: 360, margin: '28px auto 0' })}>
        {steps.map((step, i) => (
          <div key={i} style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', animation: `fadeUp 0.4s ease ${i * 0.6}s both` })}>
            <div style={s({ width: 16, height: 16, borderRadius: '50%', border: '2px solid #f1f5f9', borderTop: '2px solid #ea580c', animation: 'spinSlow 0.8s linear infinite', flexShrink: 0 })} />
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569' })}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Report Section ───────── */
function ReportSection({ icon, iconBg, iconColor, title, subtitle, defaultOpen, children, glowing }: {
  icon: string; iconBg: string; iconColor: string; title: string; subtitle: string;
  defaultOpen?: boolean; children: React.ReactNode; glowing?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={s({
      background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20,
      border: glowing ? '1px solid rgba(234,88,12,0.25)' : '1px solid rgba(255,255,255,0.95)',
      boxShadow: glowing ? '0 4px 20px rgba(234,88,12,0.08)' : '0 4px 16px rgba(0,0,0,0.05)',
      marginBottom: 16, overflow: 'hidden',
    })}>
      <div onClick={() => setOpen(!open)} style={s({ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' })}>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <div style={s({ width: 30, height: 30, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 })}>{icon}</div>
          <div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14.5, color: '#0f172a' })}>{title}</div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' })}>{subtitle}</div>
          </div>
        </div>
        <span style={s({ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12, color: '#94a3b8' })}>▼</span>
      </div>
      {open && <div style={s({ padding: '0 20px 20px' })}>{children}</div>}
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function AIResearchEngine() {
  const [aiStep, setAiStep] = useState<'input' | 'loading-ideas' | 'results' | 'loading-report' | 'report'>('input');
  const [inputData, setInputData] = useState({ niche: '', country: '', productType: '' });
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductIdea | null>(null);
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('demand');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const allFilled = inputData.niche && inputData.country && inputData.productType;

  /* ───── API Calls ───── */
  const generateIdeas = async () => {
    setError('');
    setAiStep('loading-ideas');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-product-research', {
        body: { action: 'generate-ideas', niche: inputData.niche, country: inputData.country, productType: inputData.productType },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setProductIdeas(data.result);
      setAiStep('results');
    } catch (err: any) {
      setError(err.message || 'Could not generate ideas. Please try again.');
      setAiStep('input');
    }
  };

  const generateReport = async (product: ProductIdea) => {
    setError('');
    setSelectedProduct(product);
    setAiStep('loading-report');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-product-research', {
        body: { action: 'deep-research', product, inputData },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResearchReport(data.result);
      setAiStep('report');
    } catch (err: any) {
      setError(err.message || 'Could not generate report. Please try again.');
      setAiStep('results');
    }
  };

  /* ───── Filter & Sort ───── */
  const filteredIdeas = productIdeas.filter(idea => {
    if (filter === 'All') return true;
    if (filter === 'high-impulse') return idea.impulseScore === 'High';
    if (filter === 'low-comp') return idea.competitionLevel === 'Low';
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
    return 0;
  });

  /* ═══════════════════ STEP 1: INPUT FORM ═══════════════════ */
  if (aiStep === 'input') {
    return (
      <div style={s({ maxWidth: 680, margin: '0 auto', animation: 'fadeUp 0.4s ease' })}>
        {/* Hero */}
        <div style={s({ textAlign: 'center', marginBottom: 32 })}>
          <div style={s({ display: 'inline-flex', gap: 6, alignItems: 'center', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 50, padding: '5px 16px', marginBottom: 12 })}>
            <span>🤖</span>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.08em' })}>AI-Powered Research</span>
          </div>
          <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 'clamp(22px, 4vw, 32px)', color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 8 })}>Find Your Perfect Product Idea</h2>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' })}>
            Tell us 3 things. Our AI does the research — real market data, real pain points, real opportunities.
          </p>
        </div>

        {error && (
          <div style={s({ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' })}>{error}</span>
            <button onClick={() => setError('')} style={s({ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 })}>✕</button>
          </div>
        )}

        {/* Form Card */}
        <div style={s({ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.07)', animation: 'fadeUp 0.4s ease 0.08s both' })}>

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
            <div style={s({ position: 'relative' })}>
              <div onClick={() => setCountryOpen(!countryOpen)}
                style={s({ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14.5, fontFamily: 'DM Sans', color: inputData.country ? '#0f172a' : '#94a3b8', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' })}>
                <span>{inputData.country ? `${COUNTRIES.find(c => c.name === inputData.country)?.flag} ${inputData.country}` : 'Select your target market'}</span>
                <span style={s({ transform: countryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12, color: '#94a3b8' })}>▼</span>
              </div>
              {countryOpen && (
                <>
                  <div onClick={() => setCountryOpen(false)} style={s({ position: 'fixed', inset: 0, zIndex: 99 })} />
                  <div style={s({ position: 'absolute', width: '100%', background: 'white', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, marginTop: 4, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' })}>
                    {COUNTRIES.map(c => (
                      <div key={c.name} onClick={() => { setInputData(p => ({ ...p, country: c.name })); setCountryOpen(false); }}
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
            </div>
            {inputData.country && (
              <div style={s({ display: 'inline-flex', gap: 6, alignItems: 'center', background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 8, padding: '6px 14px', marginTop: 8 })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 600, color: '#059669' })}>✓ Using {inputData.country} market data, pricing, and buyer psychology</span>
              </div>
            )}
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
      </div>
    );
  }

  /* ═══════════════════ LOADING IDEAS ═══════════════════ */
  if (aiStep === 'loading-ideas') {
    return <LoadingScreen type="ideas" data={inputData} />;
  }

  /* ═══════════════════ LOADING REPORT ═══════════════════ */
  if (aiStep === 'loading-report') {
    return (
      <div style={s({ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
        <div>
          <LoadingScreen type="report" data={{ ...inputData, productName: selectedProduct?.productName, searchKeyword: selectedProduct?.searchKeyword }} />
          <div style={s({ textAlign: 'center', marginTop: 24 })}>
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
              <span onClick={() => { setAiStep('input'); setProductIdeas([]); }} style={s({ cursor: 'pointer' })}>AI Research</span> → <span style={s({ fontWeight: 700, color: '#0f172a' })}>Results</span>
            </div>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 })}>
              30 Product Ideas for <span style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as any)}>{inputData.niche}</span>
            </h2>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 3 })}>{inputData.productType} products for {inputData.country} market · Click any idea for deep research →</p>
          </div>
          <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <button onClick={() => { setAiStep('input'); setProductIdeas([]); }} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 50, padding: '5px 14px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' })}>← New Search</button>
          </div>
        </div>

        {error && (
          <div style={s({ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16 })}>
            <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' })}>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div style={s({ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' })}>
          {[{ key: 'All', label: 'All' }, { key: 'high-impulse', label: '🔥 High Impulse' }, { key: 'low-comp', label: '🟢 Low Competition' }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={s({ padding: '5px 14px', borderRadius: 50, border: 'none', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: filter === f.key ? '#ea580c' : '#f1f5f9', color: filter === f.key ? 'white' : '#64748b', transition: 'all 0.15s' })}>
              {f.label}
            </button>
          ))}
          <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginLeft: 8 })}>Sort by:</span>
          {[{ key: 'demand', label: 'Demand ↓' }, { key: 'competition', label: 'Competition ↑' }, { key: 'impulse', label: 'Impulse ↓' }].map(so => (
            <button key={so.key} onClick={() => setSortBy(so.key)}
              style={s({ padding: '4px 10px', borderRadius: 50, border: 'none', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: sortBy === so.key ? '#ea580c' : '#f1f5f9', color: sortBy === so.key ? 'white' : '#64748b' })}>
              {so.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 })}>
          {sortedIdeas.map((idea, i) => (
            <div key={i} onClick={() => generateReport(idea)}
              style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)', animation: `fadeUp 0.4s ease ${i * 0.04}s both` })}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(234,88,12,0.12)'; e.currentTarget.style.borderColor = 'rgba(234,88,12,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.95)'; }}>
              {/* Top accent bar */}
              <div style={s({ height: 4, background: 'linear-gradient(90deg,#ea580c,#f59e0b)', width: `${(idea.demandScore / 10) * 100}%` })} />
              <div style={s({ padding: '16px 18px 18px' })}>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 })}>
                  <div style={s({ width: 22, height: 22, borderRadius: '50%', background: 'rgba(234,88,12,0.1)', color: '#ea580c', fontFamily: 'Sora', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>#{i + 1}</div>
                  <span style={s({ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: idea.impulseScore === 'High' ? '#dcfce7' : idea.impulseScore === 'Medium' ? '#fef9c3' : '#f1f5f9', color: idea.impulseScore === 'High' ? '#15803d' : idea.impulseScore === 'Medium' ? '#92400e' : '#64748b' })}>
                    {idea.impulseScore === 'High' ? '🔥 High Impulse' : idea.impulseScore === 'Medium' ? '⚡ Mid Impulse' : '💤 Low Impulse'}
                  </span>
                </div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 })}>{idea.productName}</div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 12 })}>{idea.tagline}</div>
                <div style={s({ background: 'rgba(234,88,12,0.05)', borderLeft: '3px solid #ea580c', borderRadius: '0 8px 8px 0', padding: '8px 12px', marginBottom: 12 })}>
                  <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#334155', lineHeight: 1.6 })}>😤 {idea.primaryPain}</span>
                </div>
                <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 })}>
                  <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: idea.demandScore >= 8 ? '#dcfce7' : idea.demandScore >= 5 ? '#fef9c3' : '#fee2e2', color: idea.demandScore >= 8 ? '#059669' : idea.demandScore >= 5 ? '#92400e' : '#991b1b' })}>🔍 {idea.demandScore}/10</span>
                  <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: idea.competitionLevel === 'Low' ? '#dcfce7' : idea.competitionLevel === 'Medium' ? '#fef9c3' : '#fee2e2', color: idea.competitionLevel === 'Low' ? '#059669' : idea.competitionLevel === 'Medium' ? '#92400e' : '#991b1b' })}>⚔ {idea.competitionLevel}</span>
                  <span style={s({ padding: '4px 10px', borderRadius: 50, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0891b2' })}>🛠 {idea.buildTime}</span>
                </div>
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                  <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#059669' })}>{idea.priceRange}</span>
                  <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#ea580c', display: 'flex', gap: 4, alignItems: 'center' })}>Deep Research →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ═══════════════════ STEP 3: DEEP RESEARCH REPORT ═══════════════════ */
  if (aiStep === 'report' && researchReport && selectedProduct) {
    const r = researchReport;
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

        {/* SECTIONS */}
        <ReportSection icon="🌍" iconBg="#dcfce7" iconColor="#059669" title="Market Overview" subtitle="Total addressable market & audience" defaultOpen>
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

        <ReportSection icon="😤" iconBg="#fee2e2" iconColor="#ef4444" title="5 Pain Points" subtitle="What keeps your buyer up at night" defaultOpen>
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

        <ReportSection icon="🚀" iconBg="#fff7ed" iconColor="#ea580c" title="Your Next Steps" subtitle="Start building today" defaultOpen glowing>
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
              <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: '#059669' })}>{r.launchStrategy?.firstSaleIn}</div>
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

        {/* Sticky Footer */}
        <div style={s({ position: 'sticky', bottom: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #f1f5f9', padding: '14px 20px', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 20px 20px', marginTop: -16 })}>
          <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' })}>Ready to build {selectedProduct.productName}?</span>
          <div style={s({ display: 'flex', gap: 8 })}>
            <button onClick={() => setAiStep('results')} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 50, padding: '8px 18px', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' })}>← Explore Other Ideas</button>
            <button onClick={() => { /* toast */ }} style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 50, padding: '8px 20px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer' })}>🚀 Start Building This →</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
