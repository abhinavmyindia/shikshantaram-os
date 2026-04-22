import { supabase } from '@/integrations/supabase/client';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  /**
   * Called whenever a retry is about to happen. Lets the UI surface
   * "retrying… attempt 2 of 4" indicators without coupling to the
   * retry implementation.
   */
  onAttempt?: (info: {
    attempt: number;        // 1-indexed attempt about to start (after a failure)
    maxAttempts: number;    // total attempts allowed (maxRetries + 1)
    nextDelayMs: number;    // delay before the next attempt
    reason: string;         // short human-readable reason
  }) => void;
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
  const { maxRetries = 3, baseDelayMs = 2000, onAttempt } = retryOpts;
  const maxAttempts = maxRetries + 1;

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

      // Surface retry status to the UI (attempt about to start is 1-indexed and includes the next try)
      try {
        onAttempt?.({
          attempt: attempt + 2,        // we just finished attempt+1, next will be attempt+2
          maxAttempts,
          nextDelayMs: delay,
          reason: err?.message || 'Network request failed',
        });
      } catch (_) { /* never let UI callback break the retry */ }

      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Should never reach here
  return supabase.functions.invoke(functionName, options);
}
