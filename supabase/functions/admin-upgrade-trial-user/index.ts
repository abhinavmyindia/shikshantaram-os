import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized, forbidden } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth: must be an authenticated team member. adminId is derived from JWT.
  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(corsHeaders);
  if (!caller.isAdmin) return forbidden(corsHeaders, 'Admin access required');
  const adminId = caller.userId;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const { userId, newTier, paymentRecorded, amountPaid, notes, sendEmail } = await req.json();
    if (!userId || !newTier) {
      return new Response(JSON.stringify({ error: 'userId and newTier are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const validTiers = ['basic', 'premium', 'beta'];
    if (!validTiers.includes(newTier)) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updatePayload: Record<string, any> = {
      access_tier: newTier,
      is_trial: false,
      trial_ends_at: new Date().toISOString(),
      payment_status: paymentRecorded ? 'paid' : 'pending',
      payment_amount: paymentRecorded ? (amountPaid || 0) : 0,
      updated_at: new Date().toISOString(),
    };
    if (notes && notes.trim()) updatePayload.notes = notes.trim();

    await supabase.from('user_profiles').update(updatePayload).eq('id', userId);

    // Mirror to trial_requests
    if (profile.trial_request_id) {
      await supabase.from('trial_requests').update({
        status: 'upgraded',
        upgraded_at: new Date().toISOString(),
        upgraded_to_tier: newTier,
        payment_status: paymentRecorded ? 'paid' : 'pending',
        payment_amount: paymentRecorded ? (amountPaid || 0) : 0,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.trial_request_id);
    }

    // Welcome bonus 500 credits
    try {
      const { data: cur } = await supabase.from('user_credits')
        .select('balance, lifetime_topped').eq('user_id', userId).maybeSingle();
      const bonus = 500;
      const newBalance = (cur?.balance || 0) + bonus;
      const newTopped = (cur?.lifetime_topped || 0) + bonus;
      if (cur) {
        await supabase.from('user_credits').update({
          balance: newBalance, lifetime_topped: newTopped, updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
      } else {
        await supabase.from('user_credits').insert({
          user_id: userId, balance: bonus, lifetime_topped: bonus,
        });
      }
      await supabase.from('credit_transactions').insert({
        user_id: userId, type: 'gift',
        amount: bonus, balance_after: newBalance,
        description: `Upgrade bonus — welcome to ${newTier} tier`,
      });
    } catch (creditErr) {
      console.warn('Upgrade bonus grant failed (non-blocking):', creditErr);
    }

    // Send upgrade email
    if (sendEmail !== false) {
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const u = users.find((x: any) => x.id === userId);
        if (u?.email) {
          await supabase.functions.invoke('send-upgrade-email', {
            body: { email: u.email, fullName: profile.full_name, tier: newTier },
          });
        }
      } catch (e) {
        console.warn('upgrade email failed', e);
      }
    }

    return new Response(JSON.stringify({ success: true, newTier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
