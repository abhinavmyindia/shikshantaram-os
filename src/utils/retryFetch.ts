import { supabase } from '@/integrations/supabase/client';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Wraps supabase.functions.invoke with automatic retry on network errors.
 * Only retries on "Failed to fetch" / network-level failures, NOT on HTTP errors.
 */
export async function invokeWithRetry(
  functionName: string,
  options: { body: Record<string, any>; headers?: Record<string, string> },
  retryOpts: RetryOptions = {}
): Promise<{ data: any; error: any }> {
  const { maxRetries = 3, baseDelayMs = 2000 } = retryOpts;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await supabase.functions.invoke(functionName, options);
      // If we got a response (even an error response), don't retry — it's not a network issue
      return result;
    } catch (err: any) {
      const isNetworkError =
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Load failed') ||
        err?.name === 'TypeError';

      if (!isNetworkError || attempt >= maxRetries) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[Retry] ${functionName} attempt ${attempt + 1} failed (network), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Should never reach here
  return supabase.functions.invoke(functionName, options);
}
