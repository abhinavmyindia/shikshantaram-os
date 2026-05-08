import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendTeamInviteEmail(email: string, role: string, invitedByName: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.warn('[manage-team] RESEND_API_KEY not set, skipping invite email');
    return;
  }

  const APP_URL = Deno.env.get('APP_URL') || 'https://os.shikshantaram.in';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const roleColor = role === 'admin' ? '#0284c7' : role === 'manager' ? '#059669' : '#d97706';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'DM Sans',Arial,sans-serif;background:#f5f3ff;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,${roleColor},#7c3aed);padding:32px 28px;text-align:center;">
<div style="font-family:Sora,sans-serif;font-weight:900;font-size:20px;color:white;">Shikshantaram OS</div>
</div>
<div style="padding:28px;">
<div style="display:inline-block;background:${roleColor};color:white;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:16px;">Team Invitation</div>
<h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:22px;color:#0f172a;margin:0 0 12px;">You're Invited to Join the Team! 🎉</h2>
<p style="font-size:14px;color:#64748b;line-height:1.7;"><strong>${invitedByName}</strong> has invited you to join the <strong>Shikshantaram OS</strong> admin team as <strong>${roleLabel}</strong>.</p>
<div style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
<div style="font-size:13px;color:#64748b;margin-bottom:6px;"><strong>Role:</strong> ${roleLabel}</div>
<div style="font-size:13px;color:#64748b;"><strong>Invited by:</strong> ${invitedByName}</div>
</div>
<p style="font-size:14px;color:#64748b;line-height:1.7;">To accept this invitation, please sign up or log in with this email address (<strong>${email}</strong>) on Shikshantaram OS. Your team access will be activated automatically.</p>
<a href="${APP_URL}" style="display:block;text-align:center;background:linear-gradient(135deg,${roleColor},#7c3aed);color:white;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px;">🚀 Go to Shikshantaram OS →</a>
</div>
</div></body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Shikshantaram OS <auth@shikshantaram.in>',
        to: [email],
        subject: `🎉 You've been invited to Shikshantaram OS as ${roleLabel}`,
        html,
      }),
    });
    const data = await res.json();
    console.log('[manage-team] Invite email sent:', res.ok, data);
  } catch (err) {
    console.error('[manage-team] Failed to send invite email:', err);
  }
}

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
      .select('role, is_owner, display_name, email')
      .eq('user_id', callerUser.id)
      .single();

    if (!callerRecord?.is_owner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only the Owner can manage team access.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ownerName = callerRecord.display_name || callerRecord.email || 'Owner';
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
          invited_by_name: ownerName,
          status: 'pending',
        });

        // Send invitation email
        await sendTeamInviteEmail(email, role, ownerName);

        return new Response(JSON.stringify({
          success: true, type: 'invitation_sent',
          message: `Invitation sent to ${email}. They will receive an email with instructions.`
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

      // Send welcome-to-team email for existing users too
      await sendTeamInviteEmail(email, role, ownerName);

      return new Response(JSON.stringify({
        success: true, type: 'member_added',
        message: `${email} added as ${role} successfully. They've been notified by email.`
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

    if (action === 'resend_invitation') {
      const { invitationId } = payload;
      const { data: inv } = await supabase
        .from('team_invitations')
        .select('email, role, status')
        .eq('id', invitationId)
        .single();

      if (!inv) throw new Error('Invitation not found.');
      if (inv.status !== 'pending') throw new Error(`Cannot resend a ${inv.status} invitation.`);

      // Refresh expiry to 7 days from now
      await supabase
        .from('team_invitations')
        .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', invitationId);

      await sendTeamInviteEmail(inv.email, inv.role, ownerName);

      return new Response(JSON.stringify({
        success: true,
        message: `Invitation re-sent to ${inv.email}. Expiry extended by 7 days.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
