import React, { useState, useEffect, forwardRef } from 'react';
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
  suspicious_activity: '🔴 Suspicious Activity',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const KPICard = forwardRef<HTMLDivElement, { label: string; value: string | number; sub: string; icon: string; bg: string }>(
  ({ label, value, sub, icon, bg }, ref) => (
    <div ref={ref} style={{ ...glassCard, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{value}</div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
    </div>
  )
);
KPICard.displayName = 'KPICard';

function LoadingSpinner({ color = '#7c3aed' }: { color?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: color, borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
    </div>
  );
}

function EmptyState({ icon = '📭', title = 'No data yet', sub = 'This will populate as users interact with the app.' }: { icon?: string; title?: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' }}>{sub}</div>
    </div>
  );
}

// ─── SUB-TAB 1: ERROR LOGS (Grouped + Intelligent) ───
function ErrorLogsSubTab({ adminId, showToast }: { adminId: string; showToast: (msg: string, type?: string) => void }) {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [kpis, setKpis] = useState({ errorsToday: 0, critical: 0, unresolved: 0, affected: 0 });

  const fetchErrors = async () => {
    try {
      setLoading(true);
      setFetchError('');
      let query = supabase.from('error_logs').select('*').order('last_seen_at', { ascending: false }).limit(200);
      if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
      if (!showResolved) query = query.eq('is_resolved', false);
      const { data, error } = await query;
      if (error) {
        if (error.code === '42501') {
          setFetchError('Permission denied. Make sure your user ID is in the admin_users table.');
        } else {
          setFetchError(`Failed to load: ${error.message}`);
        }
        return;
      }

      // Group by fingerprint on client side
      const grouped = new Map<string, any>();
      ((data as any[]) || []).forEach(err => {
        const key = err.fingerprint || err.id;
        if (!grouped.has(key)) {
          grouped.set(key, { ...err, totalOccurrences: err.occurrence_count || 1 });
        } else {
          const existing = grouped.get(key);
          existing.totalOccurrences += (err.occurrence_count || 1);
          if (new Date(err.last_seen_at || err.created_at) > new Date(existing.last_seen_at || existing.created_at)) {
            grouped.set(key, { ...err, totalOccurrences: existing.totalOccurrences });
          }
        }
      });

      setErrors(Array.from(grouped.values()));
    } catch (err: any) {
      console.error('Admin fetch error:', err);
      setFetchError('Failed to load error logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('is_resolved', false),
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
        supabase.from('error_logs').select('user_id').eq('is_resolved', false).not('user_id', 'is', null),
      ]);
      setKpis({
        errorsToday: r1.count || 0,
        critical: r2.count || 0,
        unresolved: r3.count || 0,
        affected: new Set((r4.data as any[])?.map((e: any) => e.user_id)).size,
      });
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchErrors(); fetchKPIs(); }, [severityFilter, showResolved]);

  const markResolved = async (errorId: string) => {
    // Optimistic — hide immediately
    setErrors(prev => prev.filter(e => e.id !== errorId));
    showToast('✅ Error marked as resolved');

    const { data } = await supabase.functions.invoke('resolve-error', {
      body: { action: 'resolve_one', errorId, resolvedBy: adminId },
    });
    if (!data?.success) {
      fetchErrors(); // Restore if failed
      showToast('❌ Failed to resolve error', 'error');
    }
    fetchKPIs();
  };

  const resolveAll = async () => {
    if (!confirm('Mark all visible errors as resolved?')) return;
    const ids = errors.filter(e => !e.is_resolved).map(e => e.id);
    if (ids.length === 0) return;
    setErrors([]);
    showToast(`✅ ${ids.length} errors resolved`);

    await supabase.functions.invoke('resolve-error', {
      body: { action: 'resolve_all', errorIds: ids, resolvedBy: adminId },
    });
    fetchKPIs();
  };

  const clearResolved = async () => {
    if (!confirm('Delete all resolved errors permanently?')) return;
    await supabase.functions.invoke('resolve-error', {
      body: { action: 'delete_resolved' },
    });
    showToast('🗑 Resolved errors cleared');
    fetchErrors();
    fetchKPIs();
  };

  const testErrorLogging = async () => {
    try {
      const { error } = await supabase.functions.invoke('log-error', {
        body: {
          errorType: 'test_error',
          severity: 'warning',
          message: 'Admin manually triggered test error to verify logging pipeline',
          module: 'admin',
          pageUrl: window.location.href,
          browser: 'Admin Test',
          os: 'Admin Test',
          deviceType: 'desktop',
          additionalData: { test: true, triggeredBy: 'admin_test_button', timestamp: new Date().toISOString() },
        }
      });
      if (error) {
        showToast(`❌ Edge Function failed: ${error.message}`, 'error');
        return;
      }
      await fetchErrors();
      await fetchKPIs();
      showToast('✅ Test error logged successfully! Check the list.');
    } catch (err: any) {
      showToast(`❌ Test failed: ${err.message}`, 'error');
    }
  };

  const copyDebugReport = (err: any) => {
    const report = `## Bug Report — Shikshantaram OS
**Error Type:** ${err.error_type}
**Severity:** ${err.severity}
**Module:** ${err.module}
**Message:** ${err.message}
**Occurrences:** ${err.totalOccurrences}x (first: ${new Date(err.first_seen_at || err.created_at).toLocaleString('en-IN')}, last: ${new Date(err.last_seen_at || err.created_at).toLocaleString('en-IN')})
**Affected User:** ${err.user_email || 'Unknown'}
**Page:** ${err.page_url || 'Unknown'}
**Browser/OS:** ${err.browser || '?'} on ${err.os || '?'} (${err.device_type || '?'})

**Auto Diagnosis:** ${err.auto_diagnosis || 'Not available'}
**Suggested Fix:** ${err.suggested_fix || 'Not available'}

**Stack Trace:**
\`\`\`
${err.stack_trace || 'No stack trace available'}
\`\`\`

**Additional Data:**
\`\`\`json
${JSON.stringify(err.additional_data || {}, null, 2)}
\`\`\``;

    navigator.clipboard.writeText(report);
    showToast('📋 Debug report copied to clipboard');
  };

  if (loading) return <LoadingSpinner color="#ef4444" />;
  if (fetchError) return <div style={{ color: '#991b1b', textAlign: 'center', padding: 20 }}>❌ {fetchError}</div>;

  const sevCardColors: Record<string, { bg: string; border: string; badge: string }> = {
    warning:  { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)', badge: '#f59e0b' },
    error:    { bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.15)', badge: '#ef4444' },
    critical: { bg: 'rgba(124,58,237,0.05)', border: 'rgba(124,58,237,0.18)', badge: '#7c3aed' },
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <KPICard label="Errors Today" value={kpis.errorsToday} sub="in last 24h" icon="🔴" bg="rgba(239,68,68,0.1)" />
        <KPICard label="Critical Errors" value={kpis.critical} sub="need attention" icon="🟠" bg="rgba(249,115,22,0.1)" />
        <KPICard label="Unresolved" value={kpis.unresolved} sub="pending review" icon="🟡" bg="rgba(245,158,11,0.1)" />
        <KPICard label="Affected Users" value={kpis.affected} sub="unique users" icon="🟣" bg="rgba(124,58,237,0.1)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'warning', 'error', 'critical'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: severityFilter === s ? '#7c3aed' : '#f1f5f9', color: severityFilter === s ? 'white' : '#64748b',
            textTransform: 'capitalize' as const,
          }}>{s}</button>
        ))}
        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
        {(() => {
          const unresolvedCount = errors.filter(e => !e.is_resolved).length;
          return (
            <button onClick={resolveAll} disabled={unresolvedCount === 0} style={{
              padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(5,150,105,0.2)',
              background: 'rgba(5,150,105,0.06)', color: '#059669', fontSize: 11, fontWeight: 700,
              cursor: unresolvedCount === 0 ? 'not-allowed' : 'pointer',
              opacity: unresolvedCount === 0 ? 0.5 : 1,
            }}>{`✓ Resolve All (${unresolvedCount})`}</button>
          );
        })()}
        <button onClick={clearResolved} style={{
          padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.15)',
          background: 'rgba(239,68,68,0.05)', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>🗑 Clear Resolved</button>
        <button onClick={testErrorLogging} style={{
          padding: '5px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#f8fafc',
          color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>🧪 Test</button>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', cursor: 'pointer' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {errors.length === 0 ? (
        <div style={{ ...glassCard }}>
          <EmptyState icon="✅" title="No errors logged yet" sub="Errors will appear here automatically. Use the 🧪 Test button to verify the pipeline." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {errors.map(err => {
            const colors = sevCardColors[err.severity as string] || sevCardColors.error;
            const isExpanded = expandedId === err.id;

            return (
              <div key={err.id} style={{
                background: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : err.id)}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, background: colors.badge, color: 'white',
                    padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const, flexShrink: 0,
                  }}>{err.severity}</span>
                  <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0, fontWeight: 600 }}>{err.module}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{err.message}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {err.user_email || '—'} · {formatDate(err.last_seen_at || err.created_at)}
                    </div>
                  </div>
                  {err.totalOccurrences > 1 && (
                    <span style={{
                      fontSize: 11, fontWeight: 900, background: colors.badge, color: 'white',
                      padding: '2px 10px', borderRadius: 20, flexShrink: 0,
                    }}>×{err.totalOccurrences}</span>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : err.id); }} style={{
                      background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 10, color: '#374151',
                    }}>{isExpanded ? '▲ Less' : '▼ Details'}</button>
                    <button onClick={e => { e.stopPropagation(); copyDebugReport(err); }} style={{
                      background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 10, color: '#374151',
                    }}>📋 Copy</button>
                    {!err.is_resolved && (
                      <button onClick={e => { e.stopPropagation(); markResolved(err.id); }} style={{
                        background: 'rgba(5,150,105,0.1)', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 10, color: '#059669',
                      }}>✓ Resolve</button>
                    )}
                    {err.is_resolved && <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700 }}>✓</span>}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', display: 'grid', gap: 10 }}>
                    {err.auto_diagnosis && (
                      <div style={{ background: 'rgba(124,58,237,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>🔍 Auto Diagnosis</div>
                        <div style={{ fontSize: 12.5, color: '#1e1b4b', lineHeight: 1.5 }}>{err.auto_diagnosis}</div>
                      </div>
                    )}
                    {err.suggested_fix && (
                      <div style={{ background: 'rgba(5,150,105,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', marginBottom: 4 }}>✅ Suggested Fix</div>
                        <div style={{ fontSize: 12.5, color: '#064e3b', lineHeight: 1.5 }}>{err.suggested_fix}</div>
                      </div>
                    )}
                    {err.totalOccurrences > 1 && (
                      <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', marginBottom: 4 }}>📊 Occurrence Timeline</div>
                        <div style={{ fontSize: 12, color: '#1e3a5f' }}>
                          First seen: {new Date(err.first_seen_at || err.created_at).toLocaleString('en-IN')} · Last seen: {new Date(err.last_seen_at || err.created_at).toLocaleString('en-IN')} · Total: {err.totalOccurrences}×
                        </div>
                      </div>
                    )}
                    {err.stack_trace && (
                      <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' as const }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Stack Trace</div>
                        <pre style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace', whiteSpace: 'pre-wrap' as const, margin: 0 }}>{err.stack_trace}</pre>
                      </div>
                    )}
                    {err.additional_data && Object.keys(err.additional_data).length > 0 && (
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Additional Data</div>
                        <pre style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap' as const, margin: 0 }}>{JSON.stringify(err.additional_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}




// ─── SUB-TAB 2: AUTHENTICATED SESSIONS ───
function AuthenticatedSessionsSubTab({ adminId, showToast }: { adminId: string; showToast: (msg: string, type?: string) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const { data, error } = await supabase.from('login_sessions').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      setSessions((data as any[]) || []);
    } catch (err: any) {
      console.error('Admin fetch error:', err);
      setFetchError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const forceLogout = async (sessionId: string, userId: string, userEmail: string) => {
    await supabase.from('login_sessions').update({
      is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'forced_logout',
    } as any).eq('id', sessionId);
    // Log security event via edge function to bypass owner-only RLS
    await supabase.functions.invoke('log-error', {
      body: {
        errorType: 'force_logout', severity: 'low', module: 'security',
        message: `Admin force-logged out ${userEmail}`,
        additionalData: { session_id: sessionId, admin_id: adminId, event_type: 'force_logout' },
      },
    });
    fetchSessions();
    showToast(`⚡ Force logged out ${userEmail?.split('@')[0] || 'user'}`);
  };

  const forceLogoutAll = async () => {
    if (!confirm(`Force logout all ${sessions.length} active session(s)?\n\nThis will end every user's session immediately.\nAll users will need to log in again.`)) return;
    const count = sessions.length;
    for (const s of sessions) {
      await supabase.from('login_sessions').update({
        is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'forced_logout',
      } as any).eq('id', s.id);
    }
    await supabase.functions.invoke('log-error', {
      body: {
        errorType: 'bulk_force_logout', severity: 'warning', module: 'security',
        message: `Admin bulk force-logged out ${count} sessions`,
        additionalData: { count, admin_id: adminId },
      },
    });
    fetchSessions();
    showToast(`⚡ Force logged out ${count} session(s)`);
  };

  const deviceIcon = (d: string) => d === 'mobile' ? '📱' : d === 'tablet' ? '📋' : '💻';
  const formatLocation = (s: any) => {
    const parts = [s.ip_city, s.ip_state].filter(Boolean);
    return parts.length > 0 ? `${parts.join(', ')} 🇮🇳` : s.ip_country || '—';
  };

  if (loading) return <LoadingSpinner color="#06b6d4" />;
  if (fetchError) return <div style={{ color: '#991b1b', textAlign: 'center', padding: 20 }}>❌ {fetchError}</div>;

  return (
    <div>
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#0891b2' }}>
          Users with an open login session (may be idle). For real-time activity, see the <strong>Overview</strong> tab.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{sessions.length} authenticated session{sessions.length !== 1 ? 's' : ''}</span>
        <div style={{ flex: 1 }} />
        {sessions.length > 0 && (
          <button onClick={forceLogoutAll} style={{
            padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>⚡ Force Logout All ({sessions.length})</button>
        )}
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {sessions.length === 0 ? (
          <EmptyState icon="🔐" title="No active sessions" sub="No users are currently logged in." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['User', 'IP Address', 'Location', 'ISP', 'Device', 'Browser', 'OS', 'Started', 'Last Seen', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{s.user_email?.split('@')[0] || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{s.ip_address}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{formatLocation(s)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.ip_isp || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 14 }}>{deviceIcon(s.device_type)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.browser}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{s.os}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>{formatDate(s.created_at)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>{formatDate(s.last_seen)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => forceLogout(s.id, s.user_id, s.user_email)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Force Logout</button>
                    </td>
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

// ─── SUB-TAB 3: LOGIN HISTORY ───
function LoginHistorySubTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [dateFilter, setDateFilter] = useState('7d');
  const [userFilter, setUserFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setFetchError('');
      let query = supabase.from('login_sessions').select('*').order('created_at', { ascending: false }).limit(200);
      if (userFilter) query = query.ilike('user_email', `%${userFilter}%`);
      if (dateFilter === '7d') query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (dateFilter === '30d') query = query.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      const { data, error } = await query;
      if (error) throw error;
      setHistory((data as any[]) || []);
    } catch (err: any) {
      console.error('Admin fetch error:', err);
      setFetchError('Failed to load login history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [dateFilter, userFilter]);

  const statusBadge = (s: any) => {
    const isActive = s.is_active;
    const reason = s.logout_reason;
    const config = isActive
      ? { label: '🟢 Active',       bg: 'rgba(5,150,105,0.1)',   color: '#059669',  border: 'rgba(5,150,105,0.2)'  }
      : reason === 'forced_logout' || reason === 'force_logout'
      ? { label: '⚡ Force Ended',  bg: 'rgba(239,68,68,0.08)',  color: '#dc2626',  border: 'rgba(239,68,68,0.2)'  }
      : reason === 'idle_timeout'
      ? { label: '⏰ Idle Timeout', bg: 'rgba(245,158,11,0.08)', color: '#b45309',  border: 'rgba(245,158,11,0.2)' }
      : reason === 'security_block'
      ? { label: '🚫 Blocked',      bg: 'rgba(124,58,237,0.08)', color: '#7c3aed',  border: 'rgba(124,58,237,0.2)' }
      : { label: '⚪ Logged Out',   bg: '#f8fafc',               color: '#64748b',  border: '#e2e8f0'              };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' as const,
        padding: '4px 10px', borderRadius: 50, border: `1px solid ${config.border}`,
        background: config.bg, color: config.color, fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700, fontSize: 11,
      }}>
        {config.label}
      </span>
    );
  };

  const deviceIcon = (d: string) => d === 'mobile' ? '📱' : d === 'tablet' ? '📋' : '💻';

  if (loading) return <LoadingSpinner color="#3b82f6" />;
  if (fetchError) return <div style={{ color: '#991b1b', textAlign: 'center', padding: 20 }}>❌ {fetchError}</div>;

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 220 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
          <input value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder="Search by email..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none', background: 'white', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ flex: 1 }} />
        {[
          { label: '7 Days', value: '7d' },
          { label: '30 Days', value: '30d' },
          { label: 'All Time', value: 'all' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setDateFilter(opt.value)} style={{
            padding: '7px 16px', borderRadius: 50, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const, transition: 'all 0.15s',
            border: dateFilter === opt.value ? 'none' : '1.5px solid #e2e8f0',
            background: dateFilter === opt.value ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'white',
            color: dateFilter === opt.value ? 'white' : '#64748b',
          }}>{opt.label}</button>
        ))}
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
          {history.length} records
        </span>
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 40, background: '#f8fafc', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <EmptyState icon="📭" title="No login history found" sub={userFilter ? `No results for "${userFilter}"` : 'Login records will appear here as users sign in.'} />
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960, tableLayout: 'fixed' as const }}>
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '4%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '130px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Time', 'User', 'IP', 'Location', 'ISP', '', 'Browser', 'OS', 'Status'].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase' as const, textAlign: 'left' as const,
                      letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif',
                      whiteSpace: 'nowrap' as const,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((s, i) => {
                  const isExpanded = expandedId === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9', cursor: 'pointer',
                          background: i % 2 === 0 ? 'white' : '#fafbfc',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafbfc')}
                      >
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{formatDate(s.created_at)}</td>
                        <td style={{ padding: '10px 12px', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{s.user_email?.split('@')[0] || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{s.ip_address}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{[s.ip_city, s.ip_state].filter(Boolean).join(', ') || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{s.ip_isp || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 14, textAlign: 'center' as const }}>{deviceIcon(s.device_type)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{s.browser || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{s.os || '—'}</td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle' as const }}>{statusBadge(s)}</td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td colSpan={9} style={{ padding: '0 12px 14px' }}>
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 4 }}>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Full Email</div>
                                <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{s.user_email || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Session Token</div>
                                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{s.session_token?.slice(0, 12)}...</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>User Agent</div>
                                <div style={{ fontSize: 11, color: '#64748b', wordBreak: 'break-all' as const, maxHeight: 40, overflow: 'hidden' }}>{s.user_agent || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Login Time</div>
                                <div style={{ fontSize: 12, color: '#0f172a' }}>{new Date(s.created_at).toLocaleString('en-IN')}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Last Seen</div>
                                <div style={{ fontSize: 12, color: '#0f172a' }}>{s.last_seen ? new Date(s.last_seen).toLocaleString('en-IN') : '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Logout</div>
                                <div style={{ fontSize: 12, color: '#0f172a' }}>
                                  {s.logged_out_at ? `${new Date(s.logged_out_at).toLocaleString('en-IN')} (${s.logout_reason || 'manual'})` : '—'}
                                </div>
                              </div>
                              {s.ip_org && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Organization</div>
                                  <div style={{ fontSize: 12, color: '#0f172a' }}>{s.ip_org}</div>
                                </div>
                              )}
                              {s.ip_timezone && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 4 }}>Timezone</div>
                                  <div style={{ fontSize: 12, color: '#0f172a' }}>{s.ip_timezone}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUB-TAB 4: SECURITY EVENTS ───
function SecurityEventsSubTab({ adminId, showToast }: { adminId: string; showToast: (msg: string, type?: string) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showReviewed, setShowReviewed] = useState(false);
  const [kpis, setKpis] = useState({ eventsToday: 0, unreviewed: 0, highSeverity: 0, blockedAttempts: 0 });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setFetchError('');
      let query = supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(100);
      if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
      if (!showReviewed) query = query.eq('is_reviewed', false);
      const { data, error } = await query;
      if (error) throw error;
      setEvents((data as any[]) || []);
    } catch (err: any) {
      console.error('Admin fetch error:', err);
      setFetchError('Failed to load security events.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('security_events').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('is_reviewed', false),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).in('severity', ['high', 'critical']).eq('is_reviewed', false),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('event_type', 'blocked_login_attempt'),
      ]);
      setKpis({
        eventsToday: r1.count || 0,
        unreviewed: r2.count || 0,
        highSeverity: r3.count || 0,
        blockedAttempts: r4.count || 0,
      });
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchEvents(); fetchKPIs(); }, [severityFilter, showReviewed]);

  const markReviewed = async (eventId: string, notes = '') => {
    await supabase.from('security_events').update({
      is_reviewed: true, reviewed_by: adminId, reviewed_at: new Date().toISOString(), admin_notes: notes,
    } as any).eq('id', eventId);
    fetchEvents();
    fetchKPIs();
    showToast('✅ Event marked as reviewed');
  };

  const markAllReviewed = async () => {
    const unreviewedCount = events.filter(e => !e.is_reviewed).length;
    if (unreviewedCount === 0) return;
    if (!confirm(`Mark all ${unreviewedCount} unreviewed events as reviewed?`)) return;
    const ids = events.filter(e => !e.is_reviewed).map(e => e.id);
    for (const id of ids) {
      await supabase.from('security_events').update({
        is_reviewed: true, reviewed_by: adminId, reviewed_at: new Date().toISOString(),
      } as any).eq('id', id);
    }
    fetchEvents();
    fetchKPIs();
    showToast(`✅ ${unreviewedCount} events marked as reviewed`);
  };

  if (loading) return <LoadingSpinner color="#f59e0b" />;
  if (fetchError) return <div style={{ color: '#991b1b', textAlign: 'center', padding: 20 }}>❌ {fetchError}</div>;

  const unreviewedCount = events.filter(e => !e.is_reviewed).length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <KPICard label="Events Today" value={kpis.eventsToday} sub="in last 24h" icon="🛡" bg="rgba(6,182,212,0.1)" />
        <KPICard label="Unreviewed" value={kpis.unreviewed} sub="pending review" icon="📋" bg="rgba(245,158,11,0.1)" />
        <KPICard label="High Severity" value={kpis.highSeverity} sub="need attention" icon="⚠️" bg="rgba(249,115,22,0.1)" />
        <KPICard label="Blocked Attempts" value={kpis.blockedAttempts} sub="login denied" icon="🚫" bg="rgba(239,68,68,0.1)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'low', 'medium', 'high', 'critical'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: severityFilter === s ? '#7c3aed' : '#f1f5f9', color: severityFilter === s ? 'white' : '#64748b',
            textTransform: 'capitalize',
          }}>{s}</button>
        ))}
        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
        {unreviewedCount > 0 && (
          <button onClick={markAllReviewed} style={{
            padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(5,150,105,0.2)',
            background: 'rgba(5,150,105,0.06)', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>✓ Mark All Reviewed ({unreviewedCount})</button>
        )}
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', cursor: 'pointer' }}>
          <input type="checkbox" checked={showReviewed} onChange={e => setShowReviewed(e.target.checked)} />
          Show reviewed
        </label>
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        {events.length === 0 ? (
          <EmptyState icon="🎉" title="No security events" sub="No matching events found." />
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {events.map(ev => {
              const sev = severityColors[ev.severity] || severityColors.medium;
              return (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, width: 60 }}>{formatDate(ev.created_at)}</span>
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
function BlockedUsersSubTab({ adminId, showToast }: { adminId: string; showToast: (msg: string, type?: string) => void }) {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [blockEmail, setBlockEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const fetchBlocked = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const { data, error } = await supabase.from('user_security_settings').select('*').eq('is_blocked', true).order('blocked_at', { ascending: false });
      if (error) throw error;
      setBlocked((data as any[]) || []);
    } catch (err: any) {
      console.error('Admin fetch error:', err);
      setFetchError('Failed to load blocked users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlocked(); }, []);

  const unblockUser = async (userId: string, email: string) => {
    await supabase.from('user_security_settings').update({
      is_blocked: false, block_reason: null, blocked_at: null, blocked_by: null,
    } as any).eq('user_id', userId);
    // Use edge function to bypass owner-only RLS on security_events
    await supabase.functions.invoke('log-error', {
      body: {
        errorType: 'user_unblocked', severity: 'low', module: 'security',
        message: `Admin unblocked user: ${email}`,
        additionalData: { user_id: userId, admin_id: adminId, event_type: 'user_unblocked' },
      },
    });
    fetchBlocked();
    showToast(`✅ ${email} unblocked successfully`);
  };

  const blockNewUser = async () => {
    if (!blockEmail.trim()) return;
    setBlocking(true);
    try {
      const { data: sessionData } = await supabase.from('login_sessions').select('user_id').eq('user_email', blockEmail.trim().toLowerCase()).limit(1);
      const userId = (sessionData as any[])?.[0]?.user_id;
      if (!userId) {
        showToast('User not found. They must have logged in at least once.', 'error');
        setBlocking(false);
        return;
      }
      await supabase.from('user_security_settings').upsert({
        user_id: userId, user_email: blockEmail.trim(),
        is_blocked: true, block_reason: blockReason || 'Blocked by admin',
        blocked_at: new Date().toISOString(), blocked_by: adminId,
      } as any, { onConflict: 'user_id' });
      await supabase.functions.invoke('log-error', {
        body: {
          errorType: 'user_blocked', severity: 'high', module: 'security',
          message: `Admin blocked user: ${blockEmail.trim()} — ${blockReason || 'No reason specified'}`,
          additionalData: { user_id: userId, admin_id: adminId, event_type: 'user_blocked' },
        },
      });
      setBlockEmail('');
      setBlockReason('');
      fetchBlocked();
      showToast(`🚫 ${blockEmail.trim()} blocked successfully`);
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setBlocking(false);
    }
  };

  if (loading) return <LoadingSpinner color="#ef4444" />;
  if (fetchError) return <div style={{ color: '#991b1b', textAlign: 'center', padding: 20 }}>❌ {fetchError}</div>;

  return (
    <div>
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

      {blocked.length === 0 ? (
        <div style={{ ...glassCard }}><EmptyState icon="🎉" title="No blocked users" sub="All users are currently allowed access." /></div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {blocked.map(u => (
            <div key={u.id} style={{ ...glassCard, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{u.user_email || 'Unknown'}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#ef4444', marginTop: 4 }}>🚫 {u.block_reason || 'No reason specified'}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Blocked: {u.blocked_at ? formatDate(u.blocked_at) : '—'} · Violations: {u.violation_count || 0}
                  </div>
                </div>
                <button onClick={() => unblockUser(u.user_id, u.user_email)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Unblock</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HEALTH MONITOR CARD ───
function HealthMonitorCard() {
  const [data, setData] = useState<{ last1h: number; last24h: number; trend: 'stable' | 'spike' | 'declining'; spikeAlert: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const now = new Date();
        const h1Ago = new Date(now.getTime() - 3600000).toISOString();
        const h24Ago = new Date(now.getTime() - 86400000).toISOString();
        const h48Ago = new Date(now.getTime() - 172800000).toISOString();

        // Exclude self-generated health_monitor entries to prevent feedback loop
        const [r1h, r24h, rPrev24h] = await Promise.all([
          supabase.from('error_logs').select('*', { count: 'exact', head: true }).gte('created_at', h1Ago).eq('is_resolved', false).neq('module', 'health_monitor'),
          supabase.from('error_logs').select('*', { count: 'exact', head: true }).gte('created_at', h24Ago).eq('is_resolved', false).neq('module', 'health_monitor'),
          supabase.from('error_logs').select('*', { count: 'exact', head: true }).gte('created_at', h48Ago).lt('created_at', h24Ago).eq('is_resolved', false).neq('module', 'health_monitor'),
        ]);

        const last1h = r1h.count || 0;
        const last24h = r24h.count || 0;
        const prev24h = rPrev24h.count || 0;

        // Spike detection: if last 1h errors > 5 AND last 1h > 50% of entire 24h count
        let trend: 'stable' | 'spike' | 'declining' = 'stable';
        let spikeAlert: string | null = null;

        if (last1h >= 5 && (last24h === 0 || last1h / Math.max(last24h, 1) > 0.5)) {
          trend = 'spike';
          spikeAlert = `⚠️ ${last1h} errors in the last hour — investigate immediately`;

          // Send spike alert email (fire-and-forget, deduplicated server-side)
          try {
            await supabase.functions.invoke('log-error', {
              body: {
                errorType: 'health_spike_alert',
                severity: 'critical',
                message: `Health Monitor Spike: ${last1h} errors in the last hour (${last24h} in 24h)`,
                module: 'health_monitor',
                pageUrl: window.location.href,
                additionalData: { last1h, last24h, prev24h, detectedAt: new Date().toISOString() },
              },
            });
          } catch (_) { /* alert failure should never block UI */ }
        } else if (last24h < prev24h * 0.5) {
          trend = 'declining';
        }

        setData({ last1h, last24h, trend, spikeAlert });
      } catch (_) {
        setData({ last1h: 0, last24h: 0, trend: 'stable', spikeAlert: null });
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner color="#3b82f6" />;
  if (!data) return null;

  const trendConfig = {
    stable: { label: '✅ Stable', color: '#15803d', bg: 'rgba(5,150,105,0.08)' },
    spike: { label: '🔥 Spike Detected', color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
    declining: { label: '📉 Declining', color: '#2563eb', bg: 'rgba(59,130,246,0.08)' },
  };

  const tc = trendConfig[data.trend];

  return (
    <div style={{ ...glassCard, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💓</span>
          <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>System Health Monitor</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
          background: tc.bg, color: tc.color,
        }}>{tc.label}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: data.spikeAlert ? 12 : 0 }}>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
          <div style={{ fontFamily: 'Sora', fontSize: 24, fontWeight: 900, color: data.last1h >= 5 ? '#dc2626' : '#0f172a' }}>{data.last1h}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Errors (Last 1h)</div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
          <div style={{ fontFamily: 'Sora', fontSize: 24, fontWeight: 900, color: data.last24h >= 20 ? '#ea580c' : '#0f172a' }}>{data.last24h}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Errors (Last 24h)</div>
        </div>
      </div>

      {data.spikeAlert && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>{data.spikeAlert}</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN SECURITY TAB ───
export default function SecurityTab({ adminId, showToast }: { adminId: string; showToast: (msg: string, type?: string) => void }) {
  const [subTab, setSubTab] = useState('errors');

  const subTabs = [
    { id: 'errors', label: '🔴 Error Logs' },
    { id: 'sessions', label: '🔐 Authenticated Sessions' },
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

      {/* Health Monitor — always visible at top */}
      <HealthMonitorCard />

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

      {subTab === 'errors' && <ErrorLogsSubTab adminId={adminId} showToast={showToast} />}
      {subTab === 'sessions' && <AuthenticatedSessionsSubTab adminId={adminId} showToast={showToast} />}
      {subTab === 'history' && <LoginHistorySubTab />}
      {subTab === 'events' && <SecurityEventsSubTab adminId={adminId} showToast={showToast} />}
      {subTab === 'blocked' && <BlockedUsersSubTab adminId={adminId} showToast={showToast} />}
    </div>
  );
}
