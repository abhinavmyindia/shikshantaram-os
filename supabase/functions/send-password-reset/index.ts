import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const { email } = await req.json();
    if (!email) throw new Error('Email is required');

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find((u: any) => u.email === cleanEmail);

    if (!authUser) {
      // Don't reveal if email exists
      return new Response(JSON.stringify({ sent: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if approved
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, access_tier')
      .eq('id', authUser.id)
      .single();

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .single();

    const isApproved = !!adminRow || (!!profile && profile.access_tier !== 'revoked');

    if (!isApproved) {
      return new Response(JSON.stringify({ sent: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate reset link
    const APP_URL = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || 'Failed to generate reset link');
    }

    const resetLink = linkData.properties.action_link;

    // Send via Resend
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_KEY) throw new Error('RESEND_API_KEY not configured');

    const userName = authUser.user_metadata?.full_name || cleanEmail.split('@')[0];

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Shikshantaram OS <reset@shikshantaram.in>',
        to: cleanEmail,
        subject: '🔐 Reset Your Shikshantaram OS Password',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f5f3ff;font-family:'Segoe UI',Arial,sans-serif"><div style="max-width:520px;margin:0 auto;padding:40px 20px"><div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 24px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🎓</div><div style="color:white;font-size:18px;font-weight:800;letter-spacing:-0.02em">Shikshantaram OS</div><div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px">Password Reset Request</div></div><div style="padding:32px 28px"><p style="font-size:15px;color:#1e293b;margin:0 0 16px">Hi ${userName} 👋</p><p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">We received a request to reset your password for your Shikshantaram OS account. Click the button below to set a new password.</p><div style="text-align:center;margin:28px 0"><a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700">🔐 Reset My Password</a></div><div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:24px 0"><p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 4px">⚠️ Important</p><p style="font-size:12px;color:#a16207;line-height:1.6;margin:0">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.</p></div><div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-top:16px"><p style="font-size:11px;color:#94a3b8;line-height:1.5;margin:0">If the button doesn't work, copy and paste this link:<br><a href="${resetLink}" style="color:#7c3aed;word-break:break-all;font-size:11px">${resetLink}</a></p></div></div><div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #f1f5f9"><p style="font-size:11px;color:#94a3b8;margin:0">© 2025 Shikshantaram OS · app.shikshantaram.in<br>This email was sent to ${cleanEmail}</p></div></div></div></body></html>`,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend failed: ${errBody}`);
    }

    return new Response(JSON.stringify({ sent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('send-password-reset error:', err);
    return new Response(
      JSON.stringify({ sent: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
