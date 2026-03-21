import { supabase } from '@/integrations/supabase/client';

export interface CreditCheck {
  hasCredits: boolean;
  balance: number;
  cost: number;
  displayName: string;
  balanceAfter: number;
  enforcement: 'shadow' | 'enforced' | 'exempt';
}

/** Call BEFORE every AI generation */
export const checkCredits = async (
  userId: string,
  toolModule: string,
  callType: string
): Promise<CreditCheck> => {
  try {
    const { data } = await supabase.functions.invoke('check-credits', {
      body: { userId, toolModule, callType },
    });
    return data || { hasCredits: true, balance: 0, cost: 0, displayName: callType, balanceAfter: 0, enforcement: 'shadow' };
  } catch {
    return { hasCredits: true, balance: 0, cost: 0, displayName: callType, balanceAfter: 0, enforcement: 'shadow' };
  }
};

/** Call AFTER successful AI generation */
export const deductCredits = async (
  userId: string,
  toolModule: string,
  callType: string,
  aiUsageLogId?: string
): Promise<{ success: boolean; newBalance?: number }> => {
  try {
    const { data } = await supabase.functions.invoke('deduct-credits', {
      body: { userId, toolModule, callType, aiUsageLogId },
    });
    return data || { success: true };
  } catch {
    return { success: true }; // Fail open — never block due to our own bug
  }
};

/** Get current balance for display */
export const getBalance = async (userId: string): Promise<number> => {
  try {
    const { data } = await supabase
      .from('user_credits').select('balance')
      .eq('user_id', userId).single();
    return (data as any)?.balance ?? 0;
  } catch {
    return 0;
  }
};
