import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

const s = (styles: CSSProperties): CSSProperties => styles;

export default function AdminCreditsTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [allCredits, setAllCredits] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [giftTarget, setGiftTarget] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [giftReason, setGiftReason] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [creditsRes, txRes, ordersRes] = await Promise.all([
      supabase.from('user_credits').select('*').order('balance', { ascending: false }),
      supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('razorpay_orders').select('amount_inr').eq('status', 'paid'),
    ]);
    setAllCredits(creditsRes.data || []);
    setRecentTx(txRes.data || []);
    setRevenue((ordersRes.data || []).reduce((sum: number, o: any) => sum + o.amount_inr, 0));
  };

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

  const totalIssued = allCredits.reduce((sum, u) => sum + (u.lifetime_topped || 0), 0);
  const totalConsumed = allCredits.reduce((sum, u) => sum + (u.lifetime_spent || 0), 0);
  const usersWithBal = allCredits.filter(u => u.balance > 0).length;

  const inputStyle: CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans', fontSize: 13, boxSizing: 'border-box', outline: 'none' };

  return (
    <div>
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
                {['User ID', 'Balance', 'Total Topped', 'Total Used', 'Free Given'].map(h => (
                  <th key={h} style={s({ padding: '12px 16px', textAlign: 'left', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' })}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCredits.map(u => (
                <tr key={u.user_id} style={s({ borderTop: '1px solid #f1f5f9' })}>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 12, color: '#475569' })}>{u.user_id?.slice(0, 8)}...</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: u.balance > 0 ? '#7c3aed' : '#94a3b8' })}>{u.balance}</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#059669', fontWeight: 600 })}>{u.lifetime_topped}</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#ea580c', fontWeight: 600 })}>{u.lifetime_spent}</td>
                  <td style={s({ padding: '10px 16px', fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' })}>{u.free_credits_given}</td>
                </tr>
              ))}
              {allCredits.length === 0 && (
                <tr><td colSpan={5} style={s({ padding: 32, textAlign: 'center', fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' })}>No credit accounts yet.</td></tr>
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
                    <span style={s({ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: tx.type === 'topup' ? '#dcfce7' : tx.type === 'deduction' ? '#ede9fe' : '#fef3c7', color: tx.type === 'topup' ? '#15803d' : tx.type === 'deduction' ? '#7c3aed' : '#92400e', textTransform: 'uppercase' })}>{tx.type}</span>
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
