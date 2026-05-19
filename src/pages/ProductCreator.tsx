import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const s = (x: CSSProperties): CSSProperties => x;

type LiveType = 'nonfiction_book' | 'mindmap';
type ComingType = 'fiction_book' | 'course' | 'checklist' | 'colouring_book';
type AnyType = LiveType | ComingType;

interface PrefillData {
  product_name?: string;
  country?: string;
  niche?: string;
  source?: 'manual' | 'product_navigator';
}

interface UsageInfo {
  nonfiction_book_count: number;
  mindmap_count: number;
}

const TEAL = '#0d9488';
const SKY = '#0ea5e9';
const GRADIENT = `linear-gradient(135deg, ${SKY}, ${TEAL})`;

const CARD: CSSProperties = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};

interface CardDef {
  id: AnyType;
  live: boolean;
  title: string;
  time: string;
  description: string;
  tags: string[];
  emoji: string;
  gradient: string;
  badgeGradient?: string;
}

const PRODUCT_CARDS: CardDef[] = [
  {
    id: 'nonfiction_book', live: true,
    title: 'Non Fiction Book Creator', time: '~15 min',
    description: 'Create a professional, research-backed non-fiction book with structured chapters and expert insights',
    tags: ['Research', 'Chapters', 'Publishing ready'],
    emoji: '📚', gradient: 'linear-gradient(135deg, #0ea5e9, #0d9488)',
  },
  {
    id: 'fiction_book', live: false,
    title: 'Fiction Book Creator', time: '~20 min',
    description: "Write a compelling story, novel, or children's book with vivid characters and an engaging narrative arc",
    tags: ['Story plot', 'Characters', 'Narrative arc'],
    emoji: '📖', gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    badgeGradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
  },
  {
    id: 'course', live: false,
    title: 'Course Creator', time: '~25 min',
    description: 'Build a complete online course with structured modules, lesson plans, and clear learning outcomes',
    tags: ['Modules', 'Lessons', 'Outcomes'],
    emoji: '🎓', gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
    badgeGradient: 'linear-gradient(135deg, #f97316, #ef4444)',
  },
  {
    id: 'checklist', live: false,
    title: 'Checklist Creator', time: '~5 min',
    description: 'Generate actionable checklists for any process, habit, or workflow — print-ready and downloadable',
    tags: ['Steps', 'Actions', 'Print ready'],
    emoji: '✅', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    badgeGradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  {
    id: 'colouring_book', live: false,
    title: 'Colouring Book Creator', time: '~20 min',
    description: 'Design unique colouring book pages with themes and illustrations, ready for print on demand',
    tags: ['Illustrations', 'Themes', 'POD ready'],
    emoji: '🎨', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    badgeGradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  },
  {
    id: 'mindmap', live: true,
    title: 'Mind Map Creator', time: '~10 min',
    description: 'Break down any topic into a clear, professional mind map for teaching, planning, or content creation',
    tags: ['Visual', 'Topic breakdown', 'Shareable'],
    emoji: '🧠', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
];

const LABEL_MAP: Record<AnyType, string> = {
  nonfiction_book: 'Non Fiction Book',
  mindmap: 'Mind Map',
  fiction_book: 'Fiction Book Creator',
  course: 'Course Creator',
  checklist: 'Checklist Creator',
  colouring_book: 'Colouring Book Creator',
};

export default function ProductCreator() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<LiveType | null>(null);
  const [comingSoonType, setComingSoonType] = useState<ComingType | null>(null);

  const [state, setState] = useState<'form' | 'workspace' | 'success'>('form');
  const [usage, setUsage] = useState<UsageInfo>({ nonfiction_book_count: 0, mindmap_count: 0 });

  // Form
  const [productName, setProductName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [prefillSource, setPrefillSource] = useState<'manual' | 'product_navigator'>('manual');
  const [prefillNiche, setPrefillNiche] = useState<string>('');
  const [prefillCountry, setPrefillCountry] = useState<string>('');
  const [limitReached, setLimitReached] = useState(false);

  // Workspace
  const [productId, setProductId] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loadingEmbed, setLoadingEmbed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Success
  const [successCount, setSuccessCount] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  // Prefill
  useEffect(() => {
    const raw = sessionStorage.getItem('pc_prefill');
    if (raw) {
      try {
        const p: PrefillData = JSON.parse(raw);
        if (p.product_name) setProductName(p.product_name);
        if (p.country) setPrefillCountry(p.country);
        if (p.niche) setPrefillNiche(p.niche);
        if (p.source === 'product_navigator') setPrefillSource('product_navigator');
        if (p.product_name) {
          // Default selection to non-fiction book when coming from Product Navigator
          setSelectedType('nonfiction_book');
          setCurrentStep(2);
        }
      } catch {}
      sessionStorage.removeItem('pc_prefill');
    }
  }, []);

  // Devtools block
  useEffect(() => {
    const blockInspect = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key)) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault();
    };
    document.addEventListener('keydown', blockInspect);
    return () => document.removeEventListener('keydown', blockInspect);
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('get-user-products', { body: {} });
      if (data?.monthly_usage) {
        setUsage({
          nonfiction_book_count: data.monthly_usage.nonfiction_book_count ?? data.monthly_usage.ebook_count ?? 0,
          mindmap_count: data.monthly_usage.mindmap_count ?? 0,
        });
      }
    } catch {}
  }, []);

  useEffect(() => { if (user) refreshUsage(); }, [user, refreshUsage]);

  // Check limit when entering step 2
  useEffect(() => {
    if (!selectedType) { setLimitReached(false); return; }
    const c = selectedType === 'nonfiction_book' ? usage.nonfiction_book_count : usage.mindmap_count;
    setLimitReached(c >= 5);
  }, [selectedType, usage]);

  const handlePickCard = (def: CardDef) => {
    if (state !== 'form') return;
    if (def.live) {
      setSelectedType(def.id as LiveType);
      setCurrentStep(2);
      setErrors({});
    } else {
      setComingSoonType(def.id as ComingType);
    }
  };

  const backToStep1 = () => {
    setSelectedType(null);
    setProductName('');
    setErrors({});
    setLimitReached(false);
    setCurrentStep(1);
  };

  const handleStart = async () => {
    if (!selectedType) return;
    if (!productName.trim()) { setErrors({ productName: 'This field is required' }); return; }
    setErrors({});
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-product-creator', {
        body: {
          action: 'start',
          product_type: selectedType,
          product_name: productName.trim(),
          author_name: null,
          country: prefillCountry || null,
          niche: prefillNiche || null,
          source: prefillSource,
        },
      });
      if (error) throw error;
      if (data?.error === 'monthly_limit_reached') {
        setLimitReached(true);
        toast.error(data.message || 'Monthly limit reached');
        return;
      }
      if (!data?.product_id) throw new Error('Failed to start product');
      setProductId(data.product_id);
      setState('workspace');
      setCurrentStep(3);
      setLoadingEmbed(true);
      const { data: cfg, error: cfgErr } = await supabase.functions.invoke('manage-product-creator', {
        body: { action: 'get_config', product_type: selectedType },
      });
      if (cfgErr || !cfg?.embed_url) {
        toast.error('Failed to load workspace');
        setLoadingEmbed(false);
        return;
      }
      setEmbedUrl(cfg.embed_url);
      setLoadingEmbed(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not start creation');
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-product-creator', {
        body: { action: 'complete', product_id: productId },
      });
      if (error) throw error;
      setSuccessCount(data?.new_count ?? 1);
      if (selectedType) {
        setUsage(u => ({
          nonfiction_book_count: selectedType === 'nonfiction_book' ? (data?.new_count ?? u.nonfiction_book_count + 1) : u.nonfiction_book_count,
          mindmap_count: selectedType === 'mindmap' ? (data?.new_count ?? u.mindmap_count + 1) : u.mindmap_count,
        }));
      }
      setShowConfirm(false);
      setState('success');
    } catch (err: any) {
      toast.error(err.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setErrors({});
    setProductId(null);
    setEmbedUrl('');
    setPrefillNiche('');
    setPrefillCountry('');
    setPrefillSource('manual');
    setSelectedType(null);
    setState('form');
    setCurrentStep(1);
  };

  const goToMyProducts = () => {
    navigate('/?tab=my-products');
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigateToMyProducts')), 50);
  };

  if (authLoading || !user) {
    return <div style={{ padding: 40, fontFamily: 'Sora', color: '#64748b' }}>Loading...</div>;
  }

  const currentTypeLabel = selectedType ? LABEL_MAP[selectedType] : '';
  const currentEmoji = selectedType ? (PRODUCT_CARDS.find(c => c.id === selectedType)?.emoji || '') : '';
  const currentGradient = selectedType ? (PRODUCT_CARDS.find(c => c.id === selectedType)?.gradient || GRADIENT) : GRADIENT;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 50%, #fef3c7 100%)',
        padding: '32px 24px 80px',
        fontFamily: 'DM Sans, sans-serif',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: 13, marginBottom: 12, padding: 0,
            fontFamily: 'DM Sans', fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </button>

        {/* Breadcrumb on step 2+ */}
        {currentStep > 1 && (
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            Dashboard / Product Creator
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 28, color: '#0f172a', margin: 0 }}>
            Product Creator
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
            Build AI-powered digital products in minutes
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator step={currentStep} />

        {/* STEP 1 — card grid */}
        {currentStep === 1 && state === 'form' && (
          <div style={{ maxWidth: 1100, margin: '0 auto', animation: 'fadeUp 0.3s ease' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {PRODUCT_CARDS.map(card => (
                <ProductCard key={card.id} def={card} onClick={() => handlePickCard(card)} />
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — fill details */}
        {currentStep === 2 && state === 'form' && selectedType && (
          <div style={{ ...CARD, maxWidth: 560, margin: '0 auto', padding: 32, animation: 'fadeUp 0.3s ease' }}>
            <button
              onClick={backToStep1}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: 13, padding: 0, marginBottom: 18,
                fontFamily: 'DM Sans', fontWeight: 600,
              }}
            >
              ← Back
            </button>

            {/* Selected type display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: currentGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: 'white',
              }}>{currentEmoji}</div>
              <div style={{ fontFamily: 'Sora', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                {currentTypeLabel} Creator
              </div>
            </div>

            {limitReached ? (
              <div style={{
                border: '1px solid #fbbf24', background: '#fffbeb',
                borderRadius: 12, padding: 16, fontSize: 14, color: '#92400e',
                lineHeight: 1.6,
              }}>
                ⚠️ You've used all 5 {currentTypeLabel} creations for this month. Resets on the 1st of next month.
              </div>
            ) : (
              <>
                <Field
                  label={selectedType === 'nonfiction_book' ? 'Book Title *' : 'Topic or Subject *'}
                  value={productName}
                  onChange={setProductName}
                  placeholder={selectedType === 'nonfiction_book'
                    ? 'e.g. The Complete Guide to Freelancing in India'
                    : 'e.g. Personal Finance for Millennials'}
                  error={errors.productName}
                />

                {/* Usage row */}
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 10 }}>
                  This month: 📚 Non Fiction: {usage.nonfiction_book_count}/5 · 🧠 Mind Maps: {usage.mindmap_count}/5
                </div>

                {prefillSource === 'product_navigator' && (
                  <div style={{
                    background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10,
                    padding: '8px 12px', fontSize: 12, color: TEAL, marginTop: 12,
                    fontWeight: 600,
                  }}>
                    ✨ Pre-filled from Product Navigator
                  </div>
                )}

                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '12px 0 18px' }}>
                  ⚡ Your AI workspace will open on the next step. Just create and click done.
                </p>

                <button
                  onClick={handleStart}
                  disabled={starting}
                  style={{
                    background: GRADIENT, color: 'white', border: 'none',
                    borderRadius: 12, padding: 14, width: '100%',
                    fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans',
                    cursor: starting ? 'wait' : 'pointer',
                    opacity: starting ? 0.7 : 1,
                  }}
                >
                  {starting ? 'Starting...' : 'Continue to Workspace →'}
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — workspace */}
        {state === 'workspace' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ ...CARD, padding: 18, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                  {currentEmoji} {productName}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Type: {currentTypeLabel} · Status: 🟡 In Progress
                </div>
              </div>
            </div>

            <div style={{
              ...CARD, padding: 0, overflow: 'hidden', marginBottom: 16,
              position: 'relative', userSelect: 'none', WebkitUserSelect: 'none',
            }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {loadingEmbed || !embedUrl ? (
                <div style={{ padding: 80, textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: `3px solid ${TEAL}30`, borderTopColor: TEAL,
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 16px',
                  }} />
                  <div style={{ fontSize: 13, color: '#64748b' }}>Loading your AI workspace...</div>
                </div>
              ) : (
                <iframe
                  src={embedUrl}
                  title="Product Creator Workspace"
                  allow="clipboard-read; clipboard-write; microphone"
                  style={{
                    width: '100%', minHeight: 700, height: '75vh',
                    border: 'none', borderRadius: 12, display: 'block',
                  }}
                />
              )}
            </div>

            <div style={{ ...CARD, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, marginBottom: 12 }}>
                ✅ Done with your product? Click below to save it.
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  background: GRADIENT, color: 'white', border: 'none',
                  borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700,
                  fontFamily: 'DM Sans', cursor: 'pointer',
                }}
              >
                ✓ Mark as Complete
              </button>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div style={{ ...CARD, maxWidth: 480, margin: '40px auto 0', padding: 36, textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 22, color: '#0f172a', marginBottom: 8 }}>
              Product Saved!
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              {productName} has been saved to My Products.
            </div>
            <div style={{
              display: 'inline-block', background: '#f0fdfa', border: `1px solid #99f6e4`,
              color: TEAL, borderRadius: 999, padding: '5px 14px',
              fontSize: 13, fontWeight: 700, marginBottom: 24,
            }}>
              This month: {successCount}/5 {selectedType === 'nonfiction_book' ? 'non fiction books' : 'mind maps'} used
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={goToMyProducts}
                style={{
                  background: GRADIENT, color: 'white', border: 'none',
                  borderRadius: 10, padding: '11px 20px', fontSize: 13, fontWeight: 700,
                  fontFamily: 'DM Sans', cursor: 'pointer',
                }}
              >
                View My Products →
              </button>
              <button
                onClick={resetForm}
                style={{
                  background: 'transparent', color: TEAL,
                  border: `2px solid ${TEAL}`,
                  borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700,
                  fontFamily: 'DM Sans', cursor: 'pointer',
                }}
              >
                Create Another →
              </button>
            </div>
          </div>
        )}

        {/* Coming soon modal */}
        {comingSoonType && (
          <div
            onClick={() => setComingSoonType(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 20, padding: 32,
                maxWidth: 400, width: '100%', textAlign: 'center',
                animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: '#0f172a' }}>
                {LABEL_MAP[comingSoonType]} is Coming Soon!
              </div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginTop: 8 }}>
                We're building this as the next unlock in Product Creator. You'll be notified as soon as it goes live.
              </div>
              <button
                onClick={() => setComingSoonType(null)}
                style={{
                  background: GRADIENT, color: 'white', border: 'none',
                  borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 600,
                  marginTop: 20, cursor: 'pointer', fontFamily: 'DM Sans',
                }}
              >
                Got It, I'm Excited!
              </button>
            </div>
          </div>
        )}

        {/* Confirm complete modal */}
        {showConfirm && (
          <div
            onClick={() => !saving && setShowConfirm(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(6px)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                ...CARD, maxWidth: 420, width: '100%',
                background: 'rgba(255,255,255,0.98)',
                padding: 28, animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 18, color: '#0f172a', marginBottom: 10 }}>
                Save Your Product?
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                Make sure you've finished creating your product in the workspace above.
                Clicking confirm will count this as 1 of your 5 monthly creations.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                  style={{
                    background: 'transparent', border: '1px solid #e2e8f0',
                    borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                    color: '#64748b', cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  style={{
                    background: GRADIENT, color: 'white', border: 'none',
                    borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                    cursor: saving ? 'wait' : 'pointer', fontFamily: 'DM Sans',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Yes, Save It! →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.92); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Pick Product Type' },
    { n: 2, label: 'Fill Details' },
    { n: 3, label: 'Create' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36, marginTop: 8, flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const active = step === s.n;
        const completed = step > s.n;
        const circleStyle: CSSProperties = active ? {
          background: 'linear-gradient(135deg, #0ea5e9, #0d9488)', color: 'white',
          boxShadow: '0 2px 8px rgba(14,165,233,0.35)', border: 'none',
        } : completed ? {
          background: '#0d9488', color: 'white', border: 'none',
        } : {
          background: 'transparent', border: '2px solid #cbd5e1', color: '#94a3b8',
        };
        const labelColor = active ? '#0f172a' : completed ? '#0d9488' : '#94a3b8';
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, ...circleStyle,
              }}>
                {completed ? '✓' : s.n}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: labelColor, fontFamily: 'DM Sans' }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 80, height: 2, margin: '0 12px',
                background: step > s.n ? '#0d9488' : '#e2e8f0',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ def, onClick }: { def: CardDef; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const isLive = def.live;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'white',
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${hover && isLive ? '#0d9488' : '#e2e8f0'}`,
        boxShadow: hover && isLive ? '0 4px 16px rgba(13,148,136,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hover && isLive ? 'translateY(-2px)' : 'none',
      }}
    >
      {!isLive && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: def.badgeGradient || 'linear-gradient(135deg, #8b5cf6, #a855f7)',
          color: 'white', fontSize: 11, fontWeight: 600,
          borderRadius: 999, padding: '3px 10px',
        }}>
          Coming Soon
        </div>
      )}

      <div style={{
        width: 48, height: 48, borderRadius: 12, background: def.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>{def.emoji}</div>

      <div style={{
        fontFamily: 'Sora', fontWeight: 700, fontSize: 16,
        color: '#0f172a', marginTop: 14,
      }}>{def.title}</div>

      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{def.time}</div>

      <div style={{
        fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5,
      }}>{def.description}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {def.tags.map(t => (
          <span key={t} style={{
            background: '#f1f5f9', color: '#64748b', fontSize: 12,
            borderRadius: 999, padding: '3px 10px',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 16px',
          borderRadius: 10,
          border: `1px solid ${error ? '#ef4444' : focused ? '#0d9488' : '#e2e8f0'}`,
          boxShadow: focused && !error ? '0 0 0 3px rgba(13,148,136,0.1)' : 'none',
          background: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'DM Sans',
          color: '#0f172a', outline: 'none', boxSizing: 'border-box',
          transition: 'all 0.15s',
        }}
      />
      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{error}</div>
      )}
    </div>
  );
}
