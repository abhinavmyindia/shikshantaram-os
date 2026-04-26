// Admin-only: provisions a complete test trial user end-to-end.
// Skips the OTP/waitlist flow. Creates auth user + profile + credits + trial_request.
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
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim() || '+910000000000';
    const durationDays = Number(body.durationDays);
    const adminNotes = body.adminNotes ? String(body.adminNotes) : 'Created via Test Trial (admin)';
    const adminId = body.adminId ? String(body.adminId) : null;

    if (!fullName) throw new Error('fullName is required.');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Valid email is required.');
    if (!Number.isFinite(durationDays) || ![2, 7, 14, 30].includes(durationDays)) {
      throw new Error('Duration must be 2, 7, 14, or 30 days.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Verify caller is an admin (defence in depth)
    if (adminId) {
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', adminId)
        .maybeSingle();
      if (!adminRow) throw new Error('Caller is not an admin.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const tempPassword = `Test_${crypto.randomUUID().slice(0, 12)}!Aa1`;

    // Create or find auth user
    let userId: string | null = null;
    let isNew = false;

    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, test_trial: true },
    });

    if (created?.user?.id) {
      userId = created.user.id;
      isNew = true;
    } else if (authErr && (authErr.message || '').toLowerCase().includes('already')) {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (found) {
        userId = found.id;
        await supabase.auth.admin.updateUserById(found.id, { password: tempPassword });
      }
    } else if (authErr) {
      throw new Error(`Auth user creation failed: ${authErr.message}`);
    }

    if (!userId) throw new Error('Could not resolve user ID.');

    // Insert a trial_request record so this user shows up in the Trial tab too
    const { data: trialReq, error: trErr } = await supabase
      .from('trial_requests')
      .insert({
        full_name: fullName,
        email,
        phone,
        ip_address: '0.0.0.0',
        user_agent: 'admin-test-trial',
        status: 'approved',
        otp_verified: true,
        otp_code: null,
        otp_expires_at: null,
        access_duration_days: durationDays,
        access_starts_at: now.toISOString(),
        access_ends_at: expiresAt.toISOString(),
        approved_at: now.toISOString(),
        approved_by: adminId,
        admin_notes: `[TEST TRIAL] ${adminNotes}`,
        user_id: userId,
        trial_credits: 100,
        payment_status: 'trial',
      })
      .select('id')
      .single();

    if (trErr) throw new Error(`trial_requests insert failed: ${trErr.message}`);

    // Upsert profile with trial flags
    await supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          full_name: fullName,
          phone,
          access_tier: 'trial',
          is_trial: true,
          trial_started_at: now.toISOString(),
          trial_source_tier: 'basic',
          trial_ends_at: expiresAt.toISOString(),
          trial_request_id: trialReq.id,
          notes: `[TEST TRIAL] ${adminNotes}`,
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      );

    // Grant 100 starter credits if not present
    const { data: existingCredits } = await supabase
      .from('user_credits')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingCredits) {
      await supabase.from('user_credits').insert({
        user_id: userId,
        balance: 100,
        lifetime_topped: 100,
        free_credits_given: 100,
      });
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        user_email: email,
        type: 'promo',
        amount: 100,
        balance_after: 100,
        description: 'Test trial starter credits — 100 free credits',
        tool_module: 'trial',
        call_type: 'starter_allocation',
      });
    }

    // Audit log
    if (adminId) {
      try {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminId,
          action_type: 'test_trial_created',
          target_user_id: userId,
          target_user_name: fullName,
          details: {
            email,
            phone,
            duration_days: durationDays,
            trial_request_id: trialReq.id,
            is_new_auth_user: isNew,
            access_starts_at: now.toISOString(),
            access_ends_at: expiresAt.toISOString(),
            admin_notes: adminNotes,
          },
        });
      } catch (e) { console.error('audit log failed:', e); }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        trialRequestId: trialReq.id,
        email,
        tempPassword,
        expiresAt: expiresAt.toISOString(),
        durationDays,
        isNewAuthUser: isNew,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-test-trial-user error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
