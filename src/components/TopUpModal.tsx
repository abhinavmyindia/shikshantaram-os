import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecentTx {
  id: string;
  amount_inr: number;
  credits_to_add: number;
  bonus_credits: number | null;
  status: string | null;
  created_at: string | null;
}

const s = (styles: CSSProperties): CSSProperties => styles;

const PACKS = [
  { index: 0, amountInr: 500, credits: 500, bonus: 0, label: 'Starter', popular: false },
  { index: 1, amountInr: 1000, credits: 1000, bonus: 100, label: 'Growth', popular: true },
  { index: 2, amountInr: 2000, credits: 2000, bonus: 400, label: 'Pro', popular: false },
  { index: 3, amountInr: 5000, credits: 5000, bonus: 1500, label: 'Power', popular: false },
];

declare global {
  interface Window { Razorpay: any; }
}

const TopUpModal = ({ userId, userEmail, userName, currentBalance, requiredCredits, onClose, onSuccess }: {
  userId: string; userEmail: string; userName: string;
  currentBalance: number; requiredCredits?: number;
  onClose: () => void; onSuccess: (newBalance: number) => void;
}) => {
  const [selectedPack, setSelectedPack] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const MAX_ATTEMPTS = 12;

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('razorpay_orders')
      .select('id, amount_inr, credits_to_add, bonus_credits, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setRecentTxs(data as RecentTx[]); });
  }, [userId]);

  const handleTopUp = async () => {
    setLoading(true); setError('');
    try {
      const { data: orderData, error: orderErr } = await supabase.functions.invoke('create-razorpay-order', {
        body: { userId, userEmail, packIndex: selectedPack },
      });
      if (orderErr || !orderData?.success) throw new Error(orderData?.error || 'Failed to create order');

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        order_id: orderData.orderId,
        name: 'Shikshantaram OS',
        description: `${orderData.totalCredits} AI Credits`,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#7c3aed' },
        handler: async (_response: any) => {
          setLoading(true);
          setError('');
          setConfirming(true);
          setPollAttempt(0);

          // Poll user_credits until webhook updates balance (typ. 2-8s, max 24s)
          let attempts = 0;
          const expectedBalance = currentBalance + orderData.totalCredits;

          const pollBalance = async (): Promise<void> => {
            attempts++;
            setPollAttempt(attempts);
            try {
              const { data } = await supabase
                .from('user_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();

              if (data && data.balance >= expectedBalance) {
                toast.success(`✅ ${orderData.totalCredits} credits added to your account!`);
                onSuccess(data.balance);
                setConfirming(false);
                onClose();
                return;
              }

              if (attempts >= MAX_ATTEMPTS) {
                toast.info('Payment received — credits will appear shortly. Refresh in a moment if you don\'t see them.', {
                  duration: 6000,
                });
                onSuccess(data?.balance ?? expectedBalance);
                setConfirming(false);
                onClose();
                return;
              }

              await new Promise(r => setTimeout(r, 2000));
              return pollBalance();
            } catch {
              setConfirming(false);
              onClose();
            }
          };

          await pollBalance();
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  if (confirming) {
    const pct = Math.min(100, Math.round((pollAttempt / MAX_ATTEMPTS) * 100));
    const secsElapsed = pollAttempt * 2;
    return (
      <div style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(14px)', zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
        <div style={s({ background: 'white', borderRadius: 24, padding: 36, maxWidth: 420, width: '92%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' })}>
          <div style={s({ fontSize: 48, marginBottom: 12 })}>⏳</div>
          <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', margin: '0 0 8px' })}>Confirming payment…</h2>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 })}>
            Waiting for Razorpay to confirm and credit your account. This typically takes 5–10 seconds.
          </p>
          <div style={s({ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginBottom: 12 })}>
            <div style={s({ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 999, transition: 'width 0.4s ease' })} />
          </div>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', fontWeight: 600 })}>
            Attempt {pollAttempt} of {MAX_ATTEMPTS} · {secsElapsed}s elapsed
          </div>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#cbd5e1', marginTop: 16 })}>
            Please don't close this window
          </p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.6)', backdropFilter: 'blur(12px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
      <div onClick={e => e.stopPropagation()} style={s({ background: 'white', borderRadius: 24, maxWidth: 520, width: '94%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' })}>

        {/* Header */}
        <div style={s({ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' })}>
          <div>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', margin: 0 })}>⚡ Top Up Credits</h2>
            {requiredCredits && <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 })}>You need {requiredCredits} credits · Balance: {currentBalance}</p>}
          </div>
          <button onClick={onClose} style={s({ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', padding: 4 })}>✕</button>
        </div>

        {/* Pack grid */}
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: '20px 24px' })}>
          {PACKS.map(pack => {
            const total = pack.credits + pack.bonus;
            const sel = selectedPack === pack.index;
            return (
              <div key={pack.index} onClick={() => setSelectedPack(pack.index)} style={s({
                border: sel ? '2px solid #7c3aed' : '1.5px solid #e2e8f0', borderRadius: 16, padding: 16,
                cursor: 'pointer', position: 'relative', background: sel ? 'rgba(124,58,237,0.04)' : 'white', transition: 'all 0.15s',
              })}>
                {pack.popular && <div style={s({ position: 'absolute', top: -8, right: 12, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50 })}>Most Popular</div>}
                <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' })}>{pack.label}</div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 24, color: '#7c3aed', marginTop: 4 })}>₹{pack.amountInr.toLocaleString('en-IN')}</div>
                <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#475569', marginTop: 2 })}>{total.toLocaleString('en-IN')} credits</div>
                {pack.bonus > 0 && <div style={s({ fontFamily: 'DM Sans', fontWeight: 800, fontSize: 11, color: '#059669', marginTop: 4 })}>+{pack.bonus} bonus!</div>}
              </div>
            );
          })}
        </div>

        {/* What you get */}
        <div style={s({ padding: '0 24px 16px' })}>
          <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 8 })}>
            What {(PACKS[selectedPack].credits + PACKS[selectedPack].bonus).toLocaleString('en-IN')} credits gets you:
          </div>
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 })}>
            {[
              { label: `${Math.floor((PACKS[selectedPack].credits + PACKS[selectedPack].bonus) / 15)} deep researches`, icon: '🔬' },
              { label: `${Math.floor((PACKS[selectedPack].credits + PACKS[selectedPack].bonus) / 5)} idea sets`, icon: '💡' },
              { label: `${Math.floor((PACKS[selectedPack].credits + PACKS[selectedPack].bonus) / 12)} full offers`, icon: '🎁' },
              { label: `${Math.floor((PACKS[selectedPack].credits + PACKS[selectedPack].bonus) / 8)} copy sets`, icon: '✍️' },
            ].map(item => (
              <div key={item.label} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#475569' })}>{item.icon} {item.label}</div>
            ))}
          </div>
        </div>

        {error && <div style={s({ padding: '0 24px', marginBottom: 12 })}><p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#ef4444', fontWeight: 600 })}>❌ {error}</p></div>}

        <div style={s({ padding: '0 24px 20px' })}>
          <button onClick={handleTopUp} disabled={loading} style={s({
            width: '100%', padding: 16, borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontFamily: 'Sora', fontWeight: 900, fontSize: 16,
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)', opacity: loading ? 0.7 : 1, transition: 'all 0.15s',
          })}>
            {loading ? 'Opening payment...' : `Pay ₹${PACKS[selectedPack].amountInr.toLocaleString('en-IN')} via UPI / Card`}
          </button>
          <p style={s({ textAlign: 'center', fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 10 })}>
            Secured by Razorpay · Credits never expire · Instant activation
          </p>
        </div>
      </div>
    </div>
  );
};

export default TopUpModal;
