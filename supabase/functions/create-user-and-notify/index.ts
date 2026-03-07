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

    const { email, full_name, phone, temp_password, access_tier, payment_status, payment_amount } = await req.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: temp_password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      const isDuplicateEmail = authError.message?.toLowerCase().includes('already been registered');
      if (isDuplicateEmail) {
        return new Response(JSON.stringify({
          success: false,
          already_exists: true,
          error: 'A user with this email address has already been registered',
          email: normalizedEmail,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = authData.user.id;

    // 2. Update the auto-created profile
    await adminClient.from('user_profiles').update({
      full_name,
      phone: phone || '',
      access_tier,
      payment_status,
      payment_amount: payment_amount || 0,
      added_by: 'admin',
    }).eq('id', userId);

    // 3. Send welcome email via Resend
    const tierLabel = access_tier === 'premium' ? 'Premium' : 'Basic';
    const toolsLine = access_tier === 'basic'
      ? 'You have access to Niche Clarity and Product Navigator.'
      : 'You have full Premium access to all tools as they unlock.';
    const appUrl = 'https://shikshantaram-os.lovable.app';

    const html = `
      <div style="max-width:520px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 28px;text-align:center;">
          <div style="font-size:24px;font-weight:900;color:white;letter-spacing:-0.02em;">Shikshantaram OS</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">${tierLabel} Access</div>
        </div>
        <div style="padding:28px;">
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">You're in, ${full_name}! 🎉</h2>
          <p style="font-size:14px;color:#475569;line-height:1.7;">Your payment has been verified and your Shikshantaram OS account is now live. Here are your login credentials:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;color:#64748b;font-weight:600;">Email</span>
              <span style="font-size:13px;color:#0f172a;font-weight:700;">${email}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
              <span style="font-size:13px;color:#64748b;font-weight:600;">Password</span>
              <span style="font-size:13px;color:#0f172a;font-weight:700;">${temp_password}</span>
            </div>
          </div>
          <div style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:10px;padding:14px 16px;margin:16px 0;">
            <div style="font-size:13px;font-weight:700;color:#7c3aed;">🔓 Your Access</div>
            <div style="font-size:13px;color:#475569;margin-top:4px;">${toolsLine}</div>
          </div>
          <a href="${appUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:14px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;margin:20px 0;">🚀 Log In to Shikshantaram OS →</a>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">⚠ Please change your password after your first login for security.</p>
        </div>
      </div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Shikshantaram OS <onboarding@resend.dev>",
        to: [email],
        subject: `🎉 Your Shikshantaram OS ${tierLabel} Access is Live!`,
        html,
      }),
    });

    return new Response(JSON.stringify({ success: true, userId, temp_password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
