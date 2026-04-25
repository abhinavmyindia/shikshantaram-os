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
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    const adminId = body.adminId ? String(body.adminId) : null;

    if (!requestId) throw new Error('requestId is required.');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: record, error: recErr } = await supabase
      .from('trial_requests')
      .select('id, full_name, email, ip_address, status, admin_notes')
      .eq('id', requestId)
      .maybeSingle();

    if (recErr || !record) throw new Error('Trial request not found.');
    if (record.status === 'approved') throw new Error('Cannot reject an already-approved trial.');
    if (record.status === 'upgraded') throw new Error('Cannot reject an upgraded user.');
    if (record.status === 'rejected') throw new Error('This request is already rejected.');

    const now = new Date().toISOString();
    const mergedNotes = reason
      ? `${record.admin_notes ? record.admin_notes + '\n' : ''}[Rejected ${now}] ${reason}`
      : record.admin_notes;

    const { error: updErr } = await supabase
      .from('trial_requests')
      .update({ status: 'rejected', admin_notes: mergedNotes, updated_at: now })
      .eq('id', requestId);

    if (updErr) throw new Error(`Failed to update trial request: ${updErr.message}`);

    if (adminId) {
      try {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminId,
          action_type: 'trial_rejected',
          target_user_id: null,
          target_user_name: record.full_name,
          details: {
            trial_request_id: requestId,
            email: record.email,
            ip_address: record.ip_address,
            reason: reason ?? undefined,
          },
        });
      } catch (e) {
        console.error('audit log failed:', e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('reject-trial-request error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
