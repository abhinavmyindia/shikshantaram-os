import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

const s = (styles: CSSProperties): CSSProperties => styles;

interface Aggregates {
  totalBalance: number;
  totalLifetimeSpent: number;
  totalLifetimeTopped: number;
  userCount: number;
  avgBalance: number;
  topHolders: Array<{ user_id: string; email: string; balance: number }>;
}

interface ResetMeta {
  at: string | null;
  by: string | null;
  amount: string | null;
  affected: string | null;
  reason: string | null;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

const SystemWideCredits = ({ isOwner, showToast }: { isOwner: boolean; showToast: (msg: string, type?: string) => void }) => {
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [meta, setMeta] = useState<ResetMeta>({ at: null, by: null, amount: null, affected: null, reason: null });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resetAmount, setResetAmount] = useState('500');
  const [resetReason, setResetReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lock page scroll while modal is open (prevents background drift, keeps modal truly centered)
  useEffect(() => {
    if (!showModal) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [showModal]);

  const load = async () => {
    setLoading(true);
    try {
      // Aggregates
      const { data: credits } = await supabase
        .from('user_credits')
        .select('user_id, balance, lifetime_spent, lifetime_topped');

      const rows = credits || [];
      const totalBalance = rows.reduce((sum, r: any) => sum + (r.balance || 0), 0);
      const totalLifetimeSpent = rows.reduce((sum, r: any) => sum + (r.lifetime_spent || 0), 0);
      const totalLifetimeTopped = rows.reduce((sum, r: any) => sum + (r.lifetime_topped || 0), 0);
      const userCount = rows.length;
      const avgBalance = userCount ? Math.round(totalBalance / userCount) : 0;

      // Top 5 holders — fetch emails from user_profiles
      const sorted = [...rows].sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0)).slice(0, 5);
      let topHolders: Aggregates['topHolders'] = [];
      if (sorted.length) {
        const ids = sorted.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', ids);
        const profMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { profMap[p.id] = p.full_name || ''; });
        topHolders = sorted.map((r: any) => ({
          user_id: r.user_id,
          email: profMap[r.user_id] || r.user_id.slice(0, 8),
          balance: r.balance || 0,
        }));
      }

      setAgg({ totalBalance, totalLifetimeSpent, totalLifetimeTopped, userCount, avgBalance, topHolders });

      // Reset metadata
      const keys = [
        'last_bulk_credit_reset_at',
        'last_bulk_credit_reset_by',
        'last_bulk_credit_reset_amount',
        'last_bulk_credit_reset_users_affected',
        'last_bulk_credit_reset_reason',
      ];
      const { data: settings } = await supabase
        .from('global_settings').select('key,value').in('key', keys);
      const map: Record<string, string> = {};
      (settings || []).forEach((s: any) => { map[s.key] = s.value; });
      setMeta({
        at: map['last_bulk_credit_reset_at'] || null,
        by: map['last_bulk_credit_reset_by'] || null,
        amount: map['last_bulk_credit_reset_amount'] || null,
        affected: map['last_bulk_credit_reset_users_affected'] || null,
        reason: map['last_bulk_credit_reset_reason'] || null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    const amt = parseInt(resetAmount, 10);
    if (!Number.isFinite(amt) || amt < 0 || amt > 100000) {
      showToast('Enter a valid number between 0 and 100000', 'error');
      return;
    }
    if (confirmText !== 'RESET') {
      showToast('Type RESET to confirm', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-bulk-reset-credits', {
        body: { targetBalance: amt, reason: resetReason || 'Bulk reset by owner' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Reset failed');
      showToast(`✅ Reset complete: ${data.affected} users → ${data.targetBalance} credits`, 'success');
      setShowModal(false);
      setConfirmText('');
      setResetReason('');
      await load();
    } catch (e: any) {
      showToast(`❌ ${e.message || 'Failed to reset credits'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    <div style={s({
      background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(168,85,247,0.04))',
      backdropFilter: 'blur(16px)',
      borderRadius: 16,
      border: '1.5px solid rgba(124,58,237,0.18)',
      boxShadow: '0 4px 20px rgba(124,58,237,0.06)',
      padding: 22,
      marginBottom: 16,
    })}>
      {/* Header */}
      <div style={s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 })}>
        <div>
          <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
            <span style={s({ fontSize: 18 })}>💎</span>
            <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 16, color: '#0f172a' })}>System-Wide Credits</span>
          </div>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', marginTop: 2 })}>
            Live snapshot of every credit in circulation
          </div>
        </div>
        {isOwner && (
          <button onClick={() => setShowModal(true)} style={s({
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
            fontFamily: 'Sora', fontWeight: 800, fontSize: 13,
            boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
          })}>
            🔄 Reset All Balances
          </button>
        )}
      </div>

      {/* KPI Grid */}
      {loading || !agg ? (
        <div style={s({ padding: 24, textAlign: 'center', color: '#94a3b8', fontFamily: 'DM Sans', fontSize: 13 })}>
          Loading aggregates…
        </div>
      ) : (
        <>
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 })}>
            <KpiCard icon="💰" label="Total in Circulation" value={fmt(agg.totalBalance)} suffix="credits" accent="#7c3aed" />
            <KpiCard icon="👥" label="Active Holders" value={fmt(agg.userCount)} suffix="users" accent="#0284c7" />
            <KpiCard icon="📊" label="Avg per User" value={fmt(agg.avgBalance)} suffix="credits" accent="#059669" />
            <KpiCard icon="📈" label="Lifetime Topped" value={fmt(agg.totalLifetimeTopped)} suffix="credits" accent="#d97706" />
            <KpiCard icon="🔥" label="Lifetime Spent" value={fmt(agg.totalLifetimeSpent)} suffix="credits" accent="#dc2626" />
          </div>

          {/* Last reset banner */}
          <div style={s({
            background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 14px',
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8, marginBottom: agg.topHolders.length ? 14 : 0,
          })}>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#475569' })}>
              {meta.at ? (
                <>
                  <strong style={{ color: '#0f172a' }}>Last bulk reset:</strong>{' '}
                  {fmtDate(meta.at)} by <strong>{meta.by}</strong>
                  {meta.amount && <> · target <strong>{meta.amount}</strong> credits</>}
                  {meta.affected && <> · <strong>{meta.affected}</strong> users affected</>}
                  {meta.reason && <> · <em>"{meta.reason}"</em></>}
                </>
              ) : (
                <span style={s({ color: '#94a3b8' })}>No bulk resets performed yet.</span>
              )}
            </div>
          </div>

          {/* Top holders */}
          {agg.topHolders.length > 0 && (
            <div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 })}>
                Top 5 Credit Holders
              </div>
              <div style={s({ display: 'flex', flexDirection: 'column', gap: 6 })}>
                {agg.topHolders.map((h, i) => (
                  <div key={h.user_id} style={s({ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans' })}>
                    <span style={s({ fontWeight: 800, color: '#7c3aed', minWidth: 20 })}>#{i + 1}</span>
                    <span style={s({ flex: 1, color: '#0f172a' })}>{h.email}</span>
                    <span style={s({ fontWeight: 700, color: '#059669' })}>{fmt(h.balance)} credits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Reset Modal */}
      {showModal && (
        <div onClick={() => !submitting && setShowModal(false)} style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.6)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 })}>
          <div onClick={e => e.stopPropagation()} style={s({ background: 'white', borderRadius: 20, padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' })}>
            <div style={s({ fontSize: 36, marginBottom: 8, textAlign: 'center' })}>⚠️</div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a', textAlign: 'center', marginBottom: 6 })}>
              Reset All User Balances
            </div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 })}>
              Every user's balance will be set to the value below.
              {agg && <> This affects <strong>{agg.userCount}</strong> users.</>} A transaction record will be added to each user's history for full audit trail.
            </div>

            <label style={s({ display: 'block', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 })}>Target balance per user</label>
            <input
              type="number" min={0} max={100000}
              value={resetAmount} onChange={e => setResetAmount(e.target.value)}
              style={s({ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 16, fontFamily: 'Sora', fontWeight: 800, color: '#7c3aed', marginBottom: 14, boxSizing: 'border-box' })}
            />

            <label style={s({ display: 'block', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 6 })}>Reason (optional)</label>
            <input
              type="text" value={resetReason} onChange={e => setResetReason(e.target.value)}
              placeholder="e.g. Beta reset, Q2 rebalance…"
              style={s({ width: '100%', padding: 11, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans', marginBottom: 14, boxSizing: 'border-box' })}
            />

            <label style={s({ display: 'block', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#dc2626', marginBottom: 6 })}>Type RESET to confirm</label>
            <input
              type="text" value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())}
              placeholder="RESET"
              style={s({ width: '100%', padding: 11, borderRadius: 10, border: `1.5px solid ${confirmText === 'RESET' ? '#059669' : '#fca5a5'}`, fontSize: 13, fontFamily: 'DM Sans', fontWeight: 700, marginBottom: 18, boxSizing: 'border-box', letterSpacing: 2 })}
            />

            <div style={s({ display: 'flex', gap: 10 })}>
              <button onClick={() => setShowModal(false)} disabled={submitting} style={s({ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b' })}>
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={submitting || confirmText !== 'RESET'}
                style={s({
                  flex: 1, padding: 12, borderRadius: 10, border: 'none',
                  cursor: submitting || confirmText !== 'RESET' ? 'not-allowed' : 'pointer',
                  background: confirmText === 'RESET' ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : '#cbd5e1',
                  color: 'white', fontFamily: 'Sora', fontWeight: 800, fontSize: 13,
                  opacity: submitting ? 0.5 : 1,
                })}
              >
                {submitting ? 'Resetting…' : `Reset to ${resetAmount || 0}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KpiCard = ({ icon, label, value, suffix, accent }: { icon: string; label: string; value: string; suffix: string; accent: string }) => (
  <div style={s({
    background: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 14,
    border: `1px solid ${accent}22`, display: 'flex', flexDirection: 'column', gap: 4,
  })}>
    <div style={s({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 })}>
      <span>{icon}</span><span>{label}</span>
    </div>
    <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: accent, lineHeight: 1.1 })}>{value}</div>
    <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>{suffix}</div>
  </div>
);

export default SystemWideCredits;
