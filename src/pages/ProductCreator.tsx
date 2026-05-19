import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const s = (x: CSSProperties): CSSProperties => x;

type ProductType = 'ebook' | 'mindmap';

interface PrefillData {
  product_name?: string;
  country?: string;
  niche?: string;
  source?: 'manual' | 'product_navigator';
}

interface UsageInfo {
  ebook_count: number;
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

export default function ProductCreator() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeType, setActiveType] = useState<ProductType>('ebook');
  const [state, setState] = useState<'form' | 'workspace' | 'success'>('form');
  const [usage, setUsage] = useState<UsageInfo>({ ebook_count: 0, mindmap_count: 0 });

  // Form fields
  const [productName, setProductName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [prefillSource, setPrefillSource] = useState<'manual' | 'product_navigator'>('manual');
  const [prefillNiche, setPrefillNiche] = useState<string>('');

  // Workspace
  const [productId, setProductId] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loadingEmbed, setLoadingEmbed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // Success
  const [successCount, setSuccessCount] = useState<number>(0);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Load prefill on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('pc_prefill');
    if (raw) {
      try {
        const p: PrefillData = JSON.parse(raw);
        if (p.product_name) setProductName(p.product_name);
        if (p.country) setCountry(p.country);
        if (p.niche) setPrefillNiche(p.niche);
        if (p.source === 'product_navigator') setPrefillSource('product_navigator');
      } catch {}
      sessionStorage.removeItem('pc_prefill');
    }
  }, []);

  // Devtools block — page-scoped
  useEffect(() => {
    const blockInspect = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault();
    };
    document.addEventListener('keydown', blockInspect);
    return () => document.removeEventListener('keydown', blockInspect);
  }, []);

  const fetchUsage = useCallback(async (showLimit = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-product-creator', {
        body: { action: 'get_config', product_type: activeType },
      });
      if (error) return;
      if (data) {
        const ebook = activeType === 'ebook' ? data.current_count : usage.ebook_count;
        const mindmap = activeType === 'mindmap' ? data.current_count : usage.mindmap_count;
        setUsage(u => ({
          ebook_count: activeType === 'ebook' ? (data.current_count ?? 0) : u.ebook_count,
          mindmap_count: activeType === 'mindmap' ? (data.current_count ?? 0) : u.mindmap_count,
        }));
        if (showLimit) setLimitReached(!!data.limit_reached);
      }
    } catch {}
  }, [activeType]);

  // Fetch both counts on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      // fetch both counts in parallel via get-user-products (returns usage)
      try {
        const { data } = await supabase.functions.invoke('get-user-products', { body: {} });
        if (data?.monthly_usage) {
          setUsage({
            ebook_count: data.monthly_usage.ebook_count ?? 0,
            mindmap_count: data.monthly_usage.mindmap_count ?? 0,
          });
        }
      } catch {}
    })();
  }, [user]);

  // Recheck limit when type changes
  useEffect(() => {
    const current = activeType === 'ebook' ? usage.ebook_count : usage.mindmap_count;
    setLimitReached(current >= 5);
  }, [activeType, usage]);

  const switchTab = (t: ProductType) => {
    if (state !== 'form') return;
    setActiveType(t);
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!productName.trim()) e.productName = 'This field is required';
    if (activeType === 'ebook' && !authorName.trim()) e.authorName = 'This field is required';
    if (!country.trim()) e.country = 'This field is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStart = async () => {
    if (!validate()) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-product-creator', {
        body: {
          action: 'start',
          product_type: activeType,
          product_name: productName.trim(),
          author_name: activeType === 'ebook' ? authorName.trim() : null,
          country: country.trim(),
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
      // Load embed URL
      setLoadingEmbed(true);
      const { data: cfg, error: cfgErr } = await supabase.functions.invoke('manage-product-creator', {
        body: { action: 'get_config', product_type: activeType },
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
      // refresh local usage
      setUsage(u => ({
        ebook_count: activeType === 'ebook' ? (data?.new_count ?? u.ebook_count + 1) : u.ebook_count,
        mindmap_count: activeType === 'mindmap' ? (data?.new_count ?? u.mindmap_count + 1) : u.mindmap_count,
      }));
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
    setAuthorName('');
    setCountry('');
    setErrors({});
    setProductId(null);
    setEmbedUrl('');
    setPrefillNiche('');
    setPrefillSource('manual');
    setState('form');
  };

  const goToMyProducts = () => {
    navigate('/?tab=my-products');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigateToMyProducts'));
    }, 50);
  };

  if (authLoading || !user) {
    return <div style={{ padding: 40, fontFamily: 'Sora', color: '#64748b' }}>Loading...</div>;
  }

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
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 28, color: '#0f172a', margin: 0 }}>
            Product Creator
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
            Build AI-powered digital products in minutes
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <UsagePill icon="📚" label={`Ebooks: ${usage.ebook_count}/5 this month`} />
            <UsagePill icon="🧠" label={`Mind Maps: ${usage.mindmap_count}/5 this month`} />
          </div>
        </div>

        {/* Tabs */}
        <div style={s({
          display: 'flex',
          width: 'fit-content',
          margin: '0 auto 28px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 50,
          padding: 5,
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          gap: 4,
        })}>
          {(['ebook', 'mindmap'] as ProductType[]).map(t => {
            const active = t === activeType;
            return (
              <button
                key={t}
                onClick={() => switchTab(t)}
                disabled={state !== 'form'}
                style={{
                  background: active ? GRADIENT : 'transparent',
                  color: active ? 'white' : '#64748b',
                  border: 'none',
                  borderRadius: 50,
                  padding: '8px 20px',
                  fontFamily: 'DM Sans',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: state === 'form' ? 'pointer' : 'not-allowed',
                  opacity: state !== 'form' && !active ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {t === 'ebook' ? '📚 Ebook Creator' : '🧠 Mind Map Creator'}
              </button>
            );
          })}
        </div>

        {/* STATES */}
        {state === 'form' && (
          <div style={{ ...CARD, maxWidth: 560, margin: '0 auto', padding: 28, animation: 'fadeUp 0.3s ease' }}>
            {limitReached ? (
              <div style={{
                border: '1px solid #fbbf24', background: '#fffbeb',
                borderRadius: 12, padding: 16, fontSize: 14, color: '#92400e',
                lineHeight: 1.6,
              }}>
                ⚠️ You've used all 5 {activeType === 'ebook' ? 'ebook' : 'mind map'} creations for this month.
                Resets on the 1st of next month.
              </div>
            ) : (
              <>
                {activeType === 'ebook' ? (
                  <>
                    <Field
                      label="Book / Product Title *"
                      value={productName}
                      onChange={setProductName}
                      placeholder="e.g. The Complete Guide to Freelancing in India"
                      error={errors.productName}
                    />
                    <Field
                      label="Author Name *"
                      value={authorName}
                      onChange={setAuthorName}
                      placeholder="Your name or pen name"
                      error={errors.authorName}
                    />
                    <Field
                      label="Target Country / Market *"
                      value={country}
                      onChange={setCountry}
                      placeholder="e.g. India, UAE, United States"
                      error={errors.country}
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="Topic / Subject *"
                      value={productName}
                      onChange={setProductName}
                      placeholder="e.g. Personal Finance for Millennials"
                      error={errors.productName}
                    />
                    <Field
                      label="Target Country / Market *"
                      value={country}
                      onChange={setCountry}
                      placeholder="e.g. India, UAE, United States"
                      error={errors.country}
                    />
                  </>
                )}

                {prefillSource === 'product_navigator' && (
                  <div style={{
                    background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10,
                    padding: '8px 12px', fontSize: 12, color: TEAL, marginTop: 4, marginBottom: 12,
                    fontWeight: 600,
                  }}>
                    ✨ Pre-filled from Product Navigator
                  </div>
                )}

                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '4px 0 16px' }}>
                  ⚡ The AI workspace will appear below once you start. Complete your creation,
                  then click 'Mark as Complete' to save it to My Products.
                </p>

                <button
                  onClick={handleStart}
                  disabled={starting}
                  style={{
                    background: GRADIENT, color: 'white', border: 'none',
                    borderRadius: 12, padding: 14, width: '100%',
                    fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans',
                    cursor: starting ? 'wait' : 'pointer',
                    opacity: starting ? 0.7 : 1,
                  }}
                >
                  {starting ? 'Starting...' : 'Start Creating →'}
                </button>
              </>
            )}
          </div>
        )}

        {state === 'workspace' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {/* Workspace header */}
            <div style={{ ...CARD, padding: 18, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                  {activeType === 'ebook' ? '📚' : '🧠'} {productName}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Type: {activeType === 'ebook' ? 'Ebook' : 'Mind Map'} · Status: 🟡 In Progress
                </div>
              </div>
            </div>

            {/* Iframe */}
            <div style={{
              ...CARD,
              padding: 0,
              overflow: 'hidden',
              marginBottom: 16,
              position: 'relative',
              userSelect: 'none',
              WebkitUserSelect: 'none',
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
                    width: '100%',
                    minHeight: 700,
                    height: '75vh',
                    border: 'none',
                    borderRadius: 12,
                    display: 'block',
                  }}
                />
              )}
            </div>

            {/* Completion row */}
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
              This month: {successCount}/5 {activeType === 'ebook' ? 'ebooks' : 'mind maps'} used
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

        {/* Confirm modal */}
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

function UsagePill({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{
      background: '#f0fdfa', border: '1px solid #99f6e4', color: TEAL,
      borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 600,
    }}>
      {icon} {label}
    </span>
  );
}

function Field({ label, value, onChange, placeholder, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '11px 14px',
          borderRadius: 10, border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`,
          background: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'DM Sans',
          color: '#0f172a', outline: 'none', boxSizing: 'border-box',
        }}
      />
      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{error}</div>
      )}
    </div>
  );
}
