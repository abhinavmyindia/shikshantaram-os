import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const payload = JSON.parse(body);

    // Verify webhook signature — REQUIRED. Fail closed if not configured.
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }
    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expected = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    if (expected !== signature) {
      return new Response('Invalid signature', { status: 400 });
    }

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      const { data: order } = await supabase
        .from('razorpay_orders').select('*')
        .eq('razorpay_order_id', orderId).single();

      if (!order || order.status === 'paid') {
        return new Response('OK', { status: 200 });
      }

      const totalCredits = order.credits_to_add + order.bonus_credits;

      await supabase.rpc('add_user_credits', {
        p_user_id: order.user_id,
        p_amount: totalCredits,
        p_type: 'topup',
        p_description: `Top-up: ₹${order.amount_inr} → ${totalCredits} credits`,
        p_razorpay_order_id: orderId,
        p_razorpay_payment_id: paymentId,
      });

      await supabase.from('razorpay_orders')
        .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
        .eq('razorpay_order_id', orderId);

      // Send receipt email
      try {
        const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
        const APP_URL = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';
        if (RESEND_KEY && order.user_email) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Shikshantaram OS <noreply@shikshantaram.in>',
              to: order.user_email,
              subject: `✅ ${totalCredits} credits added to your account`,
              html: `<div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
                <div style="text-align:center;padding:24px 0">
                  <h1 style="font-size:24px;color:#1e293b">🎉 Credits Added!</h1>
                </div>
                <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
                  <p style="color:#475569;font-size:15px">Your account has been topped up.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Credits added</td><td style="text-align:right;font-weight:700;color:#059669;font-size:15px">+${totalCredits} credits</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Amount paid</td><td style="text-align:right;font-weight:700;color:#1e293b;font-size:15px">₹${order.amount_inr}</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Payment ID</td><td style="text-align:right;font-size:12px;color:#94a3b8">${paymentId}</td></tr>
                  </table>
                  ${order.bonus_credits > 0 ? `<p style="background:#f0fdf4;padding:12px;border-radius:8px;text-align:center;color:#059669;font-weight:600;font-size:14px">🎁 Includes ${order.bonus_credits} bonus credits!</p>` : ''}
                  <a href="${APP_URL}" style="display:block;text-align:center;background:#7c3aed;color:white;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px;font-size:15px">Start Using Your Credits →</a>
                </div>
                <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:24px">© Shikshantaram OS · os.shikshantaram.in</p>
              </div>`,
            }),
          });
        }
      } catch (_) { /* email failure is non-critical */ }
    }

    return new Response('OK', { status: 200 });

  } catch (err: any) {
    console.error('verify-razorpay-payment error:', err);
    return new Response('Error', { status: 500 });
  }
});
