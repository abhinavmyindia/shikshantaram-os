import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId ?? '').trim();
    const extraDays = Number(body.extraDays ?? body.additionalDays);
    const adminId = body.adminId ? String(body.adminId) : null;
    const reason = body.reason ? String(body.reason) : null;

    if (!requestId) throw new Error('requestId is required.');
    if (!Number.isFinite(extraDays) || extraDays < 1 || extraDays > 30) {
      throw new Error('extraDays must be between 1 and 30.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: record, error: recErr } = await supabase
      .from('trial_requests')
      .select('id, user_id, access_ends_at, status')
      .eq('id', requestId)
      .maybeSingle();

    if (recErr || !record) throw new Error('Trial request not found.');
    if (!record.user_id) throw new Error('No user linked to this trial.');

    const baseTime = record.access_ends_at && new Date(record.access_ends_at) > new Date()
      ? new Date(record.access_ends_at).getTime()
      : Date.now();
    const newEnd = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000);

    await supabase
      .from('trial_requests')
      .update({
        status: 'approved',
        access_ends_at: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    await supabase
      .from('user_profiles')
      .update({
        is_trial_user: true,
        trial_ends_at: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.user_id);

    // Audit log (best-effort)
    if (adminId) {
      try {
        const { data: rec } = await supabase.from('trial_requests').select('full_name, email, ip_address').eq('id', requestId).maybeSingle();
        await supabase.from('admin_activity_log').insert({
          admin_id: adminId, action_type: 'trial_extended',
          target_user_id: record.user_id, target_user_name: rec?.full_name || null,
          details: { trial_request_id: requestId, extra_days: extraDays, reason, email: rec?.email, ip_address: rec?.ip_address },
        });
      } catch (e) { console.error('audit log failed:', e); }
    }

    return new Response(
      JSON.stringify({ success: true, newEndsAt: newEnd.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('extend-trial error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
