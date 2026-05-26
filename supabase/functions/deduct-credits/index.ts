import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized, forbidden } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(corsHeaders);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const { userId: bodyUserId, toolModule, callType, aiUsageLogId, idempotencyKey } = await req.json();
    // Users may only deduct from their own balance unless they are admins.
    if (bodyUserId && bodyUserId !== caller.userId && !caller.isAdmin) {
      return forbidden(corsHeaders, 'Cannot deduct credits from another user');
    }
    const userId = caller.isAdmin && bodyUserId ? bodyUserId : caller.userId;

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

    // Check global enforcement mode
    const { data: globalSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'credits_enforcement_mode')
      .single();

    const globalMode = globalSetting?.value || 'shadow';

    // Check per-user enforcement
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('credits_enforcement')
      .eq('id', userId)
      .single();

    const userEnforcement = userProfile?.credits_enforcement || 'shadow';
    const isExempt = userEnforcement === 'exempt';
    const isShadow = globalMode === 'shadow' || userEnforcement === 'shadow';

    // Get current balance for logging
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (isExempt) {
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: 'shadow_deduction',
        amount: 0,
        balance_after: credits?.balance ?? 0,
        description: `[EXEMPT] ${pricing.display_name}`,
        tool_module: toolModule,
        call_type: callType,
      });

      return new Response(JSON.stringify({ success: true, deducted: 0, mode: 'exempt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isShadow) {
      const { data } = await supabase.rpc('deduct_user_credits', {
        p_user_id: userId,
        p_amount: pricing.credits,
        p_description: `[SHADOW] ${pricing.display_name}`,
        p_tool_module: toolModule,
        p_call_type: callType,
        p_idempotency_key: idempotencyKey ? `shadow_${idempotencyKey}` : null,
      });

      if (data?.success) {
        await supabase
          .from('credit_transactions')
          .update({ type: 'shadow_deduction' })
          .eq('user_id', userId)
          .eq('type', 'deduction')
          .eq('description', `[SHADOW] ${pricing.display_name}`)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      if (aiUsageLogId && data?.success) {
        await supabase
          .from('credit_transactions')
          .update({ ai_usage_log_id: aiUsageLogId })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      return new Response(JSON.stringify({ success: true, deducted: pricing.credits, mode: 'shadow', newBalance: data?.new_balance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normal enforcement — standard deduction with idempotency
    const { data } = await supabase.rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: pricing.credits,
      p_description: pricing.display_name,
      p_tool_module: toolModule,
      p_call_type: callType,
      p_idempotency_key: idempotencyKey || null,
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
