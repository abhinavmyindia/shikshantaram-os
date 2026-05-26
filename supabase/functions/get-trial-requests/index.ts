import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized, forbidden } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Explicit safe column list — NEVER include otp_code or otp_expires_at.
const SAFE_COLUMNS = [
  'id',
  'full_name',
  'email',
  'phone',
  'status',
  'submitted_at',
  'created_at',
  'updated_at',
  'user_id',
  'user_agent',
  'ip_address',
  'otp_verified',
  'admin_notes',
  'payment_status',
  'payment_amount',
  'payment_link',
  'trial_credits',
  'access_starts_at',
  'access_ends_at',
  'access_duration_days',
  'approved_at',
  'approved_by',
  'upgraded_at',
  'upgraded_to_tier',
].join(', ');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Require authenticated admin caller — endpoint exposes applicant PII.
  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(corsHeaders);
  if (!caller.isAdmin) return forbidden(corsHeaders, 'Admin access required');

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10), 1), 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    let query = supabase
      .from('trial_requests')
      .select(SAFE_COLUMNS)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const { data: counts } = await supabase.from('trial_requests').select('status');
    const countMap: Record<string, number> = {
      pending: 0,
      approved: 0,
      expired: 0,
      upgraded: 0,
      rejected: 0,
    };
    (counts || []).forEach((r: any) => {
      if (r.status in countMap) countMap[r.status]++;
    });

    return new Response(JSON.stringify({ requests: data || [], counts: countMap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('get-trial-requests error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
