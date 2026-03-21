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

    // 1. Check GLOBAL enforcement mode
    const { data: globalSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'credits_enforcement_mode')
      .single();

    const globalMode = globalSetting?.value || 'shadow';

    // Get pricing and balance (needed for all modes for tracking)
    const { data: pricing } = await supabase
      .from('credit_pricing')
      .select('credits, display_name')
      .eq('tool_module', toolModule)
      .eq('call_type', callType)
      .eq('is_active', true)
      .single();

    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const cost = pricing?.credits ?? 0;
    const balance = credits?.balance ?? 0;

    // If global is shadow → everyone bypasses
    if (globalMode === 'shadow') {
      return new Response(JSON.stringify({
        hasCredits: true,
        balance,
        cost,
        displayName: pricing?.display_name ?? callType,
        balanceAfter: balance - cost,
        enforcement: 'shadow',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Global is enforced — check per-user setting
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('credits_enforcement')
      .eq('id', userId)
      .single();

    const userEnforcement = userProfile?.credits_enforcement || 'shadow';

    // Per-user shadow or exempt → bypass gates
    if (userEnforcement === 'shadow' || userEnforcement === 'exempt') {
      return new Response(JSON.stringify({
        hasCredits: true,
        balance,
        cost,
        displayName: pricing?.display_name ?? callType,
        balanceAfter: balance - cost,
        enforcement: userEnforcement,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Fully enforced — normal credit check
    const hasCredits = balance >= cost;

    return new Response(JSON.stringify({
      hasCredits,
      balance,
      cost,
      displayName: pricing?.display_name ?? callType,
      balanceAfter: hasCredits ? balance - cost : balance,
      enforcement: 'enforced',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ hasCredits: true, balance: 0, cost: 0, displayName: '', balanceAfter: 0, enforcement: 'shadow', error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
