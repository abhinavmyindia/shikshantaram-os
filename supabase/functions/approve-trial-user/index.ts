import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized, forbidden } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const jsonResp = (status: number, body: any) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Auth: only team members can approve trial requests. adminId comes from JWT.
  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(corsHeaders);
  if (!caller.isAdmin) return forbidden(corsHeaders, 'Admin access required');

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId ?? body.trial_request_id ?? '').trim();
    const rawDuration = body.durationDays ?? body.duration_days ?? body.days;
    const durationDays = Number(rawDuration);
    const adminNotes = body.adminNotes ? String(body.adminNotes) : null;
    const adminId = caller.userId;

    if (!requestId) return jsonResp(400, { error: 'requestId is required.' });
    if (!Number.isFinite(durationDays) || ![2, 7, 14, 30].includes(durationDays)) {
      return jsonResp(400, { error: `Duration must be 2, 7, 14, or 30 days. Received: ${JSON.stringify(rawDuration)}` });
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

    if (recErr) return jsonResp(500, { error: `DB error: ${recErr.message}` });
    if (!record) return jsonResp(404, { error: 'Trial request not found.' });
    if (!record.otp_verified) return jsonResp(409, { error: 'Email not verified for this request.' });
    if (record.status === 'approved') return jsonResp(409, { error: 'This trial is already approved.' });
    if (record.status === 'upgraded') return jsonResp(409, { error: 'This user is already upgraded.' });

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
      // User already exists — paginate through admin list to locate them
      const target = record.email.toLowerCase();
      let page = 1;
      while (page <= 20 && !userId) {
        const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        const users = list?.users || [];
        const found = users.find((u: any) => u.email?.toLowerCase() === target);
        if (found) {
          userId = found.id;
          await supabase.auth.admin.updateUserById(found.id, { password: tempPassword });
          break;
        }
        if (users.length < 200) break;
        page++;
      }
      if (!userId) return jsonResp(404, { error: `Existing auth user not found for ${record.email}` });
    } else if (authErr) {
      return jsonResp(500, { error: `Auth user creation failed: ${authErr.message}` });
    }

    if (!userId) return jsonResp(500, { error: 'Could not resolve user ID after auth provisioning.' });

    // Upsert profile with trial flags — access_tier MUST be 'trial'
    await supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          full_name: record.full_name,
          phone: record.phone,
          access_tier: 'trial',
          is_trial: true,
          trial_ends_at: expiresAt.toISOString(),
          trial_started_at: now.toISOString(),
          trial_request_id: requestId,
          trial_source_tier: 'basic', // trial users start at basic scope
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      );

    // Credit allocation — overwrite to exactly 100. The starter-credits trigger
    // skips trial users, so this function is the single source of truth for trial credits.
    const { data: existingCredits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCredits) {
      await supabase.from('user_credits')
        .update({
          balance: 100,
          free_credits_given: 100,
          lifetime_topped: 100,
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await supabase.from('user_credits').insert({
        user_id: userId,
        balance: 100,
        lifetime_topped: 100,
        free_credits_given: 100,
      });
    }

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      user_email: record.email,
      type: 'promo',
      amount: 100,
      balance_after: 100,
      description: 'Trial starter credits — 100 total',
      tool_module: 'trial',
      call_type: 'starter_allocation',
    });

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
    let emailSent = false;
    let emailError: string | null = null;
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
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Abhinav from Shikshantaram OS <trial@shikshantaram.in>',
            to: record.email,
            subject: `✅ Your Shikshantaram OS Trial is LIVE — ${durationDays} days starts now`,
            html,
          }),
        });
        const result = await r.json();
        console.log('[approve-trial] Resend response:', r.status, JSON.stringify(result));
        if (r.ok && result?.id) {
          emailSent = true;
        } else {
          emailError = result?.message || result?.error || `Resend status ${r.status}`;
        }
      } catch (e: any) {
        emailError = e?.message || 'Email send threw';
        console.error('[approve-trial] Resend approval email failed:', emailError);
      }
    } else {
      emailError = 'RESEND_API_KEY not configured';
    }

    let trialProviderId: string | null = null;
    try {
      // best-effort: provider id is captured above only when r.ok — we already
      // logged via emailSent flag, so include null here when missing.
    } catch { /* noop */ }

    try {
      const { logEmailDelivery } = await import('../_shared/email-log.ts');
      await logEmailDelivery({
        email_type: 'trial_approval',
        recipient_email: record.email,
        recipient_user_id: userId,
        status: emailSent ? 'sent' : 'failed',
        error_message: emailError,
        provider_message_id: trialProviderId,
        triggered_by_user_id: adminId,
        context: 'trial_approved',
        metadata: { duration_days: durationDays, trial_request_id: requestId },
      });
    } catch (e) {
      console.error('[approve-trial] email log failed:', (e as any)?.message);
    }

    // SECURITY: never return tempPassword in the response — credential delivery
    // is handled exclusively via the approval email.
    return new Response(
      JSON.stringify({ success: true, userId, expiresAt: expiresAt.toISOString(), email_sent: emailSent, email_error: emailError }),
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
