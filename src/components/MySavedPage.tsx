import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const s = (styles: CSSProperties): CSSProperties => styles;

const TOOL_COLORS: Record<string, { gradient: string; light: string; accent: string; label: string; emoji: string }> = {
  product_navigator: { gradient: 'linear-gradient(90deg,#ea580c,#f59e0b)', light: 'rgba(234,88,12,0.08)', accent: '#ea580c', label: 'Product Navigator', emoji: '🔍' },
  offer_creation: { gradient: 'linear-gradient(90deg,#f59e0b,#ef4444)', light: 'rgba(245,158,11,0.08)', accent: '#f59e0b', label: 'Offer Creation', emoji: '🎁' },
  funnel_builder: { gradient: 'linear-gradient(90deg,#06b6d4,#3b82f6)', light: 'rgba(6,182,212,0.08)', accent: '#06b6d4', label: 'Funnel Builder', emoji: '🔀' },
  niche_clarity: { gradient: 'linear-gradient(90deg,#7c3aed,#a855f7)', light: 'rgba(124,58,237,0.08)', accent: '#7c3aed', label: 'Niche Clarity', emoji: '🎯' },
  copy_suite: { gradient: 'linear-gradient(90deg,#6366f1,#8b5cf6)', light: 'rgba(99,102,241,0.08)', accent: '#6366f1', label: 'Copywriting Suite', emoji: '✍️' },
};

const TYPE_LABELS: Record<string, string> = {
  product_idea: 'Product Idea', deep_research: 'Deep Research', offer_output: 'Offer Output', funnel_map: 'Funnel Map', copy_output: 'Copy Output',
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

interface SavedItem {
  id: string;
  tool: string;
  item_type: string;
  title: string;
  summary: string | null;
  full_data: any;
  created_at: string;
}

export default function MySavedPage({ userId, onNavigate, onSavedCountChange, onBuildFunnel }: {
  userId: string;
  onNavigate: (page: any) => void;
  onSavedCountChange: (count: number) => void;
  onBuildFunnel?: (data: any) => void;
}) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [copiedFunnel, setCopiedFunnel] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('saved_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    const fetched = (data || []) as SavedItem[];
    setItems(fetched);
    onSavedCountChange(fetched.length);
    setLoading(false);
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    onSavedCountChange(items.length - 1);
    setDeleteConfirm(null);
    await supabase.from('saved_items').delete().eq('id', id);
  };

  const filtered = items.filter(i => filter === 'all' || i.tool === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === 'az') return a.title.localeCompare(b.title);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const toolCounts = items.reduce((acc, i) => { acc[i.tool] = (acc[i.tool] || 0) + 1; return acc; }, {} as Record<string, number>);

  /* ── Action button handlers ── */
  const handleDeepResearch = (item: SavedItem) => {
    setSelectedItem(null);
    // Navigate to product navigator — the product data is in full_data
    onNavigate('product');
  };

  const handleBuildOffer = (item: SavedItem) => {
    setSelectedItem(null);
    onNavigate('offer');
  };

  const handleBuildFunnel = (item: SavedItem) => {
    setSelectedItem(null);
    if (onBuildFunnel) {
      const prefillData = {
        productName: item.full_data?.brief?.productName || item.title,
        offerDescription: item.full_data?.offerData?.oneLinerPitch || item.full_data?.offerData?.offerHeadline || '',
        targetBuyer: item.full_data?.brief?.audience || '',
        priceRange: item.full_data?.brief?.priceRange || '',
        sourceProduct: item.full_data?.brief?.productName || item.title,
      };
      onBuildFunnel(prefillData);
    } else {
      onNavigate('funnel');
    }
  };

  const handleCopyFunnelSummary = (item: SavedItem) => {
    const fd = item.full_data?.funnelData;
    const text = fd ? `${fd.funnelName} — ${fd.funnelTagline || 'funnel'} — ${fd.steps?.length || 0} steps` : item.title;
    navigator.clipboard.writeText(text);
    setCopiedFunnel(true);
    setTimeout(() => setCopiedFunnel(false), 2000);
    toast.success('✓ Copied!', { duration: 2000 });
  };

  return (
    <div style={s({ animation: 'fadeUp 0.4s ease' })}>
      {/* Header */}
      <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 })}>
        <div>
          <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
            <span onClick={() => onNavigate('dashboard')} style={s({ cursor: 'pointer', fontWeight: 500 })}>Dashboard</span>
            <span> / </span>
            <span style={s({ fontWeight: 700, color: '#0f172a' })}>My Saved</span>
          </div>
          <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 })}>My Saved</h1>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 })}>Everything you've bookmarked across all your tools</p>
        </div>
        <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' })}>{items.length} items saved</span>
      </div>

      {/* Filter bar */}
      <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 })}>
        <div style={s({ display: 'flex', gap: 6 })}>
          <button onClick={() => setFilter('all')} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', background: filter === 'all' ? 'linear-gradient(135deg,#ea580c,#f59e0b)' : '#f8fafc', color: filter === 'all' ? 'white' : '#64748b' })}>📋 All ({items.length})</button>
          {Object.entries(toolCounts).map(([tool, count]) => {
            const tc = TOOL_COLORS[tool] || TOOL_COLORS.product_navigator;
            return (
              <button key={tool} onClick={() => setFilter(tool)} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', background: filter === tool ? tc.gradient : '#f8fafc', color: filter === tool ? 'white' : '#64748b' })}>{tc.emoji} {tc.label} ({count})</button>
            );
          })}
        </div>
        <button onClick={() => setSort(sort === 'newest' ? 'oldest' : sort === 'oldest' ? 'az' : 'newest')} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' })}>
          Sort: {sort === 'newest' ? 'Newest First ↓' : sort === 'oldest' ? 'Oldest First ↑' : 'A-Z ↓'}
        </button>
      </div>

      {/* Loading */}
      {loading && <div style={s({ textAlign: 'center', padding: 40, fontFamily: 'DM Sans', color: '#94a3b8' })}>Loading saved items...</div>}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div style={s({ textAlign: 'center', padding: '80px 40px' })}>
          <span style={s({ fontSize: 56, display: 'block', animation: 'float 2s ease-in-out infinite' })}>🔖</span>
          <h2 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginTop: 20 })}>Nothing saved yet</h2>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 8, maxWidth: 420, margin: '8px auto 0', lineHeight: 1.7, textAlign: 'center' })}>
            As you research in Product Navigator, build offers, or map funnels — bookmark anything you want to keep.
          </p>
          <button onClick={() => onNavigate('product')} style={s({ marginTop: 20, background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 22px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 18px rgba(234,88,12,0.35)' })}>
            → Start in Product Navigator
          </button>
        </div>
      )}

      {/* Items grid */}
      {!loading && sorted.length > 0 && (
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 })}>
          {sorted.map((item, i) => {
            const tc = TOOL_COLORS[item.tool] || TOOL_COLORS.product_navigator;
            const isDeleting = deleteConfirm === item.id;
            return (
              <div key={item.id} style={s({
                background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', overflow: 'hidden',
                animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
              })}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
              >
                {/* Top accent */}
                <div style={s({ height: 3, background: tc.gradient })} />
                <div style={s({ padding: '16px 18px 18px' })}>
                  {/* Row 1 */}
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 })}>
                    <span style={s({ background: tc.light, color: tc.accent, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 50 })}>{tc.emoji} {tc.label}</span>
                    <div style={s({ display: 'flex', gap: 6, alignItems: 'center' })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 50 })}>{TYPE_LABELS[item.item_type] || item.item_type}</span>
                      <span onClick={e => { e.stopPropagation(); setDeleteConfirm(item.id); }} style={s({ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', borderRadius: '50%' })}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                        <Trash2 size={14} />
                      </span>
                    </div>
                  </div>
                  {/* Title */}
                  <div onClick={() => setSelectedItem(item)} style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3, marginBottom: 6 })}>
                    {item.title.length > 60 ? item.title.slice(0, 60) + '...' : item.title}
                  </div>
                  {/* Summary */}
                  {item.summary && (
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.65, marginBottom: 12 })}>
                      {item.summary.length > 100 ? item.summary.slice(0, 100) + '...' : item.summary}
                    </div>
                  )}
                  {/* Bottom row or delete confirm */}
                  {isDeleting ? (
                    <div style={s({ background: '#fee2e2', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#991b1b' })}>Delete this saved item?</span>
                      <div style={s({ display: 'flex', gap: 8 })}>
                        <span onClick={e => { e.stopPropagation(); deleteItem(item.id); }} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#ef4444', cursor: 'pointer' })}>Yes, delete</span>
                        <span onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#94a3b8', cursor: 'pointer' })}>Keep it</span>
                      </div>
                    </div>
                  ) : (
                    <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>Saved {relativeTime(item.created_at)}</span>
                      <span onClick={() => setSelectedItem(item)} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: tc.accent, cursor: 'pointer' })}>View →</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <div onClick={() => setSelectedItem(null)} style={s({ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
          <div onClick={e => e.stopPropagation()} style={s({ maxWidth: 760, width: '90%', maxHeight: '85vh', background: 'white', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' })}>
            {/* Header */}
            <div style={s({ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 })}>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 10 })}>
                <span style={s({ background: (TOOL_COLORS[selectedItem.tool] || TOOL_COLORS.product_navigator).light, color: (TOOL_COLORS[selectedItem.tool] || TOOL_COLORS.product_navigator).accent, fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 50 })}>
                  {(TOOL_COLORS[selectedItem.tool] || TOOL_COLORS.product_navigator).emoji} {(TOOL_COLORS[selectedItem.tool] || TOOL_COLORS.product_navigator).label}
                </span>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a' })}>{selectedItem.title}</span>
              </div>
              <span onClick={() => setSelectedItem(null)} style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', cursor: 'pointer' })}>✕ Close</span>
            </div>
            {/* Body */}
            <div style={s({ flex: 1, overflowY: 'auto', padding: 24 })}>
              {selectedItem.summary && (
                <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 20 })}>{selectedItem.summary}</p>
              )}
              {/* Render key data */}
              {selectedItem.item_type === 'product_idea' && selectedItem.full_data && (
                <div>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 8 })}>{selectedItem.full_data.productName}</div>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 8 })}>{selectedItem.full_data.tagline}</p>
                  <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 })}>
                    <span style={s({ fontSize: 11, fontWeight: 700, background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 20 })}>🎯 {selectedItem.full_data.targetAudience}</span>
                    <span style={s({ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#059669', padding: '3px 10px', borderRadius: 20 })}>💰 {selectedItem.full_data.priceRange}</span>
                    <span style={s({ fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 20 })}>⏱ {selectedItem.full_data.buildTime}</span>
                  </div>
                  {selectedItem.full_data.primaryPain && (
                    <div style={s({ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b', lineHeight: 1.6 })}>🔥 {selectedItem.full_data.primaryPain}</div>
                  )}
                </div>
              )}
              {selectedItem.item_type === 'deep_research' && selectedItem.full_data?.report && (
                <div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.7 })}>
                    <strong>Market:</strong> {selectedItem.full_data.report.marketOverview?.totalAddressableMarket || 'N/A'}
                  </div>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.7, marginTop: 8 })}>
                    <strong>Primary Audience:</strong> {selectedItem.full_data.report.marketOverview?.primaryAudience || 'N/A'}
                  </div>
                  {selectedItem.full_data.report.painPoints?.slice(0, 3).map((p: any, i: number) => (
                    <div key={i} style={s({ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontFamily: 'DM Sans', fontSize: 12, color: '#991b1b' })}>🔥 {typeof p === 'string' ? p : p.pain || p.title}</div>
                  ))}
                </div>
              )}
              {selectedItem.item_type === 'offer_output' && selectedItem.full_data?.offerData && (
                <div>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 })}>{selectedItem.full_data.offerData.offerHeadline}</div>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 12 })}>{selectedItem.full_data.offerData.oneLinerPitch}</p>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 24, color: '#059669' })}>{selectedItem.full_data.offerData.yourPrice}</div>
                </div>
              )}
              {selectedItem.item_type === 'funnel_map' && selectedItem.full_data?.funnelData && (
                <div>
                  <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 })}>{selectedItem.full_data.funnelData.funnelName}</div>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 12 })}>{selectedItem.full_data.funnelData.funnelTagline}</p>
                  {selectedItem.full_data.funnelData.steps?.map((step: any, i: number) => (
                    <div key={i} style={s({ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' })}>
                      <span style={s({ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', fontFamily: 'Sora', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>{step.stepNumber}</span>
                      <span style={s({ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, color: '#0f172a' })}>{step.stepIcon} {step.stepName}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedItem.item_type === 'copy_output' && selectedItem.full_data?.sections && (
                <div>
                  <div style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 50, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 12 })}>
                    <span>{selectedItem.full_data.copyType?.icon || '✍️'}</span>
                    <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#6366f1' })}>{selectedItem.full_data.copyType?.name || 'Copy'}</span>
                  </div>
                  {selectedItem.full_data.score && (
                    <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#6366f1', marginBottom: 12 })}>Copy Strength: {selectedItem.full_data.score.overall}/100</div>
                  )}
                  {selectedItem.full_data.sections.map((sec: any, i: number) => (
                    <div key={i} style={s({ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', marginBottom: 8 })}>
                      <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#6366f1', marginBottom: 6 })}>{sec.icon} {sec.name}</div>
                      <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' })}>{sec.content?.slice(0, 200)}{sec.content?.length > 200 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Fallback: show raw JSON summary */}
              {!['product_idea', 'deep_research', 'offer_output', 'funnel_map', 'copy_output'].includes(selectedItem.item_type) && (
                <pre style={s({ fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'pre-wrap', wordBreak: 'break-all' })}>{JSON.stringify(selectedItem.full_data, null, 2).slice(0, 2000)}</pre>
              )}
            </div>
            {/* Action footer */}
            <div style={s({ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 })}>
              <button onClick={() => setSelectedItem(null)} style={s({ background: 'none', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b', cursor: 'pointer' })}>✕ Close</button>
              {selectedItem.item_type === 'product_idea' && (
                <button onClick={() => handleDeepResearch(selectedItem)} style={s({ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(234,88,12,0.3)' })}>🔬 Deep Research This →</button>
              )}
              {selectedItem.item_type === 'deep_research' && (
                <button onClick={() => handleBuildOffer(selectedItem)} style={s({ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' })}>🎁 Build Offer for This Product →</button>
              )}
              {selectedItem.item_type === 'offer_output' && (
                <button onClick={() => handleBuildFunnel(selectedItem)} style={s({ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(6,182,212,0.3)' })}>🔀 Build a Funnel for This →</button>
              )}
              {selectedItem.item_type === 'funnel_map' && (
                <button onClick={() => handleCopyFunnelSummary(selectedItem)} style={s({ background: copiedFunnel ? '#dcfce7' : 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: copiedFunnel ? '#059669' : 'white', border: copiedFunnel ? '1px solid #bbf7d0' : 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' })}>{copiedFunnel ? '✓ Copied!' : '📋 Copy Funnel Summary'}</button>
              )}
              {selectedItem.item_type === 'copy_output' && (
                <button onClick={() => { setSelectedItem(null); onNavigate('copy_suite' as any); }} style={s({ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' })}>✍️ Write More Copy →</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
