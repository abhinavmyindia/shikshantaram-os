import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  showToast: (msg: string, type?: string) => void;
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

const fmt = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7days', label: '7 Days' },
  { id: '30days', label: '30 Days' },
  { id: 'all', label: 'All Time' },
];

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
  <div style={{ ...glassCard, padding: 18 }}>
    <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 26, color, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', marginTop: 6 }}>{sub}</div>}
  </div>
);

export default function AdminAskAbhinavTab({ showToast }: Props) {
  const [range, setRange] = useState('7days');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'overview' | 'users' | 'sessions' | 'errors'>('overview');
  const [viewSession, setViewSession] = useState<any | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('admin-askabhinav-stats', {
        body: { action: 'overview', range },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      setData(res);
    } catch (err: any) {
      showToast(`Failed to load: ${err.message}`, 'error');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, [range]);

  const openSession = async (session: any) => {
    setViewSession(session);
    setLoadingMessages(true);
    setSessionMessages([]);
    try {
      const { data: res, error } = await supabase.functions.invoke('admin-askabhinav-stats', {
        body: { action: 'session_messages', session_id: session.id },
      });
      if (error) throw error;
      setSessionMessages(res?.messages || []);
    } catch (err: any) {
      showToast(`Failed to load chat: ${err.message}`, 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const resolveError = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.functions.invoke('resolve-error', {
        body: { action: 'resolve_one', errorId: id, resolvedBy: user?.id },
      });
      showToast('Marked as resolved');
      load(true);
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  const t = data?.totals || {};
  const dayEntries = Object.entries(data?.byDay || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-14) as [string, any][];
  const maxDayMessages = Math.max(...dayEntries.map(([, d]) => d.messages || 0), 1);
  const errors = data?.errors || [];
  const unresolvedErrors = errors.filter((e: any) => !e.is_resolved).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#0f172a' }}>💬 AskAbhinavAI Analytics</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Real-time tracking of chat sessions, messages, credits and errors for the AskAbhinavAI assistant.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)} style={{
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12,
              background: range === r.id ? 'linear-gradient(135deg,#1D9E75,#10b981)' : 'white',
              color: range === r.id ? 'white' : '#475569',
              boxShadow: range === r.id ? '0 4px 16px rgba(29,158,117,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
            }}>{r.label}</button>
          ))}
          <button onClick={() => load(false)} disabled={refreshing} style={{
            padding: '7px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
            background: 'white', cursor: refreshing ? 'wait' : 'pointer',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#475569',
          }}>{refreshing ? '↻' : '↻ Refresh'}</button>
        </div>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '1px solid #e2e8f0' }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'users', label: '👥 Users', badge: data?.users?.length || 0 },
          { id: 'sessions', label: '💬 Sessions', badge: data?.recentSessions?.length || 0 },
          { id: 'errors', label: '⚠️ Errors', badge: unresolvedErrors, urgent: unresolvedErrors > 0 },
        ].map((it: any) => (
          <button key={it.id} onClick={() => setTab(it.id)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
            color: tab === it.id ? '#1D9E75' : '#64748b',
            borderBottom: tab === it.id ? '2.5px solid #1D9E75' : '2.5px solid transparent',
            marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {it.label}
            {it.badge > 0 && (
              <span style={{
                background: it.urgent ? '#dc2626' : tab === it.id ? '#1D9E75' : '#94a3b8',
                color: 'white', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 20,
              }}>{it.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
            <StatCard label="Sessions" value={t.sessions || 0} sub={`${t.unique_users || 0} unique users`} color="#1D9E75" />
            <StatCard label="Messages" value={t.messages || 0} sub={`${t.user_messages || 0} user · ${t.assistant_messages || 0} reply`} color="#7c3aed" />
            <StatCard label="Credits Spent" value={`₹${t.credits || 0}`} sub={`${t.text_calls || 0} text · ${t.image_calls || 0} image`} color="#f59e0b" />
            <StatCard label="Errors (30d)" value={errors.length} sub={`${unresolvedErrors} unresolved`} color={unresolvedErrors > 0 ? '#dc2626' : '#10b981'} />
          </div>

          <div style={{ ...glassCard, padding: 20, marginBottom: 18 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 16 }}>📈 Messages per day (last 14)</div>
            {dayEntries.length === 0 ? (
              <div style={{ color: '#94a3b8', fontFamily: 'DM Sans', fontSize: 13, padding: 24, textAlign: 'center' }}>No activity in this period.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                {dayEntries.map(([day, d]) => {
                  const h = ((d.messages || 0) / maxDayMessages) * 140;
                  return (
                    <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#475569' }}>{d.messages || 0}</div>
                      <div style={{
                        width: '100%', height: Math.max(h, 4), borderRadius: 6,
                        background: 'linear-gradient(180deg,#1D9E75,#10b981)',
                        transition: 'all 0.3s',
                      }} title={`${day}: ${d.messages} msgs, ${d.sessions} sessions, ₹${d.credits}`} />
                      <div style={{ fontFamily: 'DM Sans', fontSize: 9.5, color: '#94a3b8' }}>{day.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          {(data?.users || []).length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13 }}>No users yet in this range.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['User', 'Sessions', 'Messages', 'Text', 'Image', 'Credits', 'Last Active'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((u: any) => (
                  <tr key={u.user_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{u.name}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>{u.sessions}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{u.user_messages} / {u.assistant_messages}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>{u.text_calls}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>{u.image_calls}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>₹{u.credits_spent}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmt(u.last_active)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SESSIONS */}
      {tab === 'sessions' && (
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          {(data?.recentSessions || []).length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13 }}>No sessions yet.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Title', 'User', 'Messages', 'Created', 'Updated', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentSessions.map((s: any) => (
                  <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#0f172a', maxWidth: 280 }}>{s.title}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12.5, color: '#475569' }}>{s.user_name}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 10.5, color: '#94a3b8' }}>{s.user_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{s.message_count}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmt(s.created_at)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmt(s.updated_at)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => openSession(s)} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid #d1fae5',
                        background: '#ecfdf5', color: '#047857', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11,
                        cursor: 'pointer',
                      }}>View chat</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ERRORS */}
      {tab === 'errors' && (
        <div>
          {errors.length === 0 ? (
            <div style={{ ...glassCard, padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a' }}>No errors logged for AskAbhinavAI</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', marginTop: 6 }}>Looking at the last 30 days.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {errors.map((e: any) => (
                <div key={e.id} style={{
                  ...glassCard, padding: 14,
                  borderLeft: `3px solid ${e.is_resolved ? '#10b981' : e.severity === 'critical' ? '#dc2626' : '#f59e0b'}`,
                  opacity: e.is_resolved ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 50,
                          background: e.severity === 'critical' ? '#fee2e2' : '#fef3c7',
                          color: e.severity === 'critical' ? '#991b1b' : '#92400e',
                          textTransform: 'uppercase',
                        }}>{e.severity || 'error'}</span>
                        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>{e.error_type}</span>
                        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>· {fmt(e.created_at)}</span>
                        {e.is_resolved && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 50, background: '#dcfce7', color: '#15803d' }}>RESOLVED</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, color: '#0f172a', wordBreak: 'break-word' }}>{e.message}</div>
                      {e.stack_trace && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>stack trace</summary>
                          <pre style={{ marginTop: 6, padding: 10, background: '#0f172a', color: '#e2e8f0', borderRadius: 6, fontSize: 10, lineHeight: 1.5, maxHeight: 200, overflow: 'auto', fontFamily: 'monospace' }}>{e.stack_trace}</pre>
                        </details>
                      )}
                    </div>
                    {!e.is_resolved && (
                      <button onClick={() => resolveError(e.id)} style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none', background: '#1D9E75', color: 'white',
                        fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>Mark resolved</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session viewer modal */}
      {viewSession && (
        <div onClick={() => setViewSession(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
          zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            maxWidth: 720, width: '100%', maxHeight: '85vh', background: 'white', borderRadius: 20,
            boxShadow: '0 32px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#1D9E75,#10b981)' }}>
              <div>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>{viewSession.title}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  {viewSession.user_name} · {viewSession.user_email} · {fmt(viewSession.created_at)}
                </div>
              </div>
              <button onClick={() => setViewSession(null)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer',
                width: 32, height: 32, borderRadius: '50%', fontSize: 18, fontWeight: 700,
              }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, background: '#f8fafc' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
                </div>
              ) : sessionMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontFamily: 'DM Sans', fontSize: 13 }}>No messages.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessionMessages.map((m: any) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '78%',
                        background: m.role === 'user' ? 'linear-gradient(135deg,#1D9E75,#10b981)' : 'white',
                        color: m.role === 'user' ? 'white' : '#0f172a',
                        padding: '10px 14px', borderRadius: 14,
                        fontFamily: 'DM Sans', fontSize: 13.5, lineHeight: 1.55,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      }}>
                        {m.content}
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.65 }}>{fmt(m.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
