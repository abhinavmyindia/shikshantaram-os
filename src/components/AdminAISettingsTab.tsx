import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

const s = (styles: CSSProperties): CSSProperties => styles;

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

type HealthResult = {
  overallStatus: 'healthy' | 'degraded' | 'not_configured';
  providers: ProviderStatus[];
  checkedAt: string;
} | null;

const CLAUDE_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fast & cheap', tag: 'Fast' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 — balanced', tag: 'Balanced' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4 — top tier', tag: 'Premium' },
];

const DEFAULT_MODEL_KEY = 'default_claude_model';

const card: CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(16px)',
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
  padding: 20,
  marginBottom: 20,
};

const sectionTitle: CSSProperties = {
  fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a',
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
};

const statusColors = {
  connected: { bg: '#dcfce7', text: '#166534', dot: '#16a34a', label: 'Connected' },
  error: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Error' },
  not_configured: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Not configured' },
};

/* ─── Health Widget ──────────────────────────────────────────────────────── */
const HealthWidget = ({ data, loading, onRefresh }: { data: HealthResult; loading: boolean; onRefresh: () => void }) => {
  const overall = data?.overallStatus;
  const overallBg = overall === 'healthy' ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)'
    : overall === 'degraded' ? 'linear-gradient(135deg,#fef3c7,#fde68a)'
    : 'linear-gradient(135deg,#f1f5f9,#e2e8f0)';
  const overallText = overall === 'healthy' ? '#166534' : overall === 'degraded' ? '#92400e' : '#475569';

  return (
    <div style={s({ ...card, background: overallBg, border: '1px solid rgba(15,23,42,0.08)' })}>
      <div style={s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 })}>
        <div>
          <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 18, color: overallText, display: 'flex', alignItems: 'center', gap: 10 })}>
            <span style={s({ width: 10, height: 10, borderRadius: '50%', background: overall === 'healthy' ? '#16a34a' : overall === 'degraded' ? '#f59e0b' : '#94a3b8', boxShadow: '0 0 0 3px rgba(255,255,255,0.6)' })} />
            {loading && !data ? 'Checking AI providers…' :
              overall === 'healthy' ? 'All AI providers healthy' :
              overall === 'degraded' ? 'One or more providers degraded' :
              overall === 'not_configured' ? 'No providers configured' : 'Unknown'}
          </div>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#475569', marginTop: 4 })}>
            {data?.checkedAt ? `Last checked ${new Date(data.checkedAt).toLocaleTimeString()}` : '—'}
            {' · Auto-refresh every 30s'}
          </div>
        </div>
        <button onClick={onRefresh} disabled={loading} style={s({
          background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: 10, padding: '9px 16px', cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, color: '#0f172a',
          opacity: loading ? 0.6 : 1,
        })}>{loading ? 'Checking…' : '↻ Re-check now'}</button>
      </div>

      <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 })}>
        {(data?.providers || []).map(p => {
          const sc = statusColors[p.status];
          return (
            <div key={p.provider} style={s({
              background: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 14,
              border: `1px solid ${sc.dot}33`,
            })}>
              <div style={s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 })}>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 13.5, color: '#0f172a' })}>{p.label}</span>
                <span style={s({
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: sc.bg, color: sc.text, padding: '3px 9px',
                  borderRadius: 999, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 10.5,
                })}>
                  <span style={s({ width: 6, height: 6, borderRadius: '50%', background: sc.dot })} />
                  {sc.label}
                </span>
              </div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#64748b', display: 'flex', justifyContent: 'space-between' })}>
                <span>Latency</span>
                <span style={s({ color: '#0f172a', fontWeight: 600 })}>{p.latencyMs != null ? `${p.latencyMs}ms` : '—'}</span>
              </div>
              {p.error && (
                <div style={s({ marginTop: 8, padding: 8, borderRadius: 8, background: '#fef2f2', fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#991b1b', wordBreak: 'break-word', maxHeight: 80, overflow: 'auto' })}>
                  {p.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Claude Key Section ─────────────────────────────────────────────────── */
const ClaudeKeySection = ({ providers }: { providers: ProviderStatus[] }) => {
  const anthropic = providers.find(p => p.provider === 'anthropic');
  const sc = anthropic ? statusColors[anthropic.status] : statusColors.not_configured;

  return (
    <div style={s(card)}>
      <div style={s(sectionTitle)}>🔑 Claude API Key</div>
      <div style={s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#f8fafc', borderRadius: 12, gap: 16 })}>
        <div>
          <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 })}>
            ANTHROPIC_API_KEY
          </div>
          <div style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#64748b' })}>
            Stored securely as a server secret. Used by all server-side Claude calls.
          </div>
        </div>
        <span style={s({
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: sc.bg, color: sc.text, padding: '5px 11px',
          borderRadius: 999, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11.5,
        })}>
          <span style={s({ width: 6, height: 6, borderRadius: '50%', background: sc.dot })} />
          {sc.label}
        </span>
      </div>
      <div style={s({ marginTop: 12, padding: 12, background: 'rgba(124,58,237,0.06)', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 11.5, color: '#475569', lineHeight: '1.55' })}>
        💡 To rotate the Claude key, use the secret manager. The key is never exposed to the client and the actual value is hidden even from admins.
      </div>
    </div>
  );
};

/* ─── Default Model Selector ─────────────────────────────────────────────── */
const ModelSelector = ({ onChange }: { onChange: () => void }) => {
  const [model, setModel] = useState<string>(CLAUDE_MODELS[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('global_settings').select('value').eq('key', DEFAULT_MODEL_KEY).maybeSingle()
      .then(({ data }) => {
        if (data?.value) setModel(data.value);
        setLoading(false);
      });
  }, []);

  const save = async (newModel: string) => {
    setSaving(true);
    setModel(newModel);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase.from('global_settings').select('key').eq('key', DEFAULT_MODEL_KEY).maybeSingle();
    if (existing) {
      await supabase.from('global_settings').update({
        value: newModel, updated_at: new Date().toISOString(), updated_by: user?.id,
      }).eq('key', DEFAULT_MODEL_KEY);
    } else {
      await supabase.from('global_settings').insert({
        key: DEFAULT_MODEL_KEY, value: newModel, description: 'Default Claude model for server-side AI calls', updated_by: user?.id,
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    onChange();
  };

  return (
    <div style={s(card)}>
      <div style={s(sectionTitle)}>
        🎛️ Default Claude Model
        {saved && <span style={s({ marginLeft: 'auto', fontFamily: 'DM Sans', fontSize: 11, color: '#16a34a', fontWeight: 700 })}>✓ Saved</span>}
      </div>
      <div style={s({ display: 'flex', flexDirection: 'column', gap: 8 })}>
        {CLAUDE_MODELS.map(m => {
          const active = model === m.id;
          return (
            <button key={m.id} onClick={() => save(m.id)} disabled={loading || saving} style={s({
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 12, cursor: loading || saving ? 'wait' : 'pointer',
              background: active ? 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(236,72,153,0.06))' : '#f8fafc',
              border: `1.5px solid ${active ? '#7c3aed' : 'rgba(15,23,42,0.06)'}`,
              textAlign: 'left', transition: 'all 0.15s',
            })}>
              <div>
                <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2 })}>{m.label}</div>
                <div style={s({ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#64748b' })}>{m.id}</div>
              </div>
              <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 })}>{m.tag}</span>
                {active && <span style={s({ color: '#7c3aed', fontSize: 16 })}>●</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Usage Log ──────────────────────────────────────────────────────────── */
type LogRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  module: string;
  model: string;
  call_type: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  error: string | null;
  source: 'ai_usage' | 'byok';
};

const UsageLog = ({ reloadKey }: { reloadKey: number }) => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'errors'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: aiRows }, { data: byokRows }, { data: errRows }] = await Promise.all([
      supabase.from('ai_usage_logs').select('id,created_at,user_email,module,model,call_type,input_tokens,output_tokens').order('created_at', { ascending: false }).limit(40),
      supabase.from('byok_usage_logs').select('id,created_at,user_email,module,model,call_type,input_tokens,output_tokens,success,error_message').order('created_at', { ascending: false }).limit(40),
      supabase.from('error_logs').select('id,created_at,user_email,module,message').or('module.ilike.%ai%,module.ilike.%claude%,module.ilike.%offer%,module.ilike.%funnel%,module.ilike.%copy%,module.ilike.%research%').order('created_at', { ascending: false }).limit(40),
    ]);

    const merged: LogRow[] = [];
    (aiRows || []).forEach((r: any) => merged.push({
      id: `ai-${r.id}`, created_at: r.created_at, user_email: r.user_email, module: r.module,
      model: r.model, call_type: r.call_type, input_tokens: r.input_tokens || 0, output_tokens: r.output_tokens || 0,
      success: true, error: null, source: 'ai_usage',
    }));
    (byokRows || []).forEach((r: any) => merged.push({
      id: `byok-${r.id}`, created_at: r.created_at, user_email: r.user_email, module: r.module,
      model: r.model, call_type: r.call_type, input_tokens: r.input_tokens || 0, output_tokens: r.output_tokens || 0,
      success: r.success !== false, error: r.error_message || null, source: 'byok',
    }));
    (errRows || []).forEach((r: any) => merged.push({
      id: `err-${r.id}`, created_at: r.created_at, user_email: r.user_email, module: r.module || 'unknown',
      model: '—', call_type: 'error', input_tokens: 0, output_tokens: 0,
      success: false, error: r.message, source: 'ai_usage',
    }));

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRows(merged.slice(0, 80));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const shown = filter === 'errors' ? rows.filter(r => !r.success) : rows;

  return (
    <div style={s(card)}>
      <div style={s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 })}>
        <div style={s({ ...sectionTitle, marginBottom: 0 })}>📋 Recent AI Requests & Errors</div>
        <div style={s({ display: 'flex', gap: 6 })}>
          {(['all', 'errors'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={s({
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === f ? '#0f172a' : '#f1f5f9',
              color: filter === f ? 'white' : '#475569',
              fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11,
            })}>{f === 'all' ? 'All' : 'Errors only'}</button>
          ))}
          <button onClick={load} style={s({
            padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)', cursor: 'pointer',
            background: 'white', color: '#0f172a', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11,
          })}>↻</button>
        </div>
      </div>

      {loading ? (
        <div style={s({ padding: 40, textAlign: 'center', fontFamily: 'DM Sans', color: '#94a3b8', fontSize: 12 })}>Loading…</div>
      ) : shown.length === 0 ? (
        <div style={s({ padding: 40, textAlign: 'center', fontFamily: 'DM Sans', color: '#94a3b8', fontSize: 12 })}>
          {filter === 'errors' ? 'No errors — all calls succeeded.' : 'No requests yet.'}
        </div>
      ) : (
        <div style={s({ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 520, overflowY: 'auto' })}>
          {shown.map(r => (
            <div key={r.id} style={s({
              display: 'grid', gridTemplateColumns: '14px 1fr auto auto', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: r.success ? '#f8fafc' : '#fef2f2', borderRadius: 10,
              border: `1px solid ${r.success ? 'rgba(15,23,42,0.05)' : 'rgba(239,68,68,0.15)'}`,
            })}>
              <span style={s({ width: 8, height: 8, borderRadius: '50%', background: r.success ? '#16a34a' : '#ef4444' })} />
              <div style={s({ minWidth: 0 })}>
                <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' })}>
                  <span>{r.module}</span>
                  <span style={s({ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#64748b', fontWeight: 500 })}>· {r.call_type}</span>
                  <span style={s({ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#7c3aed', fontWeight: 600 })}>{r.model}</span>
                </div>
                <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', marginTop: 2 })}>
                  {r.user_email || 'anonymous'} · {new Date(r.created_at).toLocaleString()}
                  {(r.input_tokens > 0 || r.output_tokens > 0) && ` · ${r.input_tokens}↑/${r.output_tokens}↓ tok`}
                </div>
                {r.error && (
                  <div style={s({ marginTop: 6, padding: 7, background: 'white', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#991b1b', wordBreak: 'break-word' })}>
                    {String(r.error).slice(0, 300)}
                  </div>
                )}
              </div>
              <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 10, color: r.source === 'byok' ? '#7c3aed' : '#0ea5e9', textTransform: 'uppercase', letterSpacing: 0.5 })}>
                {r.source === 'byok' ? 'BYOK' : 'GATEWAY'}
              </span>
              <span />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main Tab ───────────────────────────────────────────────────────────── */
export default function AdminAISettingsTab() {
  const [health, setHealth] = useState<HealthResult>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-health-check');
      if (error) throw error;
      setHealth(data as HealthResult);
    } catch (err: any) {
      setHealth({
        overallStatus: 'degraded',
        providers: [{ provider: 'health', label: 'Health check', configured: true, ok: false, latencyMs: null, status: 'error', error: err?.message || 'unknown', checkedAt: new Date().toISOString() }],
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div>
      <div style={s({ marginBottom: 20 })}>
        <div style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a' })}>AI Settings</div>
        <div style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 })}>
          Manage Claude API key, default model, monitor provider health, and inspect AI request logs.
        </div>
      </div>

      <HealthWidget data={health} loading={healthLoading} onRefresh={fetchHealth} />

      <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 })}>
        <ClaudeKeySection providers={health?.providers || []} />
        <ModelSelector onChange={() => setReloadKey(k => k + 1)} />
      </div>

      <UsageLog reloadKey={reloadKey} />
    </div>
  );
}
