import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkCredits, deductCredits, getBalance, CreditCheck } from '@/utils/creditGate';

export function useCreditGate() {
  const [showTopUp, setShowTopUp] = useState(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [creditCheck, setCreditCheck] = useState<CreditCheck | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [lastCallByok, setLastCallByok] = useState(false);
  const [lastCallProvider, setLastCallProvider] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        getBalance(user.id).then(setUserBalance);
      }
    });
  }, []);

  /** Gate an AI call: checks credits, shows confirm/topup if enforced, or proceeds directly in shadow mode */
  const gateAction = useCallback(async (
    toolModule: string,
    callType: string,
    executeAction: () => void
  ) => {
    if (!currentUser) { executeAction(); return; }

    const check = await checkCredits(currentUser.id, toolModule, callType);

    // Shadow or exempt → proceed directly, no popups
    if (check.enforcement === 'shadow' || check.enforcement === 'exempt') {
      executeAction();
      return;
    }

    // Enforced but no credits → top-up modal
    if (!check.hasCredits) {
      setCreditCheck(check);
      setPendingAction(() => executeAction);
      setShowTopUp(true);
      return;
    }

    // Enforced and has credits → confirm modal
    setCreditCheck(check);
    setPendingAction(() => executeAction);
    setShowCreditConfirm(true);
  }, [currentUser]);

  /** Call after a successful AI generation to deduct (skip if BYOK) */
  const deductAfterSuccess = useCallback(async (toolModule: string, callType: string, wasByok?: boolean, provider?: string) => {
    setLastCallByok(!!wasByok);
    setLastCallProvider(provider || null);
    if (!currentUser) return;
    if (wasByok) return; // BYOK — no credits deducted
    const result = await deductCredits(currentUser.id, toolModule, callType);
    if (result.newBalance !== undefined) {
      setUserBalance(result.newBalance);
    } else {
      // Refresh balance
      getBalance(currentUser.id).then(setUserBalance);
    }
  }, [currentUser]);

  const confirmAndProceed = useCallback(() => {
    setShowCreditConfirm(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const cancelConfirm = useCallback(() => {
    setShowCreditConfirm(false);
    setPendingAction(null);
  }, []);

  return {
    showTopUp, setShowTopUp,
    showCreditConfirm,
    creditCheck,
    userBalance, setUserBalance,
    currentUser,
    gateAction,
    deductAfterSuccess,
    confirmAndProceed,
    cancelConfirm,
    lastCallByok,
    lastCallProvider,
  };
}
