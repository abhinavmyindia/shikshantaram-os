// Pings AI providers and returns connectivity status.
// Owner-only access — verifies caller is in admin_users with role 'owner'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProviderStatus = {
  provider: string;
  label: string;
  configured: boolean;
  ok: boolean;
  latencyMs: number | null;
  status: 'connected' | 'error' | 'not_configured';
  error?: string;
  checkedAt: string;
};

async function timedFetch(url: string, init: RequestInit, timeoutMs = 8000): Promise<{ res?: Response; ms: number; err?: string }> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { res, ms: Date.now() - t0 };
  } catch (e: any) {
    return { ms: Date.now() - t0, err: e?.message || 'network error' };
  } finally {
    clearTimeout(timer);
  }
}

async function checkAnthropic(key: string | undefined): Promise<ProviderStatus> {
  const now = new Date().toISOString();
  if (!key) return { provider: 'anthropic', label: 'Anthropic Claude', configured: false, ok: false, latencyMs: null, status: 'not_configured', checkedAt: now };
  const { res, ms, err } = await timedFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
  });
  if (!res) return { provider: 'anthropic', label: 'Anthropic Claude', configured: true, ok: false, latencyMs: ms, status: 'error', error: err, checkedAt: now };
  // 200 ok; 529 overloaded but key valid; 401/403 = bad key
  const ok = res.status === 200 || res.status === 529;
  const errText = ok ? undefined : await res.text().then(t => t.slice(0, 240)).catch(() => `HTTP ${res.status}`);
  return { provider: 'anthropic', label: 'Anthropic Claude', configured: true, ok, latencyMs: ms, status: ok ? 'connected' : 'error', error: errText, checkedAt: now };
}

async function checkLovable(key: string | undefined): Promise<ProviderStatus> {
  const now = new Date().toISOString();
  if (!key) return { provider: 'lovable', label: 'Lovable AI Gateway', configured: false, ok: false, latencyMs: null, status: 'not_configured', checkedAt: now };
  const { res, ms, err } = await timedFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash-lite', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  });
  if (!res) return { provider: 'lovable', label: 'Lovable AI Gateway', configured: true, ok: false, latencyMs: ms, status: 'error', error: err, checkedAt: now };
  const ok = res.ok || res.status === 429;
  const errText = ok ? undefined : await res.text().then(t => t.slice(0, 240)).catch(() => `HTTP ${res.status}`);
  return { provider: 'lovable', label: 'Lovable AI Gateway', configured: true, ok, latencyMs: ms, status: ok ? 'connected' : 'error', error: errText, checkedAt: now };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Auth: owner only
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: userRes } = await supabase.auth.getUser(token);
    const userId = userRes?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { data: admin } = await supabase.from('admin_users').select('role,is_owner').eq('user_id', userId).maybeSingle();
    if (!admin || (admin.role !== 'owner' && !admin.is_owner)) {
      return new Response(JSON.stringify({ error: 'Forbidden — owner access required' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const [anthropic, lovable] = await Promise.all([
      checkAnthropic(Deno.env.get('ANTHROPIC_API_KEY')),
      checkLovable(Deno.env.get('LOVABLE_API_KEY')),
    ]);

    const providers = [anthropic, lovable];
    const allOk = providers.every(p => !p.configured || p.ok);
    const anyConfigured = providers.some(p => p.configured);

    return new Response(JSON.stringify({
      overallStatus: !anyConfigured ? 'not_configured' : allOk ? 'healthy' : 'degraded',
      providers,
      checkedAt: new Date().toISOString(),
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'health check failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
