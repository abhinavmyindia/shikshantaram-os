import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SystemWideCredits from './SystemWideCredits';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const s = (styles: CSSProperties): CSSProperties => styles;

/* ─── Shadow Mode Control ─────────────────────────────────────────────────── */
const ShadowModeControl = ({ onToggle }: { onToggle: () => void }) => {
  const [mode, setMode] = useState<'shadow' | 'enforced'>('shadow');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  useBodyScrollLock(showConfirm);

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
        <div onClick={() => setShowConfirm(false)} style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.5)', backdropFilter: 'blur(8px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' })}>
          <div onClick={e => e.stopPropagation()} style={s({ background: 'white', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', margin: 'auto' })}>
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

/* ─── Main Admin Credits Tab ──────────────────────────────────────────────── */
export default function AdminCreditsTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  // Sub-tab
  const [subTab, setSubTab] = useState<'revenue'|'pricing'|'gift'|'transactions'>('revenue');
  const { isOwner } = useAdminRole();

  // Revenue
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueRange, setRevenueRange] = useState<'7d'|'30d'|'all'>('30d');
  const [usdRate, setUsdRate] = useState(84);
  const [revenueLoading, setRevenueLoading] = useState(true);

  // Pricing editor
  const [pricing, setPricing] = useState<any[]>([]);
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({});
  const [priceResults, setPriceResults] = useState<Record<string, string>>({});
  const [priceChangeLog, setPriceChangeLog] = useState<any[]>([]);
  const [priceReason, setPriceReason] = useState('');

  // Gift credits
  const [giftEmail, setGiftEmail] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [giftReason, setGiftReason] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftResult, setGiftResult] = useState<{success:boolean;message:string}|null>(null);
  const [giftHistory, setGiftHistory] = useState<any[]>([]);
  const [showBulkGift, setShowBulkGift] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState<'all'|'topup'|'deduction'|'gift'>('all');
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txDateRange, setTxDateRange] = useState<'24h'|'7days'|'30days'|'all'>('7days');
  const [txPage, setTxPage] = useState(0);
  const TX_PAGE_SIZE = 100;

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (subTab === 'revenue') loadRevenue(); }, [revenueRange]);
  useEffect(() => { loadTransactions(); /* eslint-disable-next-line */ }, [txFilter, txDateRange, txPage]);
  useEffect(() => { const t = setTimeout(() => { setTxPage(0); loadTransactions(); }, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [txSearch]);

  // Live auto-refresh: while the Revenue sub-tab is open, poll every 30s
  // so newly captured payments and balance resets show up without a page refresh.
  useEffect(() => {
    if (subTab !== 'revenue') return;
    const interval = setInterval(() => { loadRevenue(); }, 30_000);
    return () => clearInterval(interval);
  }, [subTab, revenueRange]);

  /* ─── Data loaders ────────────────────────────────────────────────────── */
  const loadAll = async () => {
    await Promise.all([loadRevenue(), loadPricing(), loadGiftHistory(), loadTransactions()]);
  };

  const loadRevenue = async () => {
    setRevenueLoading(true);
    try {
      const now = new Date();
      const since = {
        '7d':  new Date(now.getTime() - 7  * 86400000).toISOString(),
        '30d': new Date(now.getTime() - 30 * 86400000).toISOString(),
        'all': new Date('2024-01-01').toISOString(),
      }[revenueRange];

      const { data: rateSetting } = await supabase
        .from('global_settings').select('value').eq('key','usd_inr_rate').single();
      const rate = parseFloat(rateSetting?.value || '84');
      setUsdRate(rate);

      const { data: orders } = await supabase
        .from('razorpay_orders')
        .select('amount_inr,credits_to_add,bonus_credits,paid_at,user_id,user_email')
        .eq('status','paid').gte('paid_at', since)
        .order('paid_at', { ascending: false });

      const totalRevenue      = (orders||[]).reduce((sum: number, o: any) => sum + o.amount_inr, 0);
      const totalPaidCredits  = (orders||[]).reduce((sum: number, o: any) => sum + o.credits_to_add, 0);
      const totalBonusCredits = (orders||[]).reduce((sum: number, o: any) => sum + (o.bonus_credits||0), 0);

      const byPack: Record<string, {count:number;revenue:number}> = {};
      (orders||[]).forEach((o: any) => {
        const key = `₹${o.amount_inr.toLocaleString('en-IN')}`;
        byPack[key] = byPack[key] || { count:0, revenue:0 };
        byPack[key].count++;
        byPack[key].revenue += o.amount_inr;
      });

      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now.getTime() - (29-i) * 86400000);
        return d.toISOString().split('T')[0];
      });
      const dailyRevenue: Record<string, number> = {};
      days.forEach(d => { dailyRevenue[d] = 0; });
      (orders||[]).forEach((o: any) => {
        if (!o.paid_at) return;
        const day = o.paid_at.split('T')[0];
        if (dailyRevenue[day] !== undefined) dailyRevenue[day] += o.amount_inr;
      });

      const { data: aiLogs } = await supabase
        .from('ai_usage_logs')
        .select('estimated_cost_usd,module,model,created_at')
        .gte('created_at', since);

      const totalCostUsd = (aiLogs||[]).reduce((sum: number, l: any) => sum + parseFloat(l.estimated_cost_usd||0), 0);
      const totalCostInr = totalCostUsd * rate;

      const costByModule: Record<string, number> = {};
      (aiLogs||[]).forEach((l: any) => {
        costByModule[l.module] = (costByModule[l.module]||0) + parseFloat(l.estimated_cost_usd||0);
      });

      const dailyCostUsd: Record<string, number> = {};
      days.forEach(d => { dailyCostUsd[d] = 0; });
      (aiLogs||[]).forEach((l: any) => {
        const day = l.created_at?.split('T')[0];
        if (day && dailyCostUsd[day] !== undefined)
          dailyCostUsd[day] += parseFloat(l.estimated_cost_usd||0);
      });

      const { count: byokCalls } = await supabase
        .from('byok_usage_logs')
        .select('*', { count:'exact', head:true })
        .gte('created_at', since);

      const { data: creditStats } = await supabase
        .from('user_credits')
        .select('balance,lifetime_topped,lifetime_spent,free_credits_given');

      const totalOutstandingBalance = (creditStats||[]).reduce((sum: number, u: any) => sum + (u.balance||0), 0);
      const totalLifetimeTopped     = (creditStats||[]).reduce((sum: number, u: any) => sum + (u.lifetime_topped||0), 0);
      const totalFreeGiven          = (creditStats||[]).reduce((sum: number, u: any) => sum + (u.free_credits_given||0), 0);

      const userRevenue: Record<string, any> = {};
      (orders||[]).forEach((o: any) => {
        if (!o.user_email) return;
        userRevenue[o.user_email] = userRevenue[o.user_email] || { email:o.user_email, amount:0, count:0 };
        userRevenue[o.user_email].amount += o.amount_inr;
        userRevenue[o.user_email].count++;
      });
      const topUsers    = Object.values(userRevenue).sort((a:any,b:any) => b.amount - a.amount).slice(0,5);
      const payingUsers = Object.keys(userRevenue).length;
      const arpu        = payingUsers > 0 ? Math.round(totalRevenue / payingUsers) : 0;
      const grossMargin = totalRevenue - totalCostInr;
      const marginPct   = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0;

      setRevenueData({
        totalRevenue, totalCostUsd, totalCostInr, grossMargin, marginPct,
        totalPaidCredits, totalBonusCredits, totalOutstandingBalance,
        totalLifetimeTopped, totalFreeGiven,
        byPack, dailyRevenue, dailyCostUsd, days, costByModule,
        topUsers, payingUsers, arpu,
        byokCalls: byokCalls || 0,
        orderCount: (orders||[]).length,
      });
    } catch (err: any) {
      console.error('loadRevenue error:', err);
    }
    setRevenueLoading(false);
  };

  const loadPricing = async () => {
    const { data } = await supabase
      .from('credit_pricing').select('*').order('tool_module').order('call_type');
    setPricing(data || []);
    const { data: log } = await supabase
      .from('price_change_log').select('*')
      .order('changed_at', { ascending:false }).limit(20);
    setPriceChangeLog(log || []);
  };

  const loadGiftHistory = async () => {
    const { data: gifts } = await supabase
      .from('credit_transactions')
      .select('*').in('type',['gift','promo'])
      .order('created_at', { ascending:false }).limit(30);

    // Enrich with user names
    const userIds = [...new Set((gifts || []).map((g: any) => g.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('user_profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
    const userMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { userMap[p.id] = p.full_name; });

    setGiftHistory((gifts || []).map((g: any) => ({
      ...g,
      _user_name: userMap[g.user_id] || null,
    })));
  };

  const loadTransactions = async () => {
    setTxLoading(true);
    let q = supabase.from('credit_transactions').select('*')
      .order('created_at', { ascending:false })
      .range(txPage * TX_PAGE_SIZE, (txPage + 1) * TX_PAGE_SIZE - 1);
    if (txFilter === 'deduction') q = q.in('type', ['deduction', 'shadow_deduction']);
    else if (txFilter === 'gift') q = q.in('type', ['gift', 'promo']);
    else if (txFilter !== 'all') q = q.eq('type', txFilter);

    const fromDate =
      txDateRange === '24h' ? new Date(Date.now() - 86400000).toISOString() :
      txDateRange === '7days' ? new Date(Date.now() - 7 * 86400000).toISOString() :
      txDateRange === '30days' ? new Date(Date.now() - 30 * 86400000).toISOString() :
      null;
    if (fromDate) q = q.gte('created_at', fromDate);

    if (txSearch.trim()) q = q.or(`user_email.ilike.%${txSearch.trim()}%,description.ilike.%${txSearch.trim()}%`);

    const { data } = await q;

    // Enrich transactions with user names
    const userIds = [...new Set((data || []).map((t: any) => t.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('user_profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
    const userMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { userMap[p.id] = p.full_name; });

    setTransactions((data || []).map((t: any) => ({
      ...t,
      _user_name: userMap[t.user_id] || null,
    })));
    setTxLoading(false);
  };

  const exportLedgerCSV = () => {
    if (!transactions.length) return;
    const rows = [
      ['Date', 'User', 'Email', 'Type', 'Amount', 'Balance After', 'Description', 'Tool', 'Call Type'],
      ...transactions.map((t: any) => [
        new Date(t.created_at).toISOString(),
        t._user_name || '',
        t.user_email || '',
        t.type,
        t.amount,
        t.balance_after,
        t.description || '',
        t.tool_module || '',
        t.call_type || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Action handlers ─────────────────────────────────────────────────── */
  const handleSavePrice = async (toolModule: string, callType: string) => {
    const key = `${toolModule}:${callType}`;
    const newCredits = editingPrice[key];
    if (!newCredits || newCredits < 1 || newCredits > 500) return;
    setSavingPrice(prev => ({ ...prev, [key]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.functions.invoke('update-credit-pricing', {
      body: { toolModule, callType, newCredits, reason: priceReason || null },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (data?.success) {
      setPriceResults(prev => ({ ...prev, [key]: `✅ Updated to ${newCredits}` }));
      setPricing(prev => prev.map((p: any) =>
        p.tool_module===toolModule && p.call_type===callType ? {...p,credits:newCredits} : p
      ));
      await loadPricing();
      setTimeout(() => setPriceResults(prev => ({ ...prev, [key]: '' })), 3000);
    } else {
      setPriceResults(prev => ({ ...prev, [key]: `❌ ${data?.error}` }));
    }
    setSavingPrice(prev => ({ ...prev, [key]: false }));
  };

  const handleGift = async () => {
    if (!giftEmail.trim() || !giftAmount) return;
    setGiftLoading(true); setGiftResult(null);
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.functions.invoke('gift-credits', {
      body: { targetEmail: giftEmail.trim().toLowerCase(), amount: parseInt(giftAmount), reason: giftReason||'Admin gift' },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (data?.success) {
      setGiftResult({ success:true, message:`✅ ${giftAmount} credits gifted to ${data.giftedTo?.email}` });
      // Fire-and-forget gift notification email
      try {
        await supabase.functions.invoke('send-gift-email', {
          body: {
            email: data.giftedTo?.email || giftEmail.trim().toLowerCase(),
            fullName: data.giftedTo?.full_name || '',
            credits: parseInt(giftAmount),
            reason: giftReason || 'Admin gift',
          },
        });
      } catch (_) { /* non-blocking */ }
      setGiftEmail(''); setGiftAmount(''); setGiftReason('');
      await loadGiftHistory();
    } else {
      setGiftResult({ success:false, message:`❌ ${data?.error||'Gift failed'}` });
    }
    setGiftLoading(false);
    setTimeout(() => setGiftResult(null), 5000);
  };

  const handleBulkGift = async () => {
    if (!bulkAmount || !confirm(`Gift ${bulkAmount} credits to ALL active users? This cannot be undone.`)) return;
    setBulkLoading(true);
    const { data: profiles } = await supabase
      .from('user_profiles').select('id').neq('access_tier','revoked');
    let success = 0, failed = 0;
    for (const p of (profiles||[])) {
      try {
        await supabase.rpc('add_user_credits', {
          p_user_id: p.id, p_amount: parseInt(bulkAmount),
          p_type: 'promo', p_description: bulkReason||'Bulk gift from admin',
        });
        success++;
      } catch (_) { failed++; }
    }
    setBulkLoading(false); setShowBulkGift(false);
    setBulkAmount(''); setBulkReason('');
    setGiftResult({ success:true, message:`✅ Gifted ${bulkAmount} credits to ${success} users${failed>0?` (${failed} failed)`:''}.` });
    await loadGiftHistory();
    setTimeout(() => setGiftResult(null), 6000);
  };

  /* ─── Shared helpers ──────────────────────────────────────────────────── */
  const moduleNames: Record<string, string> = {
    product_navigator:'🧭 Product Navigator', niche_clarity:'🎯 Niche Clarity',
    offer_creation:'🎁 Offer Creation', funnel_builder:'🔀 Funnel Builder',
    copywriting_suite:'✍️ Copy Suite',
  };

  const fmtInr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
  const fmtRel = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
    return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  };

  const card: CSSProperties = {
    background:'rgba(255,255,255,0.92)', borderRadius:16,
    border:'1px solid rgba(255,255,255,0.95)', boxShadow:'0 4px 20px rgba(0,0,0,0.05)',
    padding: 20,
  };

  return (
    <div>
      {/* Shadow Mode Control */}
      <ShadowModeControl onToggle={loadAll} />

      {/* Sub-tab nav */}
      <div style={s({ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:20, background:'rgba(255,255,255,0.6)', borderRadius:14, padding:6 })}>
        {([
          { id:'revenue' as const,      icon:'📈', label:'Revenue'  },
          { id:'pricing' as const,      icon:'💰', label:'Pricing'  },
          { id:'gift' as const,         icon:'🎁', label:'Gift'     },
          { id:'transactions' as const, icon:'📋', label:'Ledger'   },
        ]).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={s({
            padding:'9px 4px', borderRadius:10, border:'none', cursor:'pointer',
            background: subTab===t.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
            color: subTab===t.id ? 'white' : '#64748b',
            fontFamily:'DM Sans,sans-serif', fontWeight:subTab===t.id?800:600, fontSize:12,
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            boxShadow: subTab===t.id ? '0 2px 12px rgba(124,58,237,0.25)' : 'none',
            transition:'all 0.15s',
          })}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* SUB-TAB 1: REVENUE DASHBOARD          */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'revenue' && (
        <div style={s({ display:'flex', flexDirection:'column', gap:16 })}>

          {/* System-Wide Credits + Bulk Reset */}
          <SystemWideCredits isOwner={isOwner} showToast={showToast} />

          {/* Range selector + Refresh */}
          <div style={s({ display:'flex', gap:6, justifyContent:'flex-end', alignItems:'center' })}>
            <button
              onClick={() => loadRevenue()}
              disabled={revenueLoading}
              title="Refresh now"
              style={s({
                padding:'6px 14px', borderRadius:50, border:'1.5px solid #e2e8f0',
                cursor: revenueLoading ? 'wait' : 'pointer', fontSize:12,
                background:'white', color:'#64748b', fontFamily:'DM Sans', fontWeight:700,
                display:'flex', alignItems:'center', gap:6, transition:'all 0.15s',
              })}
            >
              <span style={s({ display:'inline-block', animation: revenueLoading ? 'spin 0.8s linear infinite' : 'none' })}>↻</span>
              {revenueLoading ? 'Refreshing…' : 'Refresh'}
            </button>
            {([['7d','7 Days'],['30d','30 Days'],['all','All Time']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setRevenueRange(v)} style={s({
                padding:'6px 16px', borderRadius:50, border:'none', cursor:'pointer', fontSize:12,
                background: revenueRange===v ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#f8fafc',
                color: revenueRange===v ? 'white' : '#64748b',
                fontFamily:'DM Sans,sans-serif', fontWeight:700, transition:'all 0.15s',
              })}>{l}</button>
            ))}
          </div>
          <p style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8', textAlign:'right' as const, margin:'-8px 0 0' })}>
            Auto-refreshes every 30s · Live data
          </p>

          {revenueLoading ? (
            <div style={s({ display:'flex', justifyContent:'center', padding:48 })}>
              <div style={s({ width:32, height:32, border:'3px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' })} />
            </div>
          ) : revenueData && (<>

            {/* Top 3 KPIs */}
            <div style={s({ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 })}>
              {[
                { label:'Total Revenue',   value:fmtInr(revenueData.totalRevenue), sub:`${revenueData.orderCount} orders`,                       color:'#059669', icon:'💰' },
                { label:'AI Cost (INR)',    value:fmtInr(revenueData.totalCostInr), sub:`${fmtUsd(revenueData.totalCostUsd)} @ ₹${usdRate}/$`,   color:'#dc2626', icon:'🤖' },
                { label:'Gross Margin',    value:fmtInr(revenueData.grossMargin),   sub:`${revenueData.marginPct}% margin`,                        color:revenueData.grossMargin>=0?'#7c3aed':'#dc2626', icon:'📊' },
              ].map(stat => (
                <div key={stat.label} style={s({ ...card })}>
                  <div style={s({ display:'flex', alignItems:'center', gap:8, marginBottom:8 })}>
                    <span style={s({ fontSize:18 })}>{stat.icon}</span>
                    <span style={s({ fontFamily:'DM Sans', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' })}>{stat.label}</span>
                  </div>
                  <p style={s({ fontFamily:'Sora', fontWeight:900, fontSize:26, color:stat.color, margin:0 })}>{stat.value}</p>
                  <p style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8', margin:'4px 0 0' })}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Revenue vs Cost 30-day chart */}
            <div style={s({ ...card })}>
              <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>📈 Revenue vs AI Cost — Last 30 Days</p>
              <div style={s({ display:'flex', gap:16, marginBottom:8, fontFamily:'DM Sans', fontSize:11 })}>
                <span><span style={s({ display:'inline-block', width:10, height:10, borderRadius:2, background:'#059669', marginRight:4 })} />Revenue</span>
                <span><span style={s({ display:'inline-block', width:10, height:10, borderRadius:2, background:'#dc2626', marginRight:4 })} />AI Cost</span>
              </div>
              {(() => {
                const maxVal = Math.max(
                  ...revenueData.days.map((d: string) => revenueData.dailyRevenue[d]||0),
                  ...revenueData.days.map((d: string) => (revenueData.dailyCostUsd[d]||0)*usdRate),
                  1
                );
                return (
                  <div style={s({ display:'flex', alignItems:'flex-end', gap:2, height:120 })}>
                    {revenueData.days.map((day: string, i: number) => {
                      const rev  = revenueData.dailyRevenue[day]  || 0;
                      const cost = (revenueData.dailyCostUsd[day] || 0) * usdRate;
                      const isToday = day === new Date().toISOString().split('T')[0];
                      return (
                        <div key={day} style={s({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:1 })} title={`${day}\nRevenue: ${fmtInr(rev)}\nCost: ${fmtInr(cost)}`}>
                          <div style={s({ display:'flex', gap:1, alignItems:'flex-end', height:100, width:'100%' })}>
                            <div style={s({ flex:1, background: isToday ? '#059669' : 'rgba(5,150,105,0.5)', borderRadius:'2px 2px 0 0', height:`${Math.max((rev/maxVal)*100,1)}%`, minHeight:1 })} />
                            <div style={s({ flex:1, background: isToday ? '#dc2626' : 'rgba(220,38,38,0.4)', borderRadius:'2px 2px 0 0', height:`${Math.max((cost/maxVal)*100,1)}%`, minHeight:1 })} />
                          </div>
                          {i%5===0 && <span style={s({ fontFamily:'DM Sans', fontSize:8, color:'#94a3b8', whiteSpace:'nowrap' })}>{new Date(day).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 4 secondary KPIs */}
            <div style={s({ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 })}>
              {[
                { label:'ARPU',               value:`₹${revenueData.arpu}`,                                   sub:'avg revenue/user',    icon:'👤' },
                { label:'Paying Users',       value:revenueData.payingUsers,                                   sub:'bought credits',       icon:'💳' },
                { label:'BYOK Calls',         value:revenueData.byokCalls,                                     sub:'zero cost to us',     icon:'🔑' },
                { label:'Credit Liability',   value:(revenueData.totalOutstandingBalance||0).toLocaleString('en-IN'), sub:'unredeemed balance', icon:'⚡' },
              ].map(stat => (
                <div key={stat.label} style={s({ ...card, textAlign:'center' })}>
                  <span style={s({ fontSize:20 })}>{stat.icon}</span>
                  <p style={s({ fontFamily:'Sora', fontWeight:900, fontSize:22, color:'#7c3aed', margin:'6px 0 2px' })}>{stat.value}</p>
                  <p style={s({ fontFamily:'DM Sans', fontWeight:700, fontSize:12, color:'#374151', margin:0 })}>{stat.label}</p>
                  <p style={s({ fontFamily:'DM Sans', fontSize:10, color:'#94a3b8', margin:'2px 0 0' })}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Revenue by pack + Cost by module */}
            <div style={s({ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 })}>
              <div style={s({ ...card })}>
                <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>💳 Revenue by Pack</p>
                {Object.entries(revenueData.byPack).sort((a:any,b:any)=>b[1].revenue-a[1].revenue).map(([pack,data]:any) => {
                  const pct = revenueData.totalRevenue>0 ? (data.revenue/revenueData.totalRevenue)*100 : 0;
                  return (
                    <div key={pack} style={s({ marginBottom:10 })}>
                      <div style={s({ display:'flex', justifyContent:'space-between', marginBottom:3 })}>
                        <span style={s({ fontFamily:'DM Sans', fontWeight:600, fontSize:12, color:'#374151' })}>
                          {pack} <span style={s({ color:'#94a3b8' })}>×{data.count}</span>
                        </span>
                        <span style={s({ fontFamily:'Sora', fontWeight:700, fontSize:12, color:'#059669' })}>{fmtInr(data.revenue)}</span>
                      </div>
                      <div style={s({ height:5, background:'#f1f5f9', borderRadius:50, overflow:'hidden' })}>
                        <div style={s({ height:'100%', width:`${pct}%`, background:'linear-gradient(135deg,#059669,#10b981)', borderRadius:50 })} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(revenueData.byPack).length===0 && <p style={s({ fontFamily:'DM Sans', fontSize:13, color:'#94a3b8' })}>No orders yet</p>}
              </div>

              <div style={s({ ...card })}>
                <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>🤖 AI Cost by Module</p>
                {Object.entries(revenueData.costByModule).sort((a:any,b:any)=>b[1]-a[1]).map(([mod,cost]:any) => {
                  const total = Object.values(revenueData.costByModule as Record<string,number>).reduce((sum:number,v:number)=>sum+v,0)||1;
                  return (
                    <div key={mod} style={s({ marginBottom:10 })}>
                      <div style={s({ display:'flex', justifyContent:'space-between', marginBottom:3 })}>
                        <span style={s({ fontFamily:'DM Sans', fontWeight:600, fontSize:12, color:'#374151' })}>{moduleNames[mod]||mod}</span>
                        <span style={s({ fontFamily:'Sora', fontWeight:700, fontSize:12, color:'#dc2626' })}>{fmtUsd(cost)} / {fmtInr(cost*usdRate)}</span>
                      </div>
                      <div style={s({ height:5, background:'#f1f5f9', borderRadius:50, overflow:'hidden' })}>
                        <div style={s({ height:'100%', width:`${(cost/total)*100}%`, background:'linear-gradient(135deg,#dc2626,#ef4444)', borderRadius:50 })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top paying users */}
            {revenueData.topUsers.length > 0 && (
              <div style={s({ ...card })}>
                <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>🏆 Top Paying Users</p>
                {revenueData.topUsers.map((u:any, i:number) => (
                  <div key={u.email} style={s({ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop: i>0 ? '1px solid #f1f5f9' : 'none' })}>
                    <p style={s({ fontFamily:'Sora', fontWeight:900, fontSize:16, color:'#7c3aed', margin:0, width:28, textAlign:'center' })}>{i+1}</p>
                    <div style={s({ flex:1 })}>
                      <p style={s({ fontFamily:'DM Sans', fontWeight:600, fontSize:13, color:'#0f172a', margin:0 })}>{u.email}</p>
                      <p style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8', margin:0 })}>{u.count} top-up{u.count>1?'s':''}</p>
                    </div>
                    <span style={s({ fontFamily:'Sora', fontWeight:800, fontSize:15, color:'#059669' })}>{fmtInr(u.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Credits liability */}
            <div style={s({ ...card })}>
              <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>⚡ Credits Liability</p>
              <div style={s({ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 })}>
                {[
                  { label:'Outstanding Balance', value:(revenueData.totalOutstandingBalance||0).toLocaleString('en-IN'), sub:'credits owed to users' },
                  { label:'Free Credits Given',  value:(revenueData.totalFreeGiven||0).toLocaleString('en-IN'),           sub:'gifts + promos' },
                  { label:'All-time Issued',     value:(revenueData.totalLifetimeTopped||0).toLocaleString('en-IN'),      sub:'paid credits ever sold' },
                ].map(stat => (
                  <div key={stat.label} style={s({ textAlign:'center', padding:12, background:'#f8fafc', borderRadius:12 })}>
                    <p style={s({ fontFamily:'Sora', fontWeight:900, fontSize:22, color:'#7c3aed', margin:'0 0 4px' })}>{stat.value}</p>
                    <p style={s({ fontFamily:'DM Sans', fontWeight:700, fontSize:12, color:'#374151', margin:0 })}>{stat.label}</p>
                    <p style={s({ fontFamily:'DM Sans', fontSize:10, color:'#94a3b8', margin:'2px 0 0' })}>{stat.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* USD/INR rate editor */}
            <div style={s({ ...card, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' })}>
              <div>
                <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 4px' })}>💱 USD/INR Rate</p>
                <p style={s({ fontFamily:'DM Sans', fontSize:12, color:'#94a3b8', margin:0 })}>Used to convert AI API costs from USD to INR in this dashboard</p>
              </div>
              <div style={s({ display:'flex', alignItems:'center', gap:8 })}>
                <span style={s({ fontFamily:'DM Sans', fontWeight:700, fontSize:13, color:'#374151' })}>₹</span>
                <input id="usd-rate-input" type="number" defaultValue={usdRate} style={s({ width:70, padding:'8px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:13, outline:'none', textAlign:'center' })} />
                <span style={s({ fontFamily:'DM Sans', fontSize:12, color:'#94a3b8' })}>per $1</span>
                <button onClick={async () => {
                  const val = parseFloat((document.getElementById('usd-rate-input') as HTMLInputElement).value);
                  if (!val || val < 1) return;
                  await supabase.from('global_settings').update({ value: String(val) }).eq('key','usd_inr_rate');
                  setUsdRate(val); await loadRevenue();
                  showToast('USD/INR rate updated', 'success');
                }} style={s({ background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', border:'none', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontFamily:'DM Sans', fontWeight:700, fontSize:12 })}>
                  Update
                </button>
              </div>
            </div>

          </>)}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* SUB-TAB 2: PRICING EDITOR             */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'pricing' && (
        <div style={s({ display:'flex', flexDirection:'column', gap:16 })}>

          <div style={s({ ...card })}>
            <div style={s({ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:16 })}>
              <div>
                <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:15, color:'#0f172a', margin:'0 0 4px' })}>💰 Credit Pricing Editor</p>
                <p style={s({ fontFamily:'DM Sans', fontSize:12, color:'#94a3b8', margin:0 })}>
                  Changes take effect on the very next AI call. Every change is logged with your email and timestamp.
                </p>
              </div>
              <div style={s({ display:'flex', alignItems:'center', gap:8 })}>
                <span style={s({ fontFamily:'DM Sans', fontWeight:700, fontSize:11, color:'#64748b' })}>Reason:</span>
                <input
                  value={priceReason} onChange={e => setPriceReason(e.target.value)}
                  placeholder="e.g. Market adjustment"
                  style={s({ padding:'7px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:12, outline:'none', width:200 })}
                />
              </div>
            </div>

            {/* Pricing rows grouped by module */}
            {Object.entries(
              pricing.reduce((acc: any, p: any) => {
                acc[p.tool_module] = acc[p.tool_module] || [];
                acc[p.tool_module].push(p);
                return acc;
              }, {} as Record<string, any[]>)
            ).map(([module, rows]: any) => (
              <div key={module} style={s({ marginBottom:16 })}>
                <p style={s({ fontFamily:'DM Sans', fontWeight:800, fontSize:12, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 8px' })}>
                  {moduleNames[module] || module}
                </p>
                {rows.map((p: any) => {
                  const key      = `${p.tool_module}:${p.call_type}`;
                  const editVal  = editingPrice[key] ?? p.credits;
                  const isSaving = savingPrice[key];
                  const result   = priceResults[key];
                  const changed  = editVal !== p.credits;

                  return (
                    <div key={key} style={s({ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:'1px solid #f1f5f9', flexWrap:'wrap' })}>
                      <span style={s({ fontFamily:'DM Sans', fontWeight:600, fontSize:13, color:'#374151', flex:1, minWidth:180 })}>
                        {p.display_name}
                      </span>
                      <div style={s({ display:'flex', alignItems:'center', gap:8 })}>
                        <span style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8' })}>
                          Current: <strong>{p.credits}</strong>
                        </span>
                        <input
                          type="number" value={editVal} min={1} max={500}
                          onChange={e => setEditingPrice(prev => ({ ...prev, [key]: parseInt(e.target.value)||p.credits }))}
                          style={s({ width:70, padding:'6px 10px', borderRadius:8, border:`1.5px solid ${changed?'#7c3aed':'#e2e8f0'}`, fontFamily:'DM Sans', fontSize:13, textAlign:'center', outline:'none', transition:'border-color 0.15s' })}
                        />
                        <span style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8' })}>credits</span>
                        <button
                          onClick={() => handleSavePrice(p.tool_module, p.call_type)}
                          disabled={isSaving || !changed}
                          style={s({
                            padding:'6px 14px', borderRadius:8, border:'none', fontSize:12, cursor: !changed||isSaving ? 'not-allowed' : 'pointer',
                            background: !changed||isSaving ? '#f1f5f9' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                            color: !changed||isSaving ? '#94a3b8' : 'white',
                            fontFamily:'DM Sans', fontWeight:700, transition:'all 0.15s',
                          })}
                        >
                          {isSaving ? '...' : 'Save'}
                        </button>
                        {result && (
                          <span style={s({ fontFamily:'DM Sans', fontSize:12, fontWeight:600, color: result.startsWith('✅') ? '#059669' : '#dc2626' })}>
                            {result}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Price change audit log */}
          {priceChangeLog.length > 0 && (
            <div style={s({ ...card })}>
              <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>📋 Recent Price Changes</p>
              {priceChangeLog.map((log: any) => (
                <div key={log.id} style={s({ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid #f1f5f9', gap:12, flexWrap:'wrap' })}>
                  <div>
                    <p style={s({ fontFamily:'DM Sans', fontWeight:600, fontSize:13, color:'#374151', margin:0 })}>
                      {log.display_name || log.call_type}
                      <span style={s({ color:'#94a3b8', fontWeight:400 })}> · {moduleNames[log.tool_module]||log.tool_module}</span>
                    </p>
                    <p style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8', margin:'2px 0 0' })}>
                      {log.changed_by_email} · {fmtRel(log.changed_at)}{log.reason ? ` · "${log.reason}"` : ''}
                    </p>
                  </div>
                  <div style={s({ display:'flex', alignItems:'center', gap:6 })}>
                    <span style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#dc2626' })}>{log.old_credits}</span>
                    <span style={s({ color:'#94a3b8' })}>→</span>
                    <span style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#059669' })}>{log.new_credits}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* SUB-TAB 3: GIFT CREDITS               */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'gift' && (
        <div style={s({ display:'flex', flexDirection:'column', gap:16 })}>

          {/* Single user gift */}
          <div style={s({ ...card })}>
            <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:15, color:'#0f172a', margin:'0 0 14px' })}>🎁 Gift Credits to a User</p>
            <div style={s({ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:10 })}>
              <div>
                <label style={s({ display:'block', fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4, fontFamily:'DM Sans' })}>User Email</label>
                <input value={giftEmail} onChange={e => setGiftEmail(e.target.value)} placeholder="user@example.com"
                  style={s({ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:13, outline:'none', boxSizing:'border-box' as const })}
                />
              </div>
              <div>
                <label style={s({ display:'block', fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4, fontFamily:'DM Sans' })}>Credits</label>
                <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} placeholder="100" min="1"
                  style={s({ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:13, outline:'none', boxSizing:'border-box' as const })}
                />
              </div>
            </div>

            <div style={s({ marginBottom:10 })}>
              <label style={s({ display:'block', fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4, fontFamily:'DM Sans' })}>Reason (optional)</label>
              <input value={giftReason} onChange={e => setGiftReason(e.target.value)} placeholder="e.g. Compensation for issue"
                style={s({ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:13, outline:'none', boxSizing:'border-box' as const })}
              />
            </div>

            <button onClick={handleGift} disabled={giftLoading || !giftEmail.trim() || !giftAmount}
              style={s({ background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', border:'none', borderRadius:10, padding:'10px 24px', fontFamily:'DM Sans', fontWeight:800, fontSize:13, cursor: giftLoading?'not-allowed':'pointer', opacity: giftLoading?0.5:1 })}
            >
              {giftLoading ? '...' : '🎁 Gift'}
            </button>
            {giftResult && (
              <div style={s({ marginTop:12, padding:'10px 14px', borderRadius:10, background: giftResult.success?'rgba(5,150,105,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${giftResult.success?'rgba(5,150,105,0.2)':'rgba(239,68,68,0.2)'}`, fontFamily:'DM Sans', fontSize:13, fontWeight:600, color: giftResult.success?'#059669':'#dc2626' })}>
                {giftResult.message}
              </div>
            )}
          </div>

          {/* Bulk gift */}
          <div style={s({ ...card })}>
            <div style={s({ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom: showBulkGift?14:0 })}>
              <div>
                <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:15, color:'#0f172a', margin:'0 0 4px' })}>📢 Bulk Gift — All Users</p>
                <p style={s({ fontFamily:'DM Sans', fontSize:12, color:'#94a3b8', margin:0 })}>
                  Gift credits to every active user at once. Use for launch promotions or platform compensations.
                </p>
              </div>
              <button onClick={() => setShowBulkGift(!showBulkGift)}
                style={s({ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#b45309', padding:'8px 16px', borderRadius:10, cursor:'pointer', fontFamily:'DM Sans', fontWeight:700, fontSize:12, flexShrink:0 })}
              >
                {showBulkGift ? 'Cancel' : 'Set Up Bulk Gift'}
              </button>
            </div>

            {showBulkGift && (
              <div style={s({ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' })}>
                <div style={s({ flex:1, minWidth:120 })}>
                  <label style={s({ display:'block', fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4, fontFamily:'DM Sans' })}>Credits per User</label>
                  <input type="number" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} placeholder="50" min="1"
                    style={s({ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:13, outline:'none', boxSizing:'border-box' as const })}
                  />
                </div>
                <div style={s({ flex:2, minWidth:200 })}>
                  <label style={s({ display:'block', fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4, fontFamily:'DM Sans' })}>Reason</label>
                  <input value={bulkReason} onChange={e => setBulkReason(e.target.value)} placeholder="e.g. Launch celebration bonus"
                    style={s({ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:13, outline:'none', boxSizing:'border-box' as const })}
                  />
                </div>
                <button onClick={handleBulkGift} disabled={bulkLoading || !bulkAmount}
                  style={s({ background:'linear-gradient(135deg,#f59e0b,#ea580c)', color:'white', border:'none', borderRadius:10, padding:'10px 20px', fontFamily:'DM Sans', fontWeight:800, fontSize:13, cursor: bulkLoading?'not-allowed':'pointer', opacity: bulkLoading?0.5:1, whiteSpace:'nowrap' as const })}
                >
                  {bulkLoading ? 'Gifting...' : '🚀 Gift to All'}
                </button>
              </div>
            )}
          </div>

          {/* Gift history */}
          <div style={s({ ...card })}>
            <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:14, color:'#0f172a', margin:'0 0 12px' })}>📋 Gift History</p>
            {giftHistory.length === 0
              ? <p style={s({ fontFamily:'DM Sans', fontSize:13, color:'#94a3b8' })}>No gifts recorded yet.</p>
              : giftHistory.map((tx: any) => (
                <div key={tx.id} style={s({ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:'1px solid #f1f5f9' })}>
                  <div style={s({ width:32, height:32, borderRadius:8, background: tx.type==='promo'?'rgba(245,158,11,0.08)':'rgba(124,58,237,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 })}>
                    {tx.type === 'promo' ? '📢' : '🎁'}
                  </div>
                  <div style={s({ flex:1 })}>
                    <p style={s({ fontFamily:'DM Sans', fontWeight:700, fontSize:13, color:'#0f172a', margin:0 })}>
                      {tx._user_name || tx.user_email || 'Unknown User'}
                    </p>
                    <p style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8', margin:'2px 0 0' })}>
                      {tx.user_email || ''}{tx.user_email && tx.description ? ' · ' : ''}{tx.description} · {fmtRel(tx.created_at)}
                    </p>
                  </div>
                  <span style={s({ fontFamily:'Sora', fontWeight:800, fontSize:15, color:'#059669' })}>+{tx.amount}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* SUB-TAB 4: TRANSACTION LEDGER         */}
      {/* ══════════════════════════════════════ */}
      {subTab === 'transactions' && (
        <div style={s({ display:'flex', flexDirection:'column', gap:16 })}>

          {/* Filter + count row */}
          <div style={s({ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' })}>
            {([['all','All'],['topup','Top-ups'],['deduction','Deductions'],['gift','Gifts']] as const).map(([v,l]) => (
              <button key={v} onClick={() => { setTxFilter(v); setTxPage(0); }} style={s({
                padding:'6px 16px', borderRadius:50, border:'none', cursor:'pointer', fontSize:12,
                background: txFilter===v ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#f8fafc',
                color: txFilter===v ? 'white' : '#64748b',
                fontFamily:'DM Sans', fontWeight:700, transition:'all 0.15s',
              })}>{l}</button>
            ))}
            <select value={txDateRange} onChange={e => { setTxDateRange(e.target.value as any); setTxPage(0); }} style={s({
              padding:'7px 12px', borderRadius:50, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:12, fontWeight:600, color:'#374151', background:'white', cursor:'pointer',
            })}>
              <option value="24h">24h</option>
              <option value="7days">7 days</option>
              <option value="30days">30 days</option>
              <option value="all">All time</option>
            </select>
            <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search email or description…" style={s({
              padding:'7px 14px', borderRadius:50, border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:12, color:'#374151', minWidth:200,
            })} />
            <button onClick={exportLedgerCSV} disabled={!transactions.length} style={s({
              padding:'7px 14px', borderRadius:50, border:'1px solid rgba(124,58,237,0.2)', background:'rgba(124,58,237,0.06)', color:'#7c3aed', cursor: transactions.length ? 'pointer' : 'not-allowed', fontFamily:'DM Sans', fontWeight:700, fontSize:12, opacity: transactions.length ? 1 : 0.5,
            })}>📥 CSV</button>
            <span style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8', marginLeft:'auto' })}>
              page {txPage + 1} · {transactions.length} records
            </span>
          </div>

          <div style={s({ ...card, padding:0, overflow:'hidden' })}>
            {txLoading ? (
              <div style={s({ display:'flex', justifyContent:'center', padding:48 })}>
                <div style={s({ width:28, height:28, border:'3px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' })} />
              </div>
            ) : transactions.length === 0 ? (
              <p style={s({ fontFamily:'DM Sans', fontSize:13, color:'#94a3b8', textAlign:'center', padding:32 })}>No transactions found.</p>
            ) : (
              <>
                {/* Header row */}
                <div style={s({ display:'grid', gridTemplateColumns:'36px 2fr 3fr 1fr 1fr', gap:8, padding:'10px 16px', background:'#f8fafc' })}>
                  {['','User','Description','Date','Amount'].map(h => (
                    <span key={h} style={s({ fontFamily:'DM Sans', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'0.08em' })}>{h}</span>
                  ))}
                </div>

                {transactions.map((tx: any) => (
                  <div key={tx.id} style={s({ display:'grid', gridTemplateColumns:'36px 2fr 3fr 1fr 1fr', gap:8, padding:'8px 16px', borderTop:'1px solid #f8fafc', alignItems:'center' })}>
                    {/* Type icon */}
                    <div style={s({ width:28, height:28, borderRadius:8, background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 })}>
                      {tx.type==='topup'?'💳': tx.type==='deduction'?'⚡': tx.type==='shadow_deduction'?'👻':'🎁'}
                    </div>

                    {/* User */}
                    <div style={s({ overflow:'hidden' })}>
                      <p style={s({ fontFamily:'DM Sans', fontWeight:700, fontSize:12, color:'#0f172a', margin:0, overflow:'hidden', textOverflow:'ellipsis' as const, whiteSpace:'nowrap' as const })}>
                        {tx._user_name || '—'}
                      </p>
                      <p style={s({ fontFamily:'DM Sans', fontSize:10, color:'#94a3b8', margin:0, overflow:'hidden', textOverflow:'ellipsis' as const, whiteSpace:'nowrap' as const })}>
                        {tx.user_email || ''}
                      </p>
                    </div>

                    {/* Description */}
                    <span style={s({ fontFamily:'DM Sans', fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis' as const, whiteSpace:'nowrap' as const })}>
                      {tx.description || tx.type}
                    </span>

                    {/* Date */}
                    <span style={s({ fontFamily:'DM Sans', fontSize:11, color:'#94a3b8' })}>
                      {fmtRel(tx.created_at)}
                    </span>

                    {/* Amount + balance */}
                    <div>
                      <p style={s({ fontFamily:'Sora', fontWeight:800, fontSize:13, margin:0, color: tx.amount>0?'#059669':'#dc2626' })}>
                        {tx.amount>0?'+':''}{tx.amount}
                      </p>
                      <p style={s({ fontFamily:'DM Sans', fontSize:10, color:'#94a3b8', margin:0 })}>bal:{tx.balance_after}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          {/* Pagination */}
          <div style={s({ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 })}>
            <button onClick={() => setTxPage(Math.max(0, txPage - 1))} disabled={txPage === 0} style={s({
              padding:'6px 14px', borderRadius:8, border:'1px solid #e2e8f0', background: txPage === 0 ? '#f8fafc' : 'white', color: txPage === 0 ? '#cbd5e1' : '#374151', cursor: txPage === 0 ? 'not-allowed' : 'pointer', fontFamily:'DM Sans', fontWeight:600, fontSize:12,
            })}>← Previous</button>
            <button onClick={() => setTxPage(txPage + 1)} disabled={transactions.length < TX_PAGE_SIZE} style={s({
              padding:'6px 14px', borderRadius:8, border:'1px solid #e2e8f0', background: transactions.length < TX_PAGE_SIZE ? '#f8fafc' : 'white', color: transactions.length < TX_PAGE_SIZE ? '#cbd5e1' : '#374151', cursor: transactions.length < TX_PAGE_SIZE ? 'not-allowed' : 'pointer', fontFamily:'DM Sans', fontWeight:600, fontSize:12,
            })}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
