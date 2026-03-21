import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBalance } from '@/utils/creditGate';

const CreditBalance = ({ userId, onTopUp }: { userId: string; onTopUp: () => void }) => {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    getBalance(userId).then(setBalance);

    const channel = supabase.channel(`credits-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'user_credits', filter: `user_id=eq.${userId}`,
      }, (payload) => setBalance((payload.new as any).balance))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const isLow = balance !== null && balance < 20;
  const isEmpty = balance !== null && balance < 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: isEmpty ? 'rgba(239,68,68,0.06)' : isLow ? 'rgba(245,158,11,0.06)' : 'rgba(124,58,237,0.06)',
        border: `1.5px solid ${isEmpty ? 'rgba(239,68,68,0.2)' : isLow ? 'rgba(245,158,11,0.2)' : 'rgba(124,58,237,0.15)'}`,
        borderRadius: 50, padding: '5px 14px',
      }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{
          fontFamily: 'DM Sans', fontWeight: 800, fontSize: 13,
          color: isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#7c3aed',
        }}>
          {balance === null ? '...' : `${balance} credits`}
        </span>
        {isLow && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 50,
            background: isEmpty ? '#fee2e2' : '#fef3c7',
            color: isEmpty ? '#991b1b' : '#92400e',
          }}>
            {isEmpty ? 'Empty!' : 'Low'}
          </span>
        )}
      </div>
      <button onClick={onTopUp} style={{
        background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none',
        borderRadius: 50, padding: '6px 14px', cursor: 'pointer',
        fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12,
        boxShadow: '0 2px 8px rgba(124,58,237,0.3)', transition: 'all 0.15s',
      }}>
        + Top Up
      </button>
    </div>
  );
};

export default CreditBalance;
