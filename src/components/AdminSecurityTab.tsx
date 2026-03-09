import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const glassCard = {
  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

const severityColors: Record<string, { bg: string; color: string }> = {
  warning: { bg: '#fef9c3', color: '#92400e' },
  error: { bg: '#fee2e2', color: '#991b1b' },
  critical: { bg: '#ede9fe', color: '#7c3aed' },
  low: { bg: '#f1f5f9', color: '#64748b' },
  medium: { bg: '#fef9c3', color: '#92400e' },
  high: { bg: '#fff7ed', color: '#ea580c' },
};

const eventLabels: Record<string, string> = {
  concurrent_session_violation: '⚠️ Concurrent Session',
  ip_limit_exceeded: '🔒 IP Limit Exceeded',
  new_ip_detected: 'ℹ️ New Device Login',
  blocked_login_attempt: '🚫 Blocked Login Attempt',
  user_blocked: '❌ User Blocked',
  user_unblocked: '✅ User Unblocked',
  force_logout: '⚡ Force Logout',
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function KPICard({ label, value, sub, icon, bg }: { label: string; value: string | number; sub: string; icon: string; bg: string }) {
  return (
    <div style={{ ...glassCard, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{value}</div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ─── SUB-TAB 1: ERROR LOGS ───
function ErrorLogsSubTab() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    const fromDate: Record<string, string> = {
      today: new Date(new Date().setHours(0,0,0,0)).toISOString(),
      '7days': new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      '30days': new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    };
    let query = supabase.from('error_logs').select('*').gte('created_at', fromDate[dateRange]).order('created_at', { ascending: false }).limit(200);
    if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
    const { data } = await query;
    setErrors((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchErrors(); }, [severityFilter, dateRange]);

  const markResolved = async (id: string) => {
    await supabase.from('error_logs').update({ is_resolved: true, resolved_at: new Date().toISOString() } as any).eq('id', id);
    fetchErrors();
  };

  const todayErrors = errors.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const unresolvedCount = errors.filter(e => !e.is_resolved).length;
  const affectedUsers = new Set(errors.map(e => e.user_id).filter(Boolean)).size;

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <KPICard label="Errors Today" value={todayErrors.length} sub="in last 24h" icon="🔴" bg="rgba(239,68,68,0.1)" />
        <KPICard label="Critical Errors" value={criticalCount} sub="need attention" icon="🟠" bg="rgba(249,115,22,0.1)" />
        <KPICard label="Unresolved" value={unresolvedCount} sub="pending review" icon="🟡" bg="rgba(245,158,11,0.1)" />
        <KPICard label="Affected Users" value={affectedUsers} sub="unique users" icon="🟣" bg="rgba(124,58,237,0.1)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'warning', 'error', 'critical'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: severityFilter === s ? '#7c3aed' : '#f1f5f9', color: severityFilter === s ? 'white' : '#64748b',
            textTransform: 'capitalize',
          }}>{s}</button>
        ))}
        <div style={{ flex: 1 }} />
        {['today', '7days', '30days'].map(r => (
          <button key={r} onClick={() => setDateRange(r)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: dateRange === r ? '#0f172a' : '#f1f5f9', color: dateRange === r ? 'white' : '#64748b',
          }}>{r === 'today' ? 'Today' : r === '7days' ? '7 Days' : '30 Days'}</button>
        ))}
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {errors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No errors found 🎉</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {errors.map(err => {
              const sev = severityColors[err.severity] || severityColors.error;
              return (
                <div key={err.id}>
                  <div onClick={() => setExpandedId(expandedId === err.id ? null : err.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: sev.bg, color: sev.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', flexShrink: 0 }}>{err.severity}</span>
                    <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0, width: 60 }}>{err.module}</span>
                    <span style={{ fontSize: 12.5, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{err.message}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{err.user_email?.split('@')[0] || '—'}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, width: 60 }}>{relativeTime(err.created_at)}</span>
                    {!err.is_resolved && (
                      <button onClick={e => { e.stopPropagation(); markResolved(err.id); }} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Resolve</button>
                    )}
                    {err.is_resolved && <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700, flexShrink: 0 }}>✓</span>}
                  </div>
                  {expandedId === err.id && err.stack_trace && (
                    <div style={{ padding: '12px 20px', background: '#1e293b', maxHeight: 200, overflowY: 'auto' }}>
                      <pre style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>{err.stack_trace}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUB-TAB 2: ACTIVE SESSIONS ───
function ActiveSessionsSubTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    const { data } = await supabase.from('login_sessions').select('*').eq('is_active', true).order('last_seen', { ascending: false });
    setSessions((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const forceLogout = async (sessionToken: string, userId: string, userEmail: string) => {
    await supabase.functions.invoke('end-session', { body: { sessionToken, reason: 'forced_logout' } });
    await supabase.from('security_events').insert({
      user_id: userId, user_email: userEmail,
      event_type: 'force_logout', severity: 'medium',
      description: 'Admin forced logout of active session',
    } as any);
    fetchSessions();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  const deviceIcon = (d: string) => d === 'mobile' ? '📱' : d === 'tablet' ? '📋' : '💻';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{sessions.length} user{sessions.length !== 1 ? 's' : ''} online right now</span>
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No active sessions</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['User', 'IP', 'Location', 'Device', 'Browser', 'OS', 'Started', 'Last Seen', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{s.user_email?.split('@')[0] || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{s.ip_address}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{[s.ip_city, s.ip_state, s.ip_country].filter(Boolean).join(', ')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14 }}>{deviceIcon(s.device_type)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.browser}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.os}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>{relativeTime(s.created_at)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>{relativeTime(s.last_seen)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => forceLogout(s.session_token, s.user_id, s.user_email)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Force Logout</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── SUB-TAB 3: LOGIN HISTORY ───
function LoginHistorySubTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const fromDate: Record<string, string> = {
      today: new Date(new Date().setHours(0,0,0,0)).toISOString(),
      '7days': new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      '30days': new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    };
    const { data } = await supabase.from('login_sessions').select('*').gte('created_at', fromDate[dateRange]).order('created_at', { ascending: false }).limit(200);
    setHistory((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [dateRange]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  const statusBadge = (s: any) => {
    if (s.is_active) return <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20 }}>Active</span>;
    if (s.logout_reason === 'forced_logout' || s.logout_reason === 'security_block') return <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 20 }}>Force Ended</span>;
    return <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 20 }}>Logged Out</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['today', '7days', '30days'].map(r => (
          <button key={r} onClick={() => setDateRange(r)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: dateRange === r ? '#0f172a' : '#f1f5f9', color: dateRange === r ? 'white' : '#64748b',
          }}>{r === 'today' ? 'Today' : r === '7days' ? '7 Days' : '30 Days'}</button>
        ))}
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No login history found</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Time', 'User', 'IP', 'Location', 'ISP', 'Device', 'Browser', 'OS', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(s => (
                  <tr key={s.id} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>{relativeTime(s.created_at)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{s.user_email?.split('@')[0] || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{s.ip_address}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{[s.ip_city, s.ip_state].filter(Boolean).join(', ')}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.ip_isp || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 14 }}>{s.device_type === 'mobile' ? '📱' : s.device_type === 'tablet' ? '📋' : '💻'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.browser}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.os}</td>
                    <td style={{ padding: '10px 12px' }}>{statusBadge(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUB-TAB 4: SECURITY EVENTS ───
function SecurityEventsSubTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');

  const fetchEvents = async () => {
    setLoading(true);
    const fromDate: Record<string, string> = {
      today: new Date(new Date().setHours(0,0,0,0)).toISOString(),
      '7days': new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      '30days': new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    };
    let query = supabase.from('security_events').select('*').gte('created_at', fromDate[dateRange]).order('created_at', { ascending: false }).limit(200);
    if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
    const { data } = await query;
    setEvents((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [severityFilter, dateRange]);

  const markReviewed = async (id: string) => {
    await supabase.from('security_events').update({ is_reviewed: true, reviewed_at: new Date().toISOString() } as any).eq('id', id);
    fetchEvents();
  };

  const todayEvents = events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const unreviewedCount = events.filter(e => !e.is_reviewed).length;
  const highSeverity = events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
  const blockedAttempts = events.filter(e => e.event_type === 'blocked_login_attempt').length;

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <KPICard label="Events Today" value={todayEvents.length} sub="in last 24h" icon="🛡" bg="rgba(6,182,212,0.1)" />
        <KPICard label="Unreviewed" value={unreviewedCount} sub="pending review" icon="📋" bg="rgba(245,158,11,0.1)" />
        <KPICard label="High Severity" value={highSeverity} sub="need attention" icon="⚠️" bg="rgba(249,115,22,0.1)" />
        <KPICard label="Blocked Attempts" value={blockedAttempts} sub="login denied" icon="🚫" bg="rgba(239,68,68,0.1)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'low', 'medium', 'high', 'critical'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: severityFilter === s ? '#7c3aed' : '#f1f5f9', color: severityFilter === s ? 'white' : '#64748b',
            textTransform: 'capitalize',
          }}>{s}</button>
        ))}
        <div style={{ flex: 1 }} />
        {['today', '7days', '30days'].map(r => (
          <button key={r} onClick={() => setDateRange(r)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: dateRange === r ? '#0f172a' : '#f1f5f9', color: dateRange === r ? 'white' : '#64748b',
          }}>{r === 'today' ? 'Today' : r === '7days' ? '7 Days' : '30 Days'}</button>
        ))}
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No security events 🎉</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {events.map(ev => {
              const sev = severityColors[ev.severity] || severityColors.medium;
              return (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, width: 60 }}>{relativeTime(ev.created_at)}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, background: sev.bg, color: sev.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', flexShrink: 0 }}>{ev.severity}</span>
                  <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 600, flexShrink: 0, minWidth: 140 }}>{eventLabels[ev.event_type] || ev.event_type}</span>
                  <span style={{ fontSize: 12, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.user_email?.split('@')[0] || '—'}</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', flexShrink: 0 }}>{ev.ip_address || '—'}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.ip_location || '—'}</span>
                  {!ev.is_reviewed ? (
                    <button onClick={() => markReviewed(ev.id)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0891b2', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Review</button>
                  ) : (
                    <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUB-TAB 5: BLOCKED USERS ───
function BlockedUsersSubTab() {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockEmail, setBlockEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const fetchBlocked = async () => {
    setLoading(true);
    const { data } = await supabase.from('user_security_settings').select('*').eq('is_blocked', true);
    setBlocked((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBlocked(); }, []);

  const unblockUser = async (userId: string, email: string) => {
    await supabase.from('user_security_settings').update({ is_blocked: false, block_reason: null, blocked_at: null, updated_at: new Date().toISOString() } as any).eq('user_id', userId);
    await supabase.from('security_events').insert({
      user_id: userId, user_email: email,
      event_type: 'user_unblocked', severity: 'medium',
      description: 'User unblocked by admin',
    } as any);
    fetchBlocked();
  };

  const blockNewUser = async () => {
    if (!blockEmail.trim()) return;
    setBlocking(true);
    // Lookup user by email from login_sessions
    const { data: sessionData } = await supabase.from('login_sessions').select('user_id').eq('user_email', blockEmail.trim().toLowerCase()).limit(1);
    const userId = (sessionData as any[])?.[0]?.user_id;
    if (!userId) {
      alert('User not found. They must have logged in at least once.');
      setBlocking(false);
      return;
    }
    await supabase.from('user_security_settings').upsert({
      user_id: userId, user_email: blockEmail.trim(),
      is_blocked: true, block_reason: blockReason || 'Blocked by admin',
      blocked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } as any, { onConflict: 'user_id' });
    await supabase.from('security_events').insert({
      user_id: userId, user_email: blockEmail.trim(),
      event_type: 'user_blocked', severity: 'high',
      description: `User blocked by admin: ${blockReason || 'No reason specified'}`,
    } as any);
    setBlockEmail('');
    setBlockReason('');
    setBlocking(false);
    fetchBlocked();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  return (
    <div>
      {/* Block New User */}
      <div style={{ ...glassCard, padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>🚫 Block New User</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Email</label>
            <input value={blockEmail} onChange={e => setBlockEmail(e.target.value)} placeholder="user@example.com" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Reason</label>
            <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <button onClick={blockNewUser} disabled={blocking} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
            {blocking ? 'Blocking...' : '🚫 Block'}
          </button>
        </div>
      </div>

      {/* Blocked Users List */}
      {blocked.length === 0 ? (
        <div style={{ ...glassCard, padding: 40, textAlign: 'center', color: '#94a3b8' }}>No blocked users 🎉</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {blocked.map(u => (
            <div key={u.id} style={{ ...glassCard, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{u.user_email || 'Unknown'}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#ef4444', marginTop: 4 }}>🚫 {u.block_reason || 'No reason specified'}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Blocked: {u.blocked_at ? new Date(u.blocked_at).toLocaleString() : '—'} · Violations: {u.violation_count || 0}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => unblockUser(u.user_id, u.user_email)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Unblock</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN SECURITY TAB ───
export default function SecurityTab() {
  const [subTab, setSubTab] = useState('errors');

  const subTabs = [
    { id: 'errors', label: '🔴 Error Logs' },
    { id: 'active', label: '🟢 Active Sessions' },
    { id: 'history', label: '📋 Login History' },
    { id: 'events', label: '🛡 Security Events' },
    { id: 'blocked', label: '🚫 Blocked Users' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 2 }}>🔒 Security Center</h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' }}>Error tracking, session management, and security monitoring</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans',
            fontWeight: subTab === t.id ? 700 : 500, fontSize: 12.5,
            background: subTab === t.id ? 'rgba(124,58,237,0.08)' : 'transparent',
            color: subTab === t.id ? '#7c3aed' : '#64748b',
            borderBottom: subTab === t.id ? '2px solid #7c3aed' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'errors' && <ErrorLogsSubTab />}
      {subTab === 'active' && <ActiveSessionsSubTab />}
      {subTab === 'history' && <LoginHistorySubTab />}
      {subTab === 'events' && <SecurityEventsSubTab />}
      {subTab === 'blocked' && <BlockedUsersSubTab />}
    </div>
  );
}
