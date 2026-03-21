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
    const { userId, toolModule, callType } = await req.json();

    const { data: pricing } = await supabase
      .from('credit_pricing')
      .select('credits, display_name')
      .eq('tool_module', toolModule)
      .eq('call_type', callType)
      .eq('is_active', true)
      .single();

    const cost = pricing?.credits ?? 0;

    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const balance = credits?.balance ?? 0;
    const hasCredits = balance >= cost;

    return new Response(JSON.stringify({
      hasCredits,
      balance,
      cost,
      displayName: pricing?.display_name ?? callType,
      balanceAfter: hasCredits ? balance - cost : balance,
      enforcement: 'shadow',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ hasCredits: true, balance: 0, cost: 0, displayName: '', balanceAfter: 0, enforcement: 'shadow', error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
