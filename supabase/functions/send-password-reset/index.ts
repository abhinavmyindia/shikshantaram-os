import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logEmailDelivery } from '../_shared/email-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

async function findUserByEmail(supabase: any, email: string) {
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u: any) => (u.email || '').trim().toLowerCase() === email);
    if (found) return found;
    if (users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email : '';
    const userId = typeof body.user_id === 'string' ? body.user_id : '';
    const isAdminRequest = !!userId;
    if (!email && !userId) throw new Error('Email or user_id is required');

    const cleanEmail = email.trim().toLowerCase();

    if (isAdminRequest) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return json({ sent: false, error: 'Unauthorized' }, 401);

      const callerClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: caller } } = await callerClient.auth.getUser();
      if (!caller) return json({ sent: false, error: 'Unauthorized' }, 401);

      const { data: callerAdmin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', caller.id)
        .maybeSingle();
      if (!callerAdmin) return json({ sent: false, error: 'Not an admin' }, 403);
    }

    // Check if user exists. Admin requests use the exact user id so all users
    // work, even when they are beyond the first auth list page.
    const authUser = userId
      ? (await supabase.auth.admin.getUserById(userId)).data?.user
      : await findUserByEmail(supabase, cleanEmail);

    if (!authUser) {
      // Don't reveal if email exists
      return isAdminRequest ? json({ sent: false, error: 'User not found' }, 404) : json({ sent: true });
    }

    const targetEmail = (authUser.email || cleanEmail).trim().toLowerCase();
    if (!targetEmail) return json({ sent: false, error: 'User email not found' }, 400);

    // Check if approved
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, access_tier')
      .eq('id', authUser.id)
      .maybeSingle();

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    const isApproved = !!adminRow || (!!profile && profile.access_tier !== 'revoked');

    if (!isApproved && !isAdminRequest) {
      return json({ sent: true });
    }

    // Generate reset link — strip trailing slash to prevent double-slash URLs
    const APP_URL = (Deno.env.get('APP_URL') || 'https://os.shikshantaram.in').replace(/\/+$/, '');

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || 'Failed to generate reset link');
    }

    const resetLink = linkData.properties.action_link;

    // Send via Resend
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_KEY) throw new Error('RESEND_API_KEY not configured');

    const userName = escapeHtml(authUser.user_metadata?.full_name || targetEmail.split('@')[0]);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Shikshantaram OS <reset@shikshantaram.in>',
        to: targetEmail,
        subject: '🔐 Reset Your Shikshantaram OS Password',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f5f3ff;font-family:'Segoe UI',Arial,sans-serif"><div style="max-width:520px;margin:0 auto;padding:40px 20px"><div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 24px;text-align:center"><div style="font-size:32px;margin-bottom:8px">🎓</div><div style="color:white;font-size:18px;font-weight:800;letter-spacing:-0.02em">Shikshantaram OS</div><div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px">Password Reset Request</div></div><div style="padding:32px 28px"><p style="font-size:15px;color:#1e293b;margin:0 0 16px">Hi ${userName} 👋</p><p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">We received a request to reset your password for your Shikshantaram OS account. Click the button below to set a new password.</p><div style="text-align:center;margin:28px 0"><a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700">🔐 Reset My Password</a></div><div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:24px 0"><p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 4px">⚠️ Important</p><p style="font-size:12px;color:#a16207;line-height:1.6;margin:0">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.</p></div><div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-top:16px"><p style="font-size:11px;color:#94a3b8;line-height:1.5;margin:0">If the button doesn't work, copy and paste this link:<br><a href="${resetLink}" style="color:#7c3aed;word-break:break-all;font-size:11px">${resetLink}</a></p></div></div><div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #f1f5f9"><p style="font-size:11px;color:#94a3b8;margin:0">© 2025 Shikshantaram OS · os.shikshantaram.in<br>This email was sent to ${targetEmail}</p></div></div></div></body></html>`,
      }),
    });

    let providerId: string | null = null;
    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      await logEmailDelivery({
        email_type: 'password_reset',
        recipient_email: targetEmail,
        recipient_user_id: authUser.id,
        status: 'failed',
        error_message: `Resend ${emailRes.status}: ${errBody}`.slice(0, 1000),
        context: isAdminRequest ? 'admin_initiated' : 'self_serve',
      });
      throw new Error(`Resend failed: ${errBody}`);
    }
    try {
      const j = await emailRes.json();
      providerId = j?.id || null;
    } catch { /* ignore */ }

    await logEmailDelivery({
      email_type: 'password_reset',
      recipient_email: targetEmail,
      recipient_user_id: authUser.id,
      status: 'sent',
      provider_message_id: providerId,
      context: isAdminRequest ? 'admin_initiated' : 'self_serve',
    });

    return json({ sent: true, user_id: authUser.id, email: targetEmail, sent_at: new Date().toISOString() });

  } catch (err: any) {
    console.error('send-password-reset error:', err);
    return json({ sent: false, error: err.message }, 500);
  }
});
