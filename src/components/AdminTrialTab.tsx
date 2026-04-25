import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminIpLookupModal from './AdminIpLookupModal';
import TrialAuditLog from './TrialAuditLog';

interface TrialRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  ip_address: string | null;
  user_agent: string | null;
  status: 'pending' | 'approved' | 'expired' | 'upgraded' | 'rejected' | string;
  otp_verified: boolean | null;
  submitted_at: string;
  approved_at: string | null;
  access_starts_at: string | null;
  access_ends_at: string | null;
  access_duration_days: number | null;
  trial_credits: number | null;
  upgraded_at: string | null;
  upgraded_to_tier: string | null;
  admin_notes: string | null;
  user_id: string | null;
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

const fmt = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}, ${d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const fmtRelative = (s: string | null | undefined) => {
  if (!s) return '—';
  const ms = new Date(s).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
};

const statusBadge = (status: string): React.CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef9c3', color: '#92400e' },
    approved: { bg: '#dcfce7', color: '#15803d' },
    expired: { bg: '#fee2e2', color: '#991b1b' },
    upgraded: { bg: '#ede9fe', color: '#7c3aed' },
    rejected: { bg: '#f1f5f9', color: '#64748b' },
  };
  const m = map[status] || map.rejected;
  return {
    fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
    textTransform: 'uppercase', background: m.bg, color: m.color,
  };
};

export default function AdminTrialTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'requests' | 'users' | 'audit'>('requests');
  const [extending, setExtending] = useState<TrialRequest | null>(null);
  const [extendDays, setExtendDays] = useState(3);
  const [extendReason, setExtendReason] = useState('');
  const [working, setWorking] = useState(false);
  const [ipLookup, setIpLookup] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trial_requests')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(500);
    if (error) {
      showToast('Failed to load trial requests', 'error');
    } else {
      setRequests((data || []) as unknown as TrialRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const expired = requests.filter(r => r.status === 'expired');
  const upgraded = requests.filter(r => r.status === 'upgraded');

  const approve = async (req: TrialRequest) => {
    if (!confirm(`Approve trial access for ${req.full_name} (${req.email})?\n\nThis will create their account, send a welcome email, and grant 100 starter credits.`)) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-trial-user', {
        body: { requestId: req.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      showToast(`✅ ${req.full_name} approved — credentials emailed.`, 'success');
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to approve';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setWorking(false);
    }
  };

  const reject = async (req: TrialRequest) => {
    if (!confirm(`Reject trial request from ${req.full_name}?`)) return;
    setWorking(true);
    const { error } = await supabase
      .from('trial_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() } as any)
      .eq('id', req.id);
    if (error) {
      showToast('Failed to reject', 'error');
    } else {
      showToast(`Request from ${req.full_name} rejected.`, 'warning');
      load();
    }
    setWorking(false);
  };

  const upgrade = async (req: TrialRequest) => {
    if (!confirm(`Upgrade ${req.full_name} to a permanent paid user?\n\nThis will:\n• Remove the trial countdown\n• Add 500 bonus credits\n• Send an upgrade-confirmation email`)) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-trial-to-user', {
        body: { requestId: req.id, newTier: 'basic' },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      showToast(`🚀 ${req.full_name} upgraded successfully.`, 'success');
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to upgrade';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setWorking(false);
    }
  };

  const submitExtend = async () => {
    if (!extending) return;
    if (extendDays < 1 || extendDays > 30) {
      showToast('Days must be between 1 and 30', 'error');
      return;
    }
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('extend-trial', {
        body: { requestId: extending.id, additionalDays: extendDays, reason: extendReason || null },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      showToast(`⏱️ Extended by ${extendDays} day(s).`, 'success');
      setExtending(null);
      setExtendDays(3);
      setExtendReason('');
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to extend';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setWorking(false);
    }
  };

  const ipCounts: Record<string, number> = {};
  requests.forEach(r => {
    if (r.ip_address) ipCounts[r.ip_address] = (ipCounts[r.ip_address] || 0) + 1;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#92400e' }}>⏳ {pending.length} Pending</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>✅ {approved.length} Active Trials</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>⏰ {expired.length} Expired</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#ede9fe', color: '#7c3aed' }}>🚀 {upgraded.length} Upgraded</span>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 12, marginBottom: 16 }}>
        {[
          { id: 'requests' as const, label: '📥 Trial Requests', count: pending.length },
          { id: 'users' as const, label: '👤 Active Trial Users', count: approved.length },
          { id: 'audit' as const, label: '📜 Audit Log', count: null },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: view === t.id ? 800 : 600, fontSize: 12.5,
            background: view === t.id ? 'white' : 'transparent',
            color: view === t.id ? '#0f172a' : '#64748b',
            boxShadow: view === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}{t.count !== null && <span style={{ marginLeft: 4, fontSize: 11, color: '#94a3b8' }}>({t.count})</span>}</button>
        ))}
      </div>

      {view === 'requests' && (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>⏳ Awaiting Approval</div>
              <div style={{ ...glassCard, overflow: 'hidden', border: '1.5px solid #fde68a' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fffbeb' }}>
                      {['Name', 'Email', 'Phone', 'IP', 'OTP', 'Submitted', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(r => {
                      const flagged = r.ip_address && ipCounts[r.ip_address] > 1;
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{r.full_name}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{r.email}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{r.phone}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11.5, color: flagged ? '#991b1b' : '#94a3b8', fontWeight: flagged ? 700 : 400 }}>
                            {r.ip_address ? (
                              <button onClick={() => setIpLookup(r.ip_address!)}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11.5, fontFamily: 'monospace', color: flagged ? '#991b1b' : '#475569', textDecoration: 'underline', fontWeight: flagged ? 700 : 500 }}
                                title="Click to look up all accounts on this IP">
                                {r.ip_address}
                              </button>
                            ) : '—'}
                            {flagged && (
                              <span title={`This IP appears in ${ipCounts[r.ip_address!]} trial requests`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#fee2e2', color: '#991b1b' }}>
                                ⚠ ×{ipCounts[r.ip_address!]}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: r.otp_verified ? '#dcfce7' : '#fef9c3', color: r.otp_verified ? '#15803d' : '#92400e' }}>
                              {r.otp_verified ? '✓ Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 11.5, color: '#94a3b8' }}>{fmt(r.submitted_at)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button disabled={working} onClick={() => approve(r)} style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.5 : 1 }}>✅ Approve</button>
                              <button disabled={working} onClick={() => reject(r)} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.5 : 1 }}>✗ Reject</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(expired.length + upgraded.length + requests.filter(r => r.status === 'rejected').length) > 0 && (
            <div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>📋 History</div>
              <div style={{ ...glassCard, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Name', 'Email', 'IP', 'Status', 'Submitted', 'Ended'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.filter(r => ['expired', 'upgraded', 'rejected'].includes(r.status)).map(r => (
                      <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.full_name}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{r.email}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8' }}>
                          {r.ip_address ? (
                            <button onClick={() => setIpLookup(r.ip_address!)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', color: '#475569', textDecoration: 'underline' }} title="Look up all accounts on this IP">{r.ip_address}</button>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}><span style={statusBadge(r.status)}>{r.status}</span></td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8' }}>{fmt(r.submitted_at)}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8' }}>{fmt(r.upgraded_at || r.access_ends_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {requests.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16 }}>No trial requests yet</div>
            </div>
          )}
        </>
      )}

      {view === 'users' && (
        <>
          {approved.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16 }}>No active trial users right now</div>
            </div>
          ) : (
            <div style={{ ...glassCard, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    {['Name', 'Email', 'Started', 'Ends', 'Time Left', 'Credits', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approved.map(r => {
                    const ms = r.access_ends_at ? new Date(r.access_ends_at).getTime() - Date.now() : 0;
                    const urgent = ms > 0 && ms < 86400000;
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{r.full_name}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{r.email}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11.5, color: '#94a3b8' }}>{fmt(r.access_starts_at)}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11.5, color: '#94a3b8' }}>{fmt(r.access_ends_at)}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: urgent ? '#991b1b' : '#0f172a' }}>{fmtRelative(r.access_ends_at)}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#0f172a' }}>{r.trial_credits ?? '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button disabled={working} onClick={() => { setExtending(r); setExtendDays(3); setExtendReason(''); }} style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11.5, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.5 : 1 }}>⏱️ Extend</button>
                            <button disabled={working} onClick={() => upgrade(r)} style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px 10px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11.5, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.5 : 1 }}>🚀 Upgrade</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {extending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 6 }}>⏱️ Extend Trial</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Extending trial for <strong style={{ color: '#0f172a' }}>{extending.full_name}</strong>
              <br />Currently: {fmtRelative(extending.access_ends_at)}
            </div>

            <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Additional days</label>
            <input type="number" min={1} max={30} value={extendDays} onChange={e => setExtendDays(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', marginBottom: 14, outline: 'none', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Reason (optional)</label>
            <textarea value={extendReason} onChange={e => setExtendReason(e.target.value)} placeholder="e.g. Customer requested more time" rows={3} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, fontFamily: 'DM Sans', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button disabled={working} onClick={() => setExtending(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, padding: '10px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={working} onClick={submitExtend} style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 22px', fontFamily: 'DM Sans', fontWeight: 800, fontSize: 13, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1 }}>
                {working ? 'Extending…' : `Extend by ${extendDays}d`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
