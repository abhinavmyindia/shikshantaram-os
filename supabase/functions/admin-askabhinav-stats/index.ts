import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // Validate caller via getClaims (matches platform pattern)
    let userId: string | null = null;
    try {
      const { data: claimsData } = await anon.auth.getClaims(token);
      userId = (claimsData as any)?.claims?.sub ?? null;
    } catch (_) {}
    if (!userId) {
      const { data: userData } = await anon.auth.getUser();
      userId = userData?.user?.id ?? null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminRow } = await admin.from('admin_users').select('role').eq('user_id', userId).maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'overview';
    const range = body.range || '7days';

    const fromDate: Record<string, string> = {
      'today': new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      '7days': new Date(Date.now() - 7 * 86400_000).toISOString(),
      '30days': new Date(Date.now() - 30 * 86400_000).toISOString(),
      'all': '2020-01-01T00:00:00Z',
    };
    const since = fromDate[range] || fromDate['7days'];

    if (action === 'session_messages') {
      const sid = body.session_id;
      if (!sid) {
        return new Response(JSON.stringify({ error: 'session_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: messages } = await admin
        .from('chat_messages')
        .select('id, role, content, image_urls, created_at')
        .eq('session_id', sid)
        .order('created_at', { ascending: true })
        .limit(200);
      const { data: session } = await admin
        .from('chat_sessions').select('id, title, user_id, created_at, updated_at').eq('id', sid).maybeSingle();
      return new Response(JSON.stringify({ session, messages: messages || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── OVERVIEW ─────────────────────────────────────────────
    const [sessionsRes, messagesRes, txRes, errorsRes, profilesRes] = await Promise.all([
      admin.from('chat_sessions').select('id, user_id, title, created_at, updated_at').gte('created_at', since).order('updated_at', { ascending: false }).limit(2000),
      admin.from('chat_messages').select('id, session_id, user_id, role, content, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
      admin.from('credit_transactions').select('user_id, amount, call_type, created_at').eq('tool_module', 'ask_abhinav_ai').gte('created_at', since).limit(5000),
      admin.from('error_logs').select('id, error_type, severity, message, stack_trace, page_url, additional_data, created_at, is_resolved, user_id')
        .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
        .or('message.ilike.%abhinav%,stack_trace.ilike.%ask-abhinav%,stack_trace.ilike.%chat-sessions%,stack_trace.ilike.%chat-messages%,additional_data.ilike.%abhinav%,page_url.ilike.%abhinav%')
        .order('created_at', { ascending: false })
        .limit(100),
      admin.from('user_profiles').select('id, full_name'),
    ]);

    const sessions = sessionsRes.data || [];
    const messages = messagesRes.data || [];
    const tx = txRes.data || [];
    const errors = errorsRes.data || [];
    const profiles = profilesRes.data || [];

    const nameMap: Record<string, string> = {};
    profiles.forEach((p: any) => { nameMap[p.id] = p.full_name; });

    // Collect emails for the involved users
    const userIds = Array.from(new Set([
      ...sessions.map((s: any) => s.user_id),
      ...tx.map((t: any) => t.user_id),
    ]));
    const emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        // Fetch in pages of 200
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        (list?.users || []).forEach((u: any) => { if (userIds.includes(u.id)) emailMap[u.id] = u.email; });
      } catch (_) {}
    }

    const userMessageCount: Record<string, number> = {};
    messages.forEach((m: any) => {
      if (m.role === 'user') userMessageCount[m.user_id] = (userMessageCount[m.user_id] || 0) + 1;
    });
    const assistantMessageCount: Record<string, number> = {};
    messages.forEach((m: any) => {
      if (m.role === 'assistant') assistantMessageCount[m.user_id] = (assistantMessageCount[m.user_id] || 0) + 1;
    });

    const perUser: Record<string, any> = {};
    sessions.forEach((s: any) => {
      if (!perUser[s.user_id]) perUser[s.user_id] = {
        user_id: s.user_id, name: nameMap[s.user_id] || '—', email: emailMap[s.user_id] || '—',
        sessions: 0, user_messages: 0, assistant_messages: 0, credits_spent: 0, text_calls: 0, image_calls: 0,
        last_active: s.updated_at,
      };
      perUser[s.user_id].sessions += 1;
      if (s.updated_at > perUser[s.user_id].last_active) perUser[s.user_id].last_active = s.updated_at;
    });
    tx.forEach((t: any) => {
      if (!perUser[t.user_id]) perUser[t.user_id] = {
        user_id: t.user_id, name: nameMap[t.user_id] || '—', email: emailMap[t.user_id] || '—',
        sessions: 0, user_messages: 0, assistant_messages: 0, credits_spent: 0, text_calls: 0, image_calls: 0, last_active: t.created_at,
      };
      perUser[t.user_id].credits_spent += Math.abs(t.amount || 0);
      if (t.call_type === 'chat_image') perUser[t.user_id].image_calls += 1;
      else perUser[t.user_id].text_calls += 1;
      if (t.created_at > perUser[t.user_id].last_active) perUser[t.user_id].last_active = t.created_at;
    });
    Object.values(perUser).forEach((u: any) => {
      u.user_messages = userMessageCount[u.user_id] || 0;
      u.assistant_messages = assistantMessageCount[u.user_id] || 0;
    });
    const usersArr = Object.values(perUser).sort((a: any, b: any) => b.credits_spent - a.credits_spent);

    // Per-day
    const byDay: Record<string, { sessions: number; messages: number; credits: number }> = {};
    sessions.forEach((s: any) => {
      const d = s.created_at.slice(0, 10);
      byDay[d] = byDay[d] || { sessions: 0, messages: 0, credits: 0 };
      byDay[d].sessions += 1;
    });
    messages.forEach((m: any) => {
      const d = m.created_at.slice(0, 10);
      byDay[d] = byDay[d] || { sessions: 0, messages: 0, credits: 0 };
      byDay[d].messages += 1;
    });
    tx.forEach((t: any) => {
      const d = t.created_at.slice(0, 10);
      byDay[d] = byDay[d] || { sessions: 0, messages: 0, credits: 0 };
      byDay[d].credits += Math.abs(t.amount || 0);
    });

    const totalCredits = tx.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
    const totalTextCalls = tx.filter((t: any) => t.call_type !== 'chat_image').length;
    const totalImageCalls = tx.filter((t: any) => t.call_type === 'chat_image').length;

    // Recent sessions list
    const recentSessions = sessions.slice(0, 50).map((s: any) => ({
      ...s,
      user_name: nameMap[s.user_id] || '—',
      user_email: emailMap[s.user_id] || '—',
      message_count: messages.filter((m: any) => m.session_id === s.id).length,
    }));

    return new Response(JSON.stringify({
      totals: {
        sessions: sessions.length,
        messages: messages.length,
        user_messages: messages.filter((m: any) => m.role === 'user').length,
        assistant_messages: messages.filter((m: any) => m.role === 'assistant').length,
        unique_users: Object.keys(perUser).length,
        credits: totalCredits,
        text_calls: totalTextCalls,
        image_calls: totalImageCalls,
      },
      users: usersArr,
      byDay,
      recentSessions,
      errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('admin-askabhinav-stats error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
