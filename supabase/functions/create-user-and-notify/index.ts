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
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    // Verify caller auth
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: adminRow } = await adminClient.from('admin_users').select('user_id').eq('user_id', caller.id).single();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Not an admin' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, full_name, phone, temp_password, access_tier, payment_status, payment_amount, is_beta_user, notes } = await req.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // 1. Create auth user — if exists, locate them and reset their password
    let userId: string | null = null;
    let wasExisting = false;

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: temp_password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authData?.user?.id) {
      userId = authData.user.id;
    } else if (authError && (authError.message || '').toLowerCase().includes('already')) {
      // User already exists — paginate to find them, then update password so the
      // shared temp_password in the welcome email actually works.
      wasExisting = true;
      let page = 1;
      while (page <= 25 && !userId) {
        const { data: list } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
        const users = list?.users || [];
        const found = users.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);
        if (found) {
          userId = found.id;
          await adminClient.auth.admin.updateUserById(found.id, {
            password: temp_password,
            email_confirm: true,
          });
          break;
        }
        if (users.length < 200) break;
        page++;
      }
      if (!userId) {
        return new Response(JSON.stringify({
          success: false, error: `User exists in auth but could not be located: ${normalizedEmail}`,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Update profile with admin's selected tier
    const profileData = {
      full_name,
      phone: phone || '',
      access_tier: access_tier || 'basic',
      payment_status: payment_status || 'reserved',
      payment_amount: payment_amount || 0,
      is_beta_user: is_beta_user || false,
      notes: notes || '',
      added_by: 'admin',
    };

    let { data: updateData, error: updateError } = await adminClient
      .from('user_profiles')
      .update(profileData)
      .eq('id', userId)
      .select('access_tier')
      .single();

    if (updateError || !updateData) {
      await new Promise(r => setTimeout(r, 500));
      const retry = await adminClient
        .from('user_profiles')
        .update(profileData)
        .eq('id', userId)
        .select('access_tier')
        .single();

      if (retry.error || !retry.data) {
        await adminClient.from('user_profiles').upsert({ id: userId, ...profileData });
        console.log('[create-user] Used upsert fallback for', normalizedEmail, 'tier:', access_tier);
      } else {
        console.log('[create-user] Retry update succeeded for', normalizedEmail, 'tier:', retry.data.access_tier);
      }
    } else {
      console.log('[create-user] Update succeeded for', normalizedEmail, 'tier:', updateData.access_tier);
    }

    // 3. Send welcome email via Resend — ALWAYS, even if user pre-existed
    const tierLabel = access_tier === 'premium' ? 'Premium' : access_tier === 'beta' ? 'Beta' : 'Basic';
    const toolsLine = access_tier === 'basic'
      ? 'You have access to Niche Clarity and Product Navigator.'
      : access_tier === 'beta'
      ? 'You have full Beta access to all tools — including early previews.'
      : 'You have full Premium access to all tools as they unlock.';
    const appUrl = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';
    const greetingLine = wasExisting
      ? `Your Shikshantaram OS access has been approved and is now active. Your password has been reset — please use the credentials below to log in.`
      : `Your access has been approved and your Shikshantaram OS account is now live. Here are your login credentials:`;

    const html = `
      <div style="max-width:520px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 28px;text-align:center;">
          <div style="font-size:24px;font-weight:900;color:white;letter-spacing:-0.02em;">Shikshantaram OS</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">${tierLabel} Access</div>
        </div>
        <div style="padding:28px;">
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">You're in, ${full_name}! 🎉</h2>
          <p style="font-size:14px;color:#475569;line-height:1.7;">${greetingLine}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;">
            <tr>
              <td style="padding:14px 16px 10px 16px;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</span><br/>
                <span style="font-size:15px;color:#0f172a;font-weight:700;">${normalizedEmail}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 16px 14px 16px;">
                <span style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Password</span><br/>
                <span style="font-size:15px;color:#0f172a;font-weight:700;font-family:monospace;">${temp_password}</span>
              </td>
            </tr>
          </table>
          <div style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:10px;padding:14px 16px;margin:16px 0;">
            <div style="font-size:13px;font-weight:700;color:#7c3aed;">🔓 Your Access</div>
            <div style="font-size:13px;color:#475569;margin-top:4px;">${toolsLine}</div>
          </div>
          <a href="${appUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:14px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;margin:20px 0;">🚀 Log In to Shikshantaram OS →</a>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">⚠ Please change your password after your first login from My Profile → Security.</p>
        </div>
      </div>`;

    let emailSent = false;
    let emailError: string | null = null;
    let emailId: string | null = null;
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Shikshantaram OS <auth@shikshantaram.in>",
          to: [normalizedEmail],
          subject: `🎉 Your Shikshantaram OS ${tierLabel} Access is Live!`,
          html,
        }),
      });
      const emailResult = await emailRes.json();
      console.log("Resend response:", emailRes.status, JSON.stringify(emailResult));
      if (emailRes.ok && emailResult?.id) {
        emailSent = true;
        emailId = emailResult.id;
      } else {
        emailError = emailResult?.message || emailResult?.error || `Resend status ${emailRes.status}`;
      }
    } catch (e: any) {
      emailError = e?.message || 'Unknown email send failure';
      console.error('[create-user] email send threw:', emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      userId,
      temp_password,
      already_exists: wasExisting,
      email_sent: emailSent,
      email_error: emailError,
      email_id: emailId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
