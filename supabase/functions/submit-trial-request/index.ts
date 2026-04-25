import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const PAYMENT_LINK = 'https://rzp.io/rzp/osaccess';
const WHATSAPP_LINK = 'https://wa.me/918933966250';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    // Accept both camelCase and snake_case from clients
    const fullName = String(body.fullName ?? body.full_name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const isResend = body.resend === true;

    if (!fullName || !email || !phone) {
      return new Response(JSON.stringify({ error: 'All fields are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (fullName.length > 120 || email.length > 200 || phone.length > 30) {
      return new Response(JSON.stringify({ error: 'Input too long.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Check most recent request for this email
    const { data: existing } = await supabase
      .from('trial_requests')
      .select('id, status')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending' || existing.status === 'approved') {
        return new Response(
          JSON.stringify({
            error:
              'A request with this email already exists. Check your inbox or contact us on WhatsApp.',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (existing.status === 'expired') {
        return new Response(
          JSON.stringify({
            error: 'Your trial has expired — please complete payment to continue.',
            expired: true,
            paymentLink: PAYMENT_LINK,
            whatsapp: WHATSAPP_LINK,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // IP cross-check
    let ipFlagged = false;
    let flaggedEmails: string[] = [];
    if (ipAddress && ipAddress !== 'unknown') {
      const { data: sameIp } = await supabase
        .from('trial_requests')
        .select('email')
        .eq('ip_address', ipAddress)
        .neq('email', email)
        .limit(5);
      if (sameIp && sameIp.length > 0) {
        ipFlagged = true;
        flaggedEmails = sameIp.map((r: any) => r.email);
      }
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: trialRecord, error: insertErr } = await supabase
      .from('trial_requests')
      .insert({
        full_name: fullName,
        email,
        phone,
        ip_address: ipAddress,
        user_agent: userAgent,
        otp_code: otp,
        otp_expires_at: otpExpiry,
        status: 'pending',
        admin_notes: ipFlagged
          ? `⚠️ IP flagged: same IP used by other emails (${flaggedEmails.join(', ')})`
          : null,
      })
      .select('id')
      .single();

    if (insertErr) throw new Error(insertErr.message);

    // Send OTP via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const html = `
<div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
  <div style="text-align:center;padding:8px 0 24px">
    <h1 style="font-size:22px;color:#0f172a;margin:0">Verify your email</h1>
    <p style="color:#64748b;font-size:14px;margin:8px 0 0">Hi ${fullName.split(' ')[0]}, use this code to complete your trial registration.</p>
  </div>
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0;text-align:center">
    <div style="font-family:'Sora',sans-serif;font-weight:900;font-size:42px;letter-spacing:0.3em;color:#7c3aed;margin-bottom:8px">${otp}</div>
    <div style="color:#94a3b8;font-size:12px">Expires in 10 minutes</div>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px">If you didn't request this, ignore this email.</p>
  <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:8px">Shikshantaram OS — India's AI Product Creation Platform</p>
</div>`;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Shikshantaram OS Trial <trial@shikshantaram.in>',
            to: email,
            subject: `Your OTP for Shikshantaram OS Trial — ${otp}`,
            html,
          }),
        });
      } catch (e) {
        console.error('Resend OTP send failed:', e);
      }
    }

    return new Response(JSON.stringify({ success: true, requestId: trialRecord.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('submit-trial-request error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
