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
    const { userId, toolModule, callType, aiUsageLogId } = await req.json();

    const { data: pricing } = await supabase
      .from('credit_pricing')
      .select('credits, display_name')
      .eq('tool_module', toolModule)
      .eq('call_type', callType)
      .single();

    if (!pricing) {
      return new Response(JSON.stringify({ success: true, deducted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data } = await supabase.rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: pricing.credits,
      p_description: pricing.display_name,
      p_tool_module: toolModule,
      p_call_type: callType,
    });

    if (aiUsageLogId && data?.success) {
      await supabase
        .from('credit_transactions')
        .update({ ai_usage_log_id: aiUsageLogId })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return new Response(JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
