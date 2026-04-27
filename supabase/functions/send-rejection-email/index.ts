import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (s: string) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const RESEND = Deno.env.get('RESEND_API_KEY');
    if (!RESEND) throw new Error('RESEND_API_KEY not configured');

    const { email, fullName, reason } = await req.json();
    if (!email || typeof email !== 'string') throw new Error('email is required');

    const firstName = escapeHtml((fullName || 'there').split(' ')[0]);
    const safeReason = reason ? escapeHtml(String(reason)) : null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:'DM Sans',Arial,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#0f172a,#334155);padding:24px 28px;">
      <div style="font-family:Sora,sans-serif;font-weight:900;font-size:18px;color:white;">Shikshantaram OS</div>
    </div>
    <div style="padding:28px;color:#0f172a;">
      <h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;margin:0 0 14px;">Hi ${firstName},</h2>
      <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 16px;">
        Thank you for your interest in Shikshantaram OS. After reviewing your request,
        we're not able to offer access at this time.
      </p>
      ${safeReason ? `
      <div style="background:#f8fafc;border-left:3px solid #94a3b8;border-radius:8px;padding:14px 16px;margin:0 0 18px;">
        <p style="margin:0;font-size:13.5px;color:#334155;line-height:1.6;font-style:italic;">${safeReason}</p>
      </div>` : ''}
      <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 22px;">
        If you'd like to discuss this further or reapply in the future, feel free to reach out on WhatsApp.
      </p>
      <a href="https://wa.me/919999999999"
         style="display:inline-block;background:#25d366;color:white;padding:11px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">
        Contact Us on WhatsApp →
      </a>
      <p style="font-size:13px;color:#64748b;margin:28px 0 0;line-height:1.6;">
        — Abhinav, Founder<br/>Shikshantaram OS
      </p>
    </div>
  </div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND}` },
      body: JSON.stringify({
        from: 'Abhinav from Shikshantaram OS <auth@shikshantaram.in>',
        to: [email],
        subject: 'Your Shikshantaram OS access request',
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.message || 'Failed to send email', detail: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true, id: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
