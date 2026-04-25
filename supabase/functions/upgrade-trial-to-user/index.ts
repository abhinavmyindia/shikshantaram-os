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
    const requestId = String(body.requestId ?? '').trim();
    const newTier = String(body.newTier ?? '').trim();
    const adminNotes = body.adminNotes ? String(body.adminNotes) : null;
    const adminId = body.adminId ? String(body.adminId) : null;
    const paymentAmount = Number.isFinite(Number(body.paymentAmount)) ? Number(body.paymentAmount) : 0;

    if (!requestId) throw new Error('requestId is required.');
    if (!['basic', 'premium', 'beta'].includes(newTier)) {
      throw new Error('newTier must be basic, premium, or beta.');
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
    if (!record.user_id) throw new Error('No user account linked to this trial.');

    // Upgrade profile
    await supabase
      .from('user_profiles')
      .update({
        access_tier: newTier,
        is_trial_user: false,
        trial_ends_at: null,
        is_beta_user: newTier === 'beta',
        payment_status: 'paid',
        payment_amount: paymentAmount,
        notes: adminNotes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.user_id);

    // Mark trial as upgraded
    await supabase
      .from('trial_requests')
      .update({
        status: 'upgraded',
        upgraded_at: new Date().toISOString(),
        upgraded_to_tier: newTier,
        payment_status: 'paid',
        payment_amount: paymentAmount,
        admin_notes: adminNotes ?? record.admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Bonus 500 credits
    await supabase.rpc('add_user_credits', {
      p_user_id: record.user_id,
      p_amount: 500,
      p_type: 'gift',
      p_description: `Upgrade bonus — welcome to ${newTier} tier`,
    });

    // Audit log (best-effort)
    if (adminId) {
      try {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminId, action_type: 'trial_upgraded',
          target_user_id: record.user_id, target_user_name: record.full_name,
          details: { trial_request_id: requestId, new_tier: newTier, payment_amount: paymentAmount, email: record.email, ip_address: record.ip_address, admin_notes: adminNotes },
        });
      } catch (e) { console.error('audit log failed:', e); }
    }

    // Send upgrade email
    const tierLabel = newTier.charAt(0).toUpperCase() + newTier.slice(1);
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_KEY) {
      const firstName = record.full_name.split(' ')[0];
      const html = `
<div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
  <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;padding:28px;text-align:center">
    <h1 style="color:white;font-family:'Sora',sans-serif;font-size:24px;margin:0">🎉 Your Access is Upgraded!</h1>
  </div>
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0;margin-top:16px">
    <p style="font-size:16px;color:#0f172a;margin:0 0 12px">Hey ${firstName},</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Big news — your Shikshantaram OS access has been upgraded to <b>${tierLabel}</b>. No more trial limits. The full platform is yours.</p>
    <div style="background:#f0fdf4;border-radius:10px;padding:18px;margin:20px 0;border-left:3px solid #10b981">
      <div style="font-family:'Sora',sans-serif;font-weight:800;font-size:13px;color:#0f172a;margin-bottom:8px">What Changed</div>
      <ul style="font-size:13px;color:#475569;padding-left:18px;margin:0;line-height:1.9">
        <li>Unlimited access — all 4 tools unlocked</li>
        <li>No expiry date — your account is permanent</li>
        <li>500 bonus credits added to your account</li>
        <li>Priority support on WhatsApp</li>
      </ul>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.7">Everything you built during your trial — your saved ideas, research, offers — it's all still there.</p>
    <div style="text-align:center;margin:28px 0 16px">
      <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px">Open Shikshantaram OS →</a>
    </div>
    <p style="font-size:13px;color:#475569;margin-top:24px">Thank you for believing in this — genuinely.<br/>— Abhinav<br/><span style="font-size:11px;color:#94a3b8">Founder, Shikshantaram OS</span></p>
  </div>
</div>`;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Abhinav from Shikshantaram OS <trial@shikshantaram.in>',
            to: record.email,
            subject: `🎉 Your access has been upgraded — Welcome to ${tierLabel}`,
            html,
          }),
        });
      } catch (e) {
        console.error('Resend upgrade email failed:', e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('upgrade-trial-to-user error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
