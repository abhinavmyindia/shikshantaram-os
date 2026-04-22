import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getBalance } from '@/utils/creditGate';
import { getLowBalanceThreshold } from '@/hooks/useUserPrefs';

const EMPTY_THRESHOLD = 5;
const SESSION_KEY = 'lowBalanceToastShownAt';
const SHOW_AGAIN_AFTER_MS = 10 * 60 * 1000; // re-show at most every 10 min per session

/**
 * Watches the user's credit balance and shows a sonner toast with a
 * "Top up now" action when balance drops below 20 (or 5 for empty).
 *
 * - Fires on initial load if already low.
 * - Fires on realtime UPDATE when the balance crosses the threshold downward.
 * - Deduped per session (won't spam the same toast more than once per 10 min).
 *
 * @param userId  Current user's id (skip when undefined).
 * @param onTopUp Callback invoked when the user clicks the toast's action.
 */
export function useLowBalanceToast(userId: string | undefined, onTopUp: () => void) {
  const prevBalanceRef = useRef<number | null>(null);
  const onTopUpRef = useRef(onTopUp);

  // Keep latest callback without re-subscribing.
  useEffect(() => { onTopUpRef.current = onTopUp; }, [onTopUp]);

  useEffect(() => {
    if (!userId) return;

    const maybeNotify = (balance: number, prev: number | null) => {
      if (balance >= LOW_THRESHOLD) return;

      // Only fire when crossing downward, OR on initial load (prev === null).
      const crossedDown = prev === null || prev >= LOW_THRESHOLD;
      // Also re-fire if user is now empty and previously was just low.
      const becameEmpty = balance < EMPTY_THRESHOLD && (prev === null || prev >= EMPTY_THRESHOLD);

      if (!crossedDown && !becameEmpty) return;

      // Session-level dedupe.
      const lastShown = Number(sessionStorage.getItem(SESSION_KEY) || 0);
      if (Date.now() - lastShown < SHOW_AGAIN_AFTER_MS && !becameEmpty) return;
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));

      const isEmpty = balance < EMPTY_THRESHOLD;
      const title = isEmpty ? '⚡ You are out of credits' : '⚡ Low credit balance';
      const description = isEmpty
        ? `Only ${balance} credits left. Top up to keep generating.`
        : `You have ${balance} credits left. Top up to avoid interruptions.`;

      toast(title, {
        description,
        duration: 10000,
        action: {
          label: 'Top up now',
          onClick: () => onTopUpRef.current?.(),
        },
      });
    };

    // Initial fetch.
    getBalance(userId).then((b) => {
      maybeNotify(b, null);
      prevBalanceRef.current = b;
    });

    // Realtime updates.
    const channel = supabase.channel(`low-balance-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'user_credits', filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newBal = (payload.new as any)?.balance;
        if (typeof newBal !== 'number') return;
        const prev = prevBalanceRef.current;
        maybeNotify(newBal, prev);
        prevBalanceRef.current = newBal;
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
