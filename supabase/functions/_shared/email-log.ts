// Shared helper for logging outbound email send attempts to email_delivery_log.
// Best-effort: never throws — logging failures must not break the send flow.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type EmailLogStatus = 'sent' | 'failed';

export interface EmailLogPayload {
  email_type: string;
  recipient_email: string;
  recipient_user_id?: string | null;
  status: EmailLogStatus;
  error_message?: string | null;
  provider_message_id?: string | null;
  triggered_by_user_id?: string | null;
  triggered_by_email?: string | null;
  context?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logEmailDelivery(payload: EmailLogPayload): Promise<void> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    const client = createClient(url, key, { auth: { persistSession: false } });
    await client.from('email_delivery_log').insert({
      email_type: payload.email_type,
      recipient_email: (payload.recipient_email || '').toLowerCase().trim(),
      recipient_user_id: payload.recipient_user_id || null,
      status: payload.status,
      error_message: payload.error_message || null,
      provider_message_id: payload.provider_message_id || null,
      triggered_by_user_id: payload.triggered_by_user_id || null,
      triggered_by_email: payload.triggered_by_email || null,
      context: payload.context || null,
      metadata: payload.metadata || {},
    });
  } catch (e) {
    console.error('[email-log] insert failed:', (e as any)?.message || e);
  }
}
