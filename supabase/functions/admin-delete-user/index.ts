import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: adminRow } = await adminClient.from('admin_users').select('user_id').eq('user_id', caller.id).single();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Not an admin' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { userId, action } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Force logout: revoke all sessions without deleting the account ──
    if (action === 'force_logout') {
      const { error: signOutErr } = await adminClient.auth.admin.signOut(userId, 'global');
      if (signOutErr) {
        return new Response(JSON.stringify({ error: signOutErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await adminClient.from('login_sessions')
        .update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'admin_force_logout' })
        .eq('user_id', userId)
        .eq('is_active', true);

      return new Response(JSON.stringify({ success: true, action: 'force_logout' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: delete account entirely.
    // Order matters: clear FK references that point to user_profiles/auth.users BEFORE removing the profile.
    const cleanups: { table: string; column: string }[] = [
      { table: 'beta_feedback',           column: 'user_id' },
      { table: 'tool_usage',              column: 'user_id' },
      { table: 'user_sessions',           column: 'user_id' },
      { table: 'activity_logs',           column: 'user_id' },
      { table: 'recent_work',             column: 'user_id' },
      { table: 'saved_items',             column: 'user_id' },
      { table: 'user_knowledge_docs',     column: 'user_id' },
      { table: 'user_security_settings',  column: 'user_id' },
      { table: 'user_presence',           column: 'user_id' },
      { table: 'user_byok_keys',          column: 'user_id' },
      { table: 'byok_usage_logs',         column: 'user_id' },
      { table: 'ai_usage_logs',           column: 'user_id' },
      { table: 'error_logs',              column: 'user_id' },
      { table: 'deletion_requests',       column: 'user_id' },
      { table: 'razorpay_orders',         column: 'user_id' },
      { table: 'security_events',         column: 'user_id' },
      { table: 'credit_transactions',     column: 'user_id' },
      { table: 'user_credits',            column: 'user_id' },
      { table: 'login_sessions',          column: 'user_id' },
    ];

    const failures: { table: string; error: string }[] = [];
    for (const c of cleanups) {
      const { error: delErr } = await adminClient.from(c.table).delete().eq(c.column, userId);
      if (delErr && !/does not exist|relation .* does not exist/i.test(delErr.message)) {
        failures.push({ table: c.table, error: delErr.message });
      }
    }

    // trial_requests: keep audit trail — null out user_id rather than delete.
    const { error: trialErr } = await adminClient
      .from('trial_requests')
      .update({ user_id: null, status: 'rejected', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (trialErr) failures.push({ table: 'trial_requests', error: trialErr.message });

    // Now profile (FK from trial_requests.user_id has been cleared above).
    const { error: profileErr } = await adminClient.from('user_profiles').delete().eq('id', userId);
    if (profileErr) failures.push({ table: 'user_profiles', error: profileErr.message });

    // admin_users (only matters if the deleted user was on the team).
    await adminClient.from('admin_users').delete().eq('user_id', userId);

    // Finally delete the auth account.
    const { error: authErr } = await adminClient.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error('auth.admin.deleteUser failed:', authErr.message, 'cleanup failures:', failures);
      return new Response(JSON.stringify({
        error: `Auth deletion failed: ${authErr.message}`,
        cleanup_failures: failures,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, cleanup_failures: failures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error('admin-delete-user fatal:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
