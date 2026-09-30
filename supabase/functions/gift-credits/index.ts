import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
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
      .from('admin_users').select('role, is_owner').eq('user_id', adminUser.id).single();
    if (!adminRow) throw new Error('Not an admin');
    if (!adminRow.is_owner && !['admin', 'manager'].includes(adminRow.role)) throw new Error('Your role cannot gift credits');

    const { targetEmail, amount, reason } = await req.json();
    if (!targetEmail || !amount || amount <= 0) throw new Error('Email and amount are required');

    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw new Error('Could not fetch users');

    const targetUser = users.find(
      u => u.email?.toLowerCase() === targetEmail.trim().toLowerCase()
    );

    if (!targetUser) {
      return new Response(
        JSON.stringify({ success: false, error: `No user found with email: ${targetEmail}` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const { data: result } = await supabase.rpc('add_user_credits', {
      p_user_id: targetUser.id,
      p_amount: amount,
      p_type: 'gift',
      p_description: reason || 'Gift from admin',
      p_gifted_by: adminUser.id,
    });

    return new Response(
      JSON.stringify({ success: true, result, giftedTo: { email: targetUser.email, userId: targetUser.id } }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
