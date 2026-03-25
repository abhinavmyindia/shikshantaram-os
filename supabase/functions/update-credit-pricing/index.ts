import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user: admin } } = await anonClient.auth.getUser(token);
    if (!admin) throw new Error('Unauthorized');

    const { data: adminRow } = await supabase
      .from('admin_users').select('role').eq('user_id', admin.id).single();
    if (!adminRow) throw new Error('Not an admin');

    const { toolModule, callType, newCredits, reason } = await req.json();

    if (!toolModule || !callType || newCredits === undefined)
      throw new Error('toolModule, callType, and newCredits are required');
    if (newCredits < 1 || newCredits > 500)
      throw new Error('Credit cost must be between 1 and 500');

    const { data: current } = await supabase
      .from('credit_pricing')
      .select('credits, display_name')
      .eq('tool_module', toolModule)
      .eq('call_type', callType)
      .single();

    if (!current) throw new Error('Pricing entry not found');

    const { error: updateErr } = await supabase
      .from('credit_pricing')
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq('tool_module', toolModule)
      .eq('call_type', callType);

    if (updateErr) throw updateErr;

    await supabase.from('price_change_log').insert({
      tool_module: toolModule, call_type: callType,
      display_name: current.display_name,
      old_credits: current.credits, new_credits: newCredits,
      changed_by: admin.id, changed_by_email: admin.email,
      reason: reason || null,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `${current.display_name} updated: ${current.credits} → ${newCredits} credits`,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
