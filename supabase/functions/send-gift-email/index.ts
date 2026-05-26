import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logEmailDelivery } from '../_shared/email-log.ts';
import { verifyCaller, unauthorized, forbidden } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, fullName, credits, reason } = await req.json();
    if (!email || !credits) {
      return new Response(JSON.stringify({ error: 'email and credits are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const APP_URL = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';
    const firstName = String(fullName || 'there').split(' ')[0];
    const safeReason = (reason || '').toString().trim();

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:white;border-radius:20px;padding:36px 28px;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;line-height:1;margin-bottom:10px;">🎁</div>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0;">${credits} Free Credits Added!</h1>
      </div>
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 12px;">Hey ${firstName},</p>
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
        We've just added <strong>${credits} free credits</strong> to your Shikshantaram OS account.
        ${safeReason ? `<br/><br/><strong>Reason:</strong> ${safeReason}` : ''}
      </p>
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;border-radius:14px;padding:18px;text-align:center;margin:20px 0;">
        <div style="font-size:24px;font-weight:900;">⚡ +${credits} credits</div>
        <div style="font-size:13px;opacity:0.85;margin-top:4px;">Ready to use right now</div>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${APP_URL}" style="display:inline-block;background:#0f172a;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;">Use Your Credits →</a>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">— Abhinav<br/>Founder, Shikshantaram OS</p>
    </div>
  </div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Abhinav from Shikshantaram OS <noreply@shikshantaram.in>',
        to: email,
        subject: `🎁 You've received ${credits} free credits on Shikshantaram OS`,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      await logEmailDelivery({
        email_type: 'gift_credits',
        recipient_email: email,
        status: 'failed',
        error_message: `Resend ${res.status}: ${txt}`.slice(0, 1000),
        context: 'gift_credits',
        metadata: { credits, reason: reason || null },
      });
      return new Response(JSON.stringify({ error: `Resend error: ${txt}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let giftProviderId: string | null = null;
    try { const j = await res.json(); giftProviderId = j?.id || null; } catch { /* ignore */ }

    await logEmailDelivery({
      email_type: 'gift_credits',
      recipient_email: email,
      status: 'sent',
      provider_message_id: giftProviderId,
      context: 'gift_credits',
      metadata: { credits, reason: reason || null },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
