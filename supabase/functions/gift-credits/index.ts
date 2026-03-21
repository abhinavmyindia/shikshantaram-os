import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user: adminUser } } = await anonClient.auth.getUser(token);
    if (!adminUser) throw new Error('Unauthorized');

    const { data: adminRow } = await supabase
      .from('admin_users').select('role').eq('user_id', adminUser.id).single();
    if (!adminRow) throw new Error('Not an admin');

    const { targetUserId, amount, reason } = await req.json();
    if (!targetUserId || !amount || amount <= 0) throw new Error('targetUserId and amount required');

    const { data: result } = await supabase.rpc('add_user_credits', {
      p_user_id: targetUserId,
      p_amount: amount,
      p_type: 'gift',
      p_description: reason || 'Gift from admin',
      p_gifted_by: adminUser.id,
    });

    return new Response(JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
