import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

const s = (styles: CSSProperties): CSSProperties => styles;

/* ─── Shadow Mode Control ─────────────────────────────────────────────────── */
const ShadowModeControl = ({ onToggle }: { onToggle: () => void }) => {
  const [mode, setMode] = useState<'shadow' | 'enforced'>('shadow');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    supabase.from('global_settings')
      .select('value').eq('key', 'credits_enforcement_mode').single()
      .then(({ data }) => setMode((data?.value || 'shadow') as any));
  }, []);

  const toggleMode = async () => {
    const newMode = mode === 'shadow' ? 'enforced' : 'shadow';
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('global_settings')
      .update({ value: newMode, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('key', 'credits_enforcement_mode');
    setMode(newMode);
    setShowConfirm(false);
    setLoading(false);
    onToggle();
  };

  const isShadow = mode === 'shadow';

  return (
    <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, border: `2px solid ${isShadow ? '#f59e0b' : '#059669'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 })}>
      <div>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 })}>
          <span style={s({ fontSize: 20 })}>{isShadow ? '👻' : '⚡'}</span>
          <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 16, color: isShadow ? '#b45309' : '#059669' })}>
            {isShadow ? 'Shadow Mode — Tracking Only' : 'Enforcement Active — Credits Gated'}
          </span>
        </div>
        <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', lineHeight: '1.5' })}>
          {isShadow
            ? 'Credits are tracked silently. Users generate freely — no popups, no gates.'
            : 'Full enforcement is live. Users see credit costs, get blocked at zero balance.'}
        </div>
      </div>
      <button onClick={() => setShowConfirm(true)} style={s({
        background: isShadow ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#f59e0b,#ea580c)',
        color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', cursor: 'pointer',
        fontFamily: 'Sora', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap',
        boxShadow: `0 4px 16px ${isShadow ? 'rgba(5,150,105,0.3)' : 'rgba(245,158,11,0.3)'}`,
      })}>
        {isShadow ? '🚀 Go Live' : '👻 Shadow Mode'}
      </button>

      {showConfirm && (
        <div onClick={() => setShowConfirm(false)} style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.5)', backdropFilter: 'blur(8px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
          <div onClick={e => e.stopPropagation()} style={s({ background: 'white', borderRadius: 20, padding: 28, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' })}>
            <div style={s({ fontSize: 36, marginBottom: 8 })}>{isShadow ? '🚀' : '👻'}</div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 8 })}>
              {isShadow ? 'Enable Credit Enforcement?' : 'Switch to Shadow Mode?'}
            </div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: '1.6' })}>
              {isShadow
                ? 'This will activate credit gates for all enforced users. They will see costs before generating and be blocked at zero balance.'
                : 'This will disable all credit gates. Users can generate freely again. Credits still track in the background.'}
            </div>
            <div style={s({ display: 'flex', gap: 10 })}>
              <button onClick={() => setShowConfirm(false)} style={s({ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: '#64748b' })}>Cancel</button>
              <button onClick={toggleMode} disabled={loading} style={s({
                flex: 1, padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: isShadow ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#f59e0b,#ea580c)',
                color: 'white', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, opacity: loading ? 0.5 : 1,
              })}>{loading ? 'Updating...' : isShadow ? 'Yes, Go Live' : 'Yes, Switch'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Shadow Insights ─────────────────────────────────────────────────────── */
const ShadowInsights = () => {
  const [insights, setInsights] = useState<any>(null);
  const [globalMode, setGlobalMode] = useState('shadow');

  useEffect(() => {
    const fetch = async () => {
      const { data: gs } = await supabase.from('global_settings').select('value').eq('key', 'credits_enforcement_mode').single();
      const mode = gs?.value || 'shadow';
      setGlobalMode(mode);
      if (mode !== 'shadow') return;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [lowRes, shadowRes] = await Promise.all([
        supabase.from('user_credits').select('user_id, balance').lt('balance', 20).order('balance', { ascending: true }).limit(10),
        supabase.from('credit_transactions').select('amount, tool_module, user_id').eq('type', 'shadow_deduction').gte('created_at', weekAgo),
      ]);

      const shadowTx = shadowRes.data || [];
      const totalShadow = shadowTx.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
      const uniqueUsers = new Set(shadowTx.map((t: any) => t.user_id)).size;
      setInsights({
        wouldBeEmpty: lowRes.data || [],
        totalShadowCredits: totalShadow,
        avgPerUser: uniqueUsers > 0 ? Math.round(totalShadow / uniqueUsers) : 0,
      });
    };
    fetch();
  }, []);

  if (globalMode !== 'shadow' || !insights) return null;

  return (
    <div style={s({ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.05))', borderRadius: 16, border: '1px solid rgba(245,158,11,0.2)', padding: 20, marginBottom: 24 })}>
      <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: '#b45309', marginBottom: 16 })}>
        👻 Shadow Mode Insights — What Would Happen If You Enforced Today
      </div>
      <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 })}>
        {[
          { value: insights.wouldBeEmpty?.length || 0, label: 'users would be blocked (bal < 20)' },
          { value: insights.totalShadowCredits?.toLocaleString('en-IN'), label: 'credits consumed this week' },
          { value: insights.avgPerUser, label: 'avg credits/user/week' },
        ].map(stat => (
          <div key={stat.label} style={s({ textAlign: 'center' })}>
            <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 24, color: '#b45309' })}>{stat.value}</div>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#92400e' })}>{stat.label}</div>
          </div>
        ))}
      </div>
      {insights.wouldBeEmpty?.length > 0 && (
        <div style={s({ marginTop: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 10 })}>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 })}>Users who would need to top up:</div>
          <div style={s({ display: 'flex', flexWrap: 'wrap', gap: 6 })}>
            {insights.wouldBeEmpty.map((u: any) => (
              <span key={u.user_id} style={s({ fontFamily: 'DM Sans', fontSize: 11, padding: '2px 8px', borderRadius: 50, background: 'rgba(245,158,11,0.15)', color: '#92400e' })}>
                {u.user_id?.slice(0, 8)}… ({u.balance} left)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Admin Credits Tab ──────────────────────────────────────────────── */
export default function AdminCreditsTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [allCredits, setAllCredits] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [giftTarget, setGiftTarget] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [giftReason, setGiftReason] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances');
  const [userProfiles, setUserProfiles] = useState<any>({});

  const loadData = async () => {
    const [creditsRes, txRes, ordersRes, profilesRes] = await Promise.all([
      supabase.from('user_credits').select('*').order('balance', { ascending: false }),
      supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('razorpay_orders').select('amount_inr').eq('status', 'paid'),
      supabase.from('user_profiles').select('id, full_name, credits_enforcement'),
    ]);
    setAllCredits(creditsRes.data || []);
    setRecentTx(txRes.data || []);
    setRevenue((ordersRes.data || []).reduce((sum: number, o: any) => sum + o.amount_inr, 0));
    const pMap: any = {};
    (profilesRes.data || []).forEach((p: any) => { pMap[p.id] = p; });
    setUserProfiles(pMap);
  };

  useEffect(() => { loadData(); }, []);

  const handleGift = async () => {
    if (!giftTarget || !giftAmount) return;
    setGiftLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('gift-credits', {
        body: { targetUserId: giftTarget, amount: parseInt(giftAmount), reason: giftReason },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.success) throw new Error(data?.error || 'Gift failed');
      showToast(`✅ ${giftAmount} credits gifted!`, 'success');
      setGiftTarget(''); setGiftAmount(''); setGiftReason('');
      loadData();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    }
    setGiftLoading(false);
  };

  const handleEnforcementChange = async (userId: string, value: string) => {
    await supabase.from('user_profiles').update({ credits_enforcement: value }).eq('id', userId);
    setUserProfiles((prev: any) => ({ ...prev, [userId]: { ...prev[userId], credits_enforcement: value } }));
    showToast(`Enforcement updated to ${value}`, 'success');
  };

  const totalIssued = allCredits.reduce((sum, u) => sum + (u.lifetime_topped || 0), 0);
  const totalConsumed = allCredits.reduce((sum, u) => sum + (u.lifetime_spent || 0), 0);
  const usersWithBal = allCredits.filter(u => u.balance > 0).length;

  const inputStyle: CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans', fontSize: 13, boxSizing: 'border-box', outline: 'none' };

  return (
    <div>
      {/* Shadow Mode Control */}
      <ShadowModeControl onToggle={loadData} />

      {/* Shadow Insights */}
      <ShadowInsights />

      {/* KPI strip */}
      <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 })}>
        {[
          { label: 'Total Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, color: '#059669' },
          { label: 'Credits Issued', value: totalIssued.toLocaleString('en-IN'), color: '#7c3aed' },
          { label: 'Credits Used', value: totalConsumed.toLocaleString('en-IN'), color: '#ea580c' },
          { label: 'Active Balances', value: usersWithBal, color: '#0284c7' },
        ].map(stat => (
          <div key={stat.label} style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: 20 })}>
            <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' })}>{stat.label}</div>
            <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 24, color: stat.color, marginTop: 4 })}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Gift credits */}
      <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: 20, marginBottom: 24 })}>
        <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 16 })}>🎁 Gift Credits to User</div>
        <div style={s({ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 10, alignItems: 'end' })}>
          <div>
            <label style={s({ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 })}>User ID</label>
            <input value={giftTarget} onChange={e => setGiftTarget(e.target.value)} placeholder="Paste user UUID" style={inputStyle} />
          </div>
          <div>
            <label style={s({ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 })}>Credits</label>
            <input value={giftAmount} onChange={e => setGiftAmount(e.target.value)} placeholder="100" type="number" style={inputStyle} />
          </div>
          <div>
            <label style={s({ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 })}>Reason</label>
            <input value={giftReason} onChange={e => setGiftReason(e.target.value)} placeholder="e.g. Compensation for issue" style={inputStyle} />
          </div>
          <button onClick={handleGift} disabled={giftLoading || !giftTarget || !giftAmount} style={s({ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'DM Sans', fontWeight: 800, fontSize: 13, cursor: giftLoading ? 'not-allowed' : 'pointer', opacity: giftLoading ? 0.5 : 1, whiteSpace: 'nowrap' })}>
            {giftLoading ? 'Gifting...' : '🎁 Gift'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s({ display: 'flex', gap: 4, marginBottom: 16 })}>
        {[{ id: 'balances', label: '💰 User Balances' }, { id: 'transactions', label: '📋 Recent Transactions' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={s({
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans',
            fontWeight: activeTab === t.id ? 800 : 500, fontSize: 13,
            background: activeTab === t.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#f1f5f9',
            color: activeTab === t.id ? 'white' : '#64748b',
          })}>{t.label}</button>
        ))}
      </div>

      {/* Balances table */}
      {activeTab === 'balances' && (
        <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' })}>
          <table style={s({ width: '100%', borderCollapse: 'collapse' })}>
            <thead>
              <tr style={s({ background: '#f8fafc' })}>
                {['User', 'Balance', 'Total Topped', 'Total Used', 'Free Given', 'Enforcement'].map(h => (
                  <th key={h} style={s({ padding: '12px 16px', textAlign: 'left', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' })}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCredits.map(u => {
                const profile = userProfiles[u.user_id];
                const enforcement = profile?.credits_enforcement || 'shadow';
                return (
                  <tr key={u.user_id} style={s({ borderTop: '1px solid #f1f5f9' })}>
                    <td style={s({ padding: '10px 16px' })}>
                      <div style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#0f172a' })}>{profile?.full_name || '—'}</div>
                      <div style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' })}>{u.user_id?.slice(0, 8)}…</div>
                    </td>
                    <td style={s({ padding: '10px 16px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: u.balance > 0 ? '#7c3aed' : '#94a3b8' })}>{u.balance}</td>
                    <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#059669', fontWeight: 600 })}>{u.lifetime_topped}</td>
                    <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#ea580c', fontWeight: 600 })}>{u.lifetime_spent}</td>
                    <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' })}>{u.free_credits_given}</td>
                    <td style={s({ padding: '10px 16px' })}>
                      <select
                        value={enforcement}
                        onChange={e => handleEnforcementChange(u.user_id, e.target.value)}
                        style={s({
                          fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, padding: '4px 8px', borderRadius: 8,
                          border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer',
                          color: enforcement === 'exempt' ? '#7c3aed' : enforcement === 'enforced' ? '#059669' : '#b45309',
                        })}
                      >
                        <option value="shadow">👻 Shadow</option>
                        <option value="enforced">⚡ Enforced</option>
                        <option value="exempt">⭐ Exempt</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {allCredits.length === 0 && (
                <tr><td colSpan={6} style={s({ padding: 32, textAlign: 'center', fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' })}>No credit accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions table */}
      {activeTab === 'transactions' && (
        <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' })}>
          <table style={s({ width: '100%', borderCollapse: 'collapse' })}>
            <thead>
              <tr style={s({ background: '#f8fafc' })}>
                {['Type', 'Amount', 'Balance After', 'Description', 'Date'].map(h => (
                  <th key={h} style={s({ padding: '12px 16px', textAlign: 'left', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' })}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTx.map(tx => (
                <tr key={tx.id} style={s({ borderTop: '1px solid #f1f5f9' })}>
                  <td style={s({ padding: '10px 16px' })}>
                    <span style={s({ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: tx.type === 'topup' ? '#dcfce7' : tx.type === 'deduction' ? '#ede9fe' : tx.type === 'shadow_deduction' ? '#fef3c7' : '#fef3c7', color: tx.type === 'topup' ? '#15803d' : tx.type === 'deduction' ? '#7c3aed' : tx.type === 'shadow_deduction' ? '#92400e' : '#92400e', textTransform: 'uppercase' })}>{tx.type === 'shadow_deduction' ? '👻 shadow' : tx.type}</span>
                  </td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: tx.amount > 0 ? '#059669' : '#7c3aed' })}>{tx.amount > 0 ? '+' : ''}{tx.amount}</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#475569' })}>{tx.balance_after}</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{tx.description}</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>{new Date(tx.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
              {recentTx.length === 0 && (
                <tr><td colSpan={5} style={s({ padding: 32, textAlign: 'center', fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' })}>No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
