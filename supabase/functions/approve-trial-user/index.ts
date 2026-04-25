import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId ?? body.trial_request_id ?? '').trim();
    const rawDuration = body.durationDays ?? body.duration_days ?? body.days;
    const durationDays = Number(rawDuration);
    const adminNotes = body.adminNotes ? String(body.adminNotes) : null;
    const adminId = body.adminId ? String(body.adminId) : null;

    if (!requestId) throw new Error('requestId is required.');
    if (!Number.isFinite(durationDays) || ![2, 7, 14, 30].includes(durationDays)) {
      throw new Error(`Duration must be 2, 7, 14, or 30 days. Received: ${JSON.stringify(rawDuration)}`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: record, error: recErr } = await supabase
      .from('trial_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (recErr || !record) throw new Error('Trial request not found.');
    if (!record.otp_verified) throw new Error('Email not verified for this request.');
    if (record.status === 'approved') throw new Error('This trial is already approved.');
    if (record.status === 'upgraded') throw new Error('This user is already upgraded.');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create or fetch auth user
    const tempPassword = `Trial_${crypto.randomUUID().slice(0, 12)}!Aa1`;
    let userId: string | null = null;
    let isNewUser = false;

    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email: record.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: record.full_name, phone: record.phone },
    });

    if (created?.user?.id) {
      userId = created.user.id;
      isNewUser = true;
    } else if (authErr && (authErr.message || '').toLowerCase().includes('already')) {
      // User already exists — find them and reset password so trial credentials still work
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => u.email?.toLowerCase() === record.email.toLowerCase());
      if (found) {
        userId = found.id;
        // Reset password so the credentials we email are valid for returning trialers
        await supabase.auth.admin.updateUserById(found.id, { password: tempPassword });
      }
    } else if (authErr) {
      throw new Error(`Auth user creation failed: ${authErr.message}`);
    }

    if (!userId) throw new Error('Could not resolve user ID after auth provisioning.');

    // Upsert profile with trial flags (access_tier stays 'basic')
    await supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          full_name: record.full_name,
          phone: record.phone,
          access_tier: 'trial',
          is_trial_user: true,
          trial_ends_at: expiresAt.toISOString(),
          trial_request_id: requestId,
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      );

    // Grant 100 trial credits if user has no credits row yet
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
        user_email: record.email,
        type: 'promo',
        amount: 100,
        balance_after: 100,
        description: 'Trial user starter credits — 100 free credits',
        tool_module: 'trial',
        call_type: 'starter_allocation',
      });
    }

    // Update trial request
    await supabase
      .from('trial_requests')
      .update({
        status: 'approved',
        access_duration_days: durationDays,
        access_starts_at: now.toISOString(),
        access_ends_at: expiresAt.toISOString(),
        user_id: userId,
        approved_by: adminId,
        approved_at: now.toISOString(),
        admin_notes: adminNotes ?? record.admin_notes,
        updated_at: now.toISOString(),
      })
      .eq('id', requestId);

    // Audit log (best-effort) — full payload for debugging
    if (adminId) {
      try {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminId, action_type: 'trial_approved',
          target_user_id: userId, target_user_name: record.full_name,
          details: {
            trial_request_id: requestId,
            email: record.email,
            duration_days: durationDays,
            ip_address: record.ip_address,
            access_starts_at: now.toISOString(),
            access_ends_at: expiresAt.toISOString(),
            admin_notes: adminNotes,
            request_payload: { requestId, durationDays, adminNotes, adminId },
          },
        });
      } catch (e) { console.error('audit log failed:', e); }
    }

    // Send approval email
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_KEY) {
      const expiryStr = expiresAt.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const firstName = record.full_name.split(' ')[0];
      const html = `
<div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;padding:28px;text-align:center">
    <h1 style="color:white;font-family:'Sora',sans-serif;font-size:24px;margin:0">🚀 Your Trial is Live!</h1>
  </div>
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0;margin-top:16px">
    <p style="font-size:16px;color:#0f172a;margin:0 0 12px">Hey ${firstName},</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Your Shikshantaram OS trial access is active right now. I've personally reviewed your request and I'm excited to see what you build.</p>
    <div style="background:#f8fafc;border-radius:10px;padding:18px;margin:20px 0;border-left:3px solid #7c3aed">
      <div style="font-family:'Sora',sans-serif;font-weight:800;font-size:13px;color:#0f172a;margin-bottom:8px">Your Trial Details</div>
      <table style="width:100%;font-size:13px;color:#475569">
        <tr><td style="padding:4px 0">Access</td><td style="text-align:right;font-weight:700;color:#0f172a">${durationDays} days</td></tr>
        <tr><td style="padding:4px 0">Expires</td><td style="text-align:right;font-weight:700;color:#0f172a">${expiryStr}</td></tr>
        <tr><td style="padding:4px 0">Free Credits</td><td style="text-align:right;font-weight:700;color:#059669">100 (ready to use)</td></tr>
        <tr><td style="padding:4px 0">Login Email</td><td style="text-align:right;font-weight:700;color:#0f172a">${record.email}</td></tr>
      </table>
    </div>
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:10px;padding:18px;margin:16px 0;border:1px dashed #f59e0b">
      <div style="font-family:'Sora',sans-serif;font-weight:800;font-size:13px;color:#78350f;margin-bottom:10px">🔐 Your Login Credentials</div>
      <table style="width:100%;font-size:13px;color:#78350f">
        <tr><td style="padding:4px 0">Email</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#0f172a">${record.email}</td></tr>
        <tr><td style="padding:4px 0">Temporary Password</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#0f172a;letter-spacing:0.5px">${tempPassword}</td></tr>
      </table>
      <p style="font-size:11px;color:#92400e;margin:10px 0 0;line-height:1.5">⚠ Please change this password after your first login from <b>My Profile → Security</b>.</p>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.7">Start with <b>Niche Clarity</b> to find your perfect niche, then move to <b>Product Navigator</b>. Your first product idea is 15 minutes away.</p>
    <div style="text-align:center;margin:28px 0 16px">
      <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px">Start Using Shikshantaram OS →</a>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:16px">Questions? WhatsApp me directly: <a href="https://wa.me/918933966250" style="color:#7c3aed">+91 89339 66250</a></p>
    <p style="font-size:13px;color:#475569;margin-top:24px">— Abhinav<br/><span style="font-size:11px;color:#94a3b8">Founder, Shikshantaram OS</span></p>
  </div>
</div>`;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Abhinav from Shikshantaram OS <trial@shikshantaram.in>',
            to: record.email,
            subject: `✅ Your Shikshantaram OS Trial is LIVE — ${durationDays} days starts now`,
            html,
          }),
        });
      } catch (e) {
        console.error('Resend approval email failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId, expiresAt: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('approve-trial-user error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
