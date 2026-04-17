import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBalance } from '@/utils/creditGate';

const CreditBalance = ({ userId, onTopUp, byokActive }: { userId: string; onTopUp: () => void; byokActive?: boolean }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [glow, setGlow] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    getBalance(userId).then((b) => {
      prevBalanceRef.current = b;
      setBalance(b);
    });

    const channel = supabase.channel(`credits-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'user_credits', filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newBal = (payload.new as any).balance;
        const prev = prevBalanceRef.current;
        if (prev !== null && newBal > prev) {
          setGlow(true);
          if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
          glowTimerRef.current = setTimeout(() => setGlow(false), 2000);
        }
        prevBalanceRef.current = newBal;
        setBalance(newBal);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, [userId]);

  if (byokActive) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 50, padding: '5px 12px' }}>
          <span style={{ fontSize: 14 }}>🔑</span>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 12, color: '#059669' }}>Your Key Active</span>
        </div>
      </div>
    );
  }

  const isLow = balance !== null && balance < 20;
  const isEmpty = balance !== null && balance < 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: glow
          ? 'rgba(16,185,129,0.12)'
          : isEmpty ? 'rgba(239,68,68,0.06)' : isLow ? 'rgba(245,158,11,0.06)' : 'rgba(124,58,237,0.06)',
        border: `1.5px solid ${glow ? 'rgba(16,185,129,0.45)' : isEmpty ? 'rgba(239,68,68,0.2)' : isLow ? 'rgba(245,158,11,0.2)' : 'rgba(124,58,237,0.15)'}`,
        borderRadius: 50, padding: '5px 14px',
        animation: glow ? 'creditPulse 2s ease-out' : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{
          fontFamily: 'DM Sans', fontWeight: 800, fontSize: 13,
          color: glow ? '#059669' : isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#7c3aed',
          transition: 'color 0.3s ease',
        }}>
          {balance === null ? '...' : `${balance} credits`}
        </span>
        {isLow && !glow && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 50,
            background: isEmpty ? '#fee2e2' : '#fef3c7',
            color: isEmpty ? '#991b1b' : '#92400e',
          }}>
            {isEmpty ? 'Empty!' : 'Low'}
          </span>
        )}
        {glow && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 50,
            background: '#d1fae5', color: '#065f46',
          }}>
            +Added
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
