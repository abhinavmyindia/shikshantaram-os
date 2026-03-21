import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PACKS = [
  { amountInr: 500,  credits: 500,  bonus: 0,    label: 'Starter' },
  { amountInr: 1000, credits: 1000, bonus: 100,  label: 'Growth'  },
  { amountInr: 2000, credits: 2000, bonus: 400,  label: 'Pro'     },
  { amountInr: 5000, credits: 5000, bonus: 1500, label: 'Power'   },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const { userId, userEmail, packIndex } = await req.json();
    const pack = PACKS[packIndex];
    if (!pack) throw new Error('Invalid pack');

    const totalCredits = pack.credits + pack.bonus;
    const RZP_KEY = Deno.env.get('RAZORPAY_KEY_ID')!;
    const RZP_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    if (!RZP_KEY || !RZP_SECRET) throw new Error('Razorpay not configured');

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RZP_KEY}:${RZP_SECRET}`),
      },
      body: JSON.stringify({
        amount: pack.amountInr * 100,
        currency: 'INR',
        receipt: `credits_${userId}_${Date.now()}`,
        notes: { user_id: userId, pack_label: pack.label, credits: totalCredits.toString() },
      }),
    });

    if (!rzpRes.ok) throw new Error(`Razorpay error: ${await rzpRes.text()}`);
    const rzpOrder = await rzpRes.json();

    await supabase.from('razorpay_orders').insert({
      user_id: userId,
      user_email: userEmail,
      razorpay_order_id: rzpOrder.id,
      amount_inr: pack.amountInr,
      credits_to_add: pack.credits,
      bonus_credits: pack.bonus,
      status: 'created',
    });

    return new Response(JSON.stringify({
      success: true,
      orderId: rzpOrder.id,
      amount: pack.amountInr * 100,
      currency: 'INR',
      keyId: RZP_KEY,
      totalCredits,
      pack,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
