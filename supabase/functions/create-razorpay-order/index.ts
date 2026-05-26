import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized } from '../_shared/auth.ts';

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

// Custom-amount limits — keep in sync with src/config/topup.ts
const MIN_CUSTOM_AMOUNT = 10;
const MAX_CUSTOM_AMOUNT = 100000;
const CUSTOM_CREDIT_RATIO = 1;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Identity must come from JWT — never trust client-supplied userId/userEmail.
  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(corsHeaders);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();
    const { packIndex, customAmount } = body;
    const userId = caller.userId;
    const userEmail = caller.email;

    let amountInr: number;
    let credits: number;
    let bonus: number;
    let label: string;
    let source: 'tier_topup' | 'custom_topup';

    // Branch on input shape: customAmount takes priority when present.
    if (customAmount !== undefined && customAmount !== null) {
      const amt = Number(customAmount);
      if (!Number.isInteger(amt) || amt < MIN_CUSTOM_AMOUNT || amt > MAX_CUSTOM_AMOUNT) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Amount must be an integer between ₹${MIN_CUSTOM_AMOUNT} and ₹${MAX_CUSTOM_AMOUNT}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      amountInr = amt;
      credits = amt * CUSTOM_CREDIT_RATIO;
      bonus = 0;
      label = 'Custom';
      source = 'custom_topup';
    } else {
      const pack = PACKS[packIndex];
      if (!pack) throw new Error('Invalid pack');
      amountInr = pack.amountInr;
      credits = pack.credits;
      bonus = pack.bonus;
      label = pack.label;
      source = 'tier_topup';
    }

    const totalCredits = credits + bonus;
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
        amount: amountInr * 100,
        currency: 'INR',
        receipt: `cr_${String(userId).replace(/-/g, '').slice(0, 16)}_${Date.now()}`.slice(0, 40),
        notes: {
          user_id: userId,
          pack_label: label,
          credits: totalCredits.toString(),
          source,
        },
      }),
    });

    if (!rzpRes.ok) throw new Error(`Razorpay error: ${await rzpRes.text()}`);
    const rzpOrder = await rzpRes.json();

    await supabase.from('razorpay_orders').insert({
      user_id: userId,
      user_email: userEmail,
      razorpay_order_id: rzpOrder.id,
      amount_inr: amountInr,
      credits_to_add: credits,
      bonus_credits: bonus,
      status: 'created',
    });

    return new Response(JSON.stringify({
      success: true,
      orderId: rzpOrder.id,
      amount: amountInr * 100,
      currency: 'INR',
      keyId: RZP_KEY,
      totalCredits,
      pack: { amountInr, credits, bonus, label },
      source,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
