import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: { user: callerUser } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!callerUser) throw new Error('Unauthorized');

    const { data: callerRecord } = await supabase
      .from('admin_users')
      .select('role, is_owner')
      .eq('user_id', callerUser.id)
      .single();

    if (!callerRecord?.is_owner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only the Owner can manage team access.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...payload } = await req.json();

    if (action === 'add_member') {
      const { email, role, displayName } = payload;
      if (!['admin', 'manager', 'operator'].includes(role)) {
        throw new Error('Invalid role. Must be admin, manager, or operator.');
      }

      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === email);

      if (!existingUser) {
        await supabase.from('team_invitations').insert({
          email, role,
          invited_by: callerUser.id,
          invited_by_name: 'Owner',
          status: 'pending',
        });
        return new Response(JSON.stringify({
          success: true, type: 'invitation_sent',
          message: `Invitation created for ${email}. They need an account first.`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: existing } = await supabase
        .from('admin_users')
        .select('user_id, role')
        .eq('user_id', existingUser.id)
        .single();

      if (existing) throw new Error(`${email} is already a team member with role: ${existing.role}`);

      await supabase.from('admin_users').insert({
        user_id: existingUser.id, role, is_owner: false,
        invited_by: callerUser.id,
        display_name: displayName || existingUser.user_metadata?.full_name || email.split('@')[0],
        email,
      });

      return new Response(JSON.stringify({
        success: true, type: 'member_added',
        message: `${email} added as ${role} successfully.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'change_role') {
      const { targetUserId, newRole } = payload;
      if (!['admin', 'manager', 'operator'].includes(newRole)) throw new Error('Invalid role.');

      const { data: targetRecord } = await supabase
        .from('admin_users')
        .select('is_owner, role, email')
        .eq('user_id', targetUserId)
        .single();

      if (!targetRecord) throw new Error('Team member not found.');
      if (targetRecord.is_owner) throw new Error('The Owner role cannot be changed.');
      if (targetUserId === callerUser.id) throw new Error('You cannot change your own role.');

      await supabase
        .from('admin_users')
        .update({ role: newRole })
        .eq('user_id', targetUserId)
        .eq('is_owner', false);

      return new Response(JSON.stringify({
        success: true,
        message: `Role updated to ${newRole} for ${targetRecord.email || 'user'}.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'remove_member') {
      const { targetUserId } = payload;

      const { data: targetRecord } = await supabase
        .from('admin_users')
        .select('is_owner, email, display_name')
        .eq('user_id', targetUserId)
        .single();

      if (!targetRecord) throw new Error('Team member not found.');
      if (targetRecord.is_owner) throw new Error('The Owner cannot be removed.');
      if (targetUserId === callerUser.id) throw new Error('You cannot remove yourself.');

      await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', targetUserId)
        .eq('is_owner', false);

      return new Response(JSON.stringify({
        success: true,
        message: `${targetRecord.display_name || targetRecord.email} removed from team.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'cancel_invitation') {
      const { invitationId } = payload;
      await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      return new Response(JSON.stringify({ success: true, message: 'Invitation cancelled.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
