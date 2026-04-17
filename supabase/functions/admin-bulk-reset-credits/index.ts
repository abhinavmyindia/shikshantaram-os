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

    // Owner-only
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('role, is_owner, email, display_name')
      .eq('user_id', adminUser.id)
      .single();
    if (!adminRow || !adminRow.is_owner) throw new Error('Owner access required');

    const body = await req.json().catch(() => ({}));
    const targetBalance = Math.max(0, Math.floor(Number(body.targetBalance ?? 500)));
    const reason = (body.reason || 'Bulk reset by owner').toString().slice(0, 200);

    if (!Number.isFinite(targetBalance) || targetBalance > 100000) {
      throw new Error('Invalid target balance (must be 0-100000)');
    }

    // Fetch all users that have a credits row
    const { data: allUsers, error: fetchErr } = await supabase
      .from('user_credits')
      .select('user_id, balance');
    if (fetchErr) throw fetchErr;

    const users = allUsers || [];
    let affected = 0;
    const errors: string[] = [];

    for (const u of users) {
      const delta = targetBalance - (u.balance || 0);
      if (delta === 0) {
        // still log a no-op transaction so audit trail is complete? skip to keep noise low
        continue;
      }

      // Update balance directly (we don't want to mutate lifetime_topped/spent)
      const { error: updErr } = await supabase
        .from('user_credits')
        .update({ balance: targetBalance, updated_at: new Date().toISOString() })
        .eq('user_id', u.user_id);

      if (updErr) {
        errors.push(`${u.user_id}: ${updErr.message}`);
        continue;
      }

      // Insert audit transaction
      await supabase.from('credit_transactions').insert({
        user_id: u.user_id,
        type: 'admin_reset',
        amount: delta,
        balance_after: targetBalance,
        description: `Admin bulk reset to ${targetBalance} — ${reason}`,
        gifted_by: adminUser.id,
      });

      affected++;
    }

    const nowIso = new Date().toISOString();
    const adminLabel = adminRow.display_name || adminRow.email || adminUser.email || 'owner';

    // Persist global metadata
    const settings = [
      { key: 'last_bulk_credit_reset_at',              value: nowIso,                     description: 'Timestamp of last bulk credit reset' },
      { key: 'last_bulk_credit_reset_by',              value: adminLabel,                 description: 'Admin who performed the last bulk reset' },
      { key: 'last_bulk_credit_reset_amount',          value: String(targetBalance),      description: 'Target balance set in last bulk reset' },
      { key: 'last_bulk_credit_reset_users_affected', value: String(affected),           description: 'Users affected in last bulk reset' },
      { key: 'last_bulk_credit_reset_reason',          value: reason,                     description: 'Reason for last bulk reset' },
    ];
    for (const row of settings) {
      await supabase.from('global_settings')
        .upsert({ ...row, updated_at: nowIso, updated_by: adminUser.id }, { onConflict: 'key' });
    }

    // Admin activity log
    await supabase.from('admin_activity_log').insert({
      admin_id: adminUser.id,
      action_type: 'bulk_credit_reset',
      target_user_name: `${affected} users`,
      details: { targetBalance, reason, totalUsers: users.length, affected, errorCount: errors.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        targetBalance,
        totalUsers: users.length,
        affected,
        skipped: users.length - affected - errors.length,
        errors: errors.slice(0, 5),
        timestamp: nowIso,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
