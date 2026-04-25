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

  // Approve modal
  const [approving, setApproving] = useState<TrialRequest | null>(null);
  const [approveDays, setApproveDays] = useState<2 | 7 | 14 | 30>(7);
  const [approveNotes, setApproveNotes] = useState('');

  // Upgrade modal (matches Signups → Approve Access pattern)
  const [upgrading, setUpgrading] = useState<TrialRequest | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<'basic' | 'premium' | 'beta'>('premium');
  const [upgradeAmount, setUpgradeAmount] = useState<number>(0);
  const [upgradeNotes, setUpgradeNotes] = useState('');

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

  const openApprove = (req: TrialRequest) => {
    setApproving(req);
    setApproveDays(7);
    setApproveNotes('');
  };

  const confirmApprove = async () => {
    if (!approving) return;
    setWorking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('approve-trial-user', {
        body: {
          requestId: approving.id,
          durationDays: approveDays,
          adminNotes: approveNotes.trim() || null,
          adminId: user?.id,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      showToast(`✅ ${approving.full_name} approved for ${approveDays} days — credentials emailed.`, 'success');
      setApproving(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to approve';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setWorking(false);
    }
  };

  const reject = async (req: TrialRequest) => {
    const reason = prompt(`Reject trial request from ${req.full_name}?\n\nOptional internal reason (leave blank to skip):`, '');
    if (reason === null) return; // cancelled
    setWorking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('reject-trial-request', {
        body: { requestId: req.id, reason: reason.trim() || null, adminId: user?.id },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || 'Failed to reject';
        showToast(msg, 'error');
      } else {
        showToast(`Request from ${req.full_name} rejected.`, 'warning');
        load();
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to reject', 'error');
    } finally {
      setWorking(false);
    }
  };

  const openUpgrade = (req: TrialRequest) => {
    setUpgrading(req);
    setUpgradeTier('premium');
    setUpgradeAmount(0);
    setUpgradeNotes('');
  };

  const confirmUpgrade = async () => {
    if (!upgrading) return;
    setWorking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('upgrade-trial-to-user', {
        body: {
          requestId: upgrading.id,
          newTier: upgradeTier,
          paymentAmount: Number(upgradeAmount) || 0,
          adminNotes: upgradeNotes.trim() || null,
          adminId: user?.id,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const tierLabel = upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1);
      showToast(`🚀 ${upgrading.full_name} upgraded to ${tierLabel}.`, 'success');
      setUpgrading(null);
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
                              <button disabled={working} onClick={() => openApprove(r)} style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.5 : 1 }}>✅ Approve</button>
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
                            <button disabled={working} onClick={() => openUpgrade(r)} style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px 10px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11.5, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.5 : 1 }}>🚀 Upgrade</button>
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

      {view === 'audit' && <TrialAuditLog onIpLookup={(ip) => setIpLookup(ip)} />}

      {ipLookup && <AdminIpLookupModal ip={ipLookup} onClose={() => setIpLookup(null)} />}

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

      {approving && (() => {
        // Detect existing active trial for the same email (avoid duplicate approvals)
        const activeForSameEmail = approved.find(a =>
          a.id !== approving.id &&
          a.email.toLowerCase() === approving.email.toLowerCase() &&
          a.access_ends_at && new Date(a.access_ends_at).getTime() > Date.now()
        );
        const payload = {
          requestId: approving.id,
          durationDays: approveDays,
          adminNotes: approveNotes.trim() || null,
        };
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 0, maxWidth: 520, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 17, color: 'white' }}>✅ Approve Trial Access</div>
              <button onClick={() => setApproving(null)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 14 }}>
                  {approving.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{approving.full_name}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{approving.email}</div>
                </div>
              </div>

              {activeForSameEmail && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontFamily: 'DM Sans', fontSize: 12, color: '#991b1b', lineHeight: 1.55 }}>
                  ⚠ <strong>Conflict:</strong> this email already has an active trial ({fmtRelative(activeForSameEmail.access_ends_at)}). Approving again will create a parallel trial. Consider <strong>Extend</strong> instead.
                </div>
              )}

              {/* TRIAL ACCESS CONFIGURATION */}
              <div style={{ background: 'linear-gradient(135deg,#faf5ff,#f0fdf4)', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#7c3aed', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎁 Trial Access Configuration</div>

                <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trial Duration</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                  {([2, 7, 14, 30] as const).map(d => {
                    const active = approveDays === d;
                    return (
                      <button key={d} onClick={() => setApproveDays(d)} style={{
                        padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                        border: active ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                        background: active ? '#f5f3ff' : 'white',
                        fontFamily: 'Sora', fontWeight: 800, fontSize: 15,
                        color: active ? '#7c3aed' : '#0f172a',
                      }}>
                        {d}d
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#475569', lineHeight: 1.6 }}>
                  <strong>Tier:</strong> Basic · <strong>Credits:</strong> 100 starter · <strong>Tools:</strong> Niche Clarity & Product Navigator
                  <br /><strong>Expires:</strong> {new Date(Date.now() + approveDays * 86400000).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Internal notes (optional)</label>
              <textarea value={approveNotes} onChange={e => setApproveNotes(e.target.value)} placeholder="e.g. Friend of Abhinav, fast-track" rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />

              {/* DEBUG PAYLOAD PANEL */}
              <details style={{ background: '#0f172a', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11.5 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#7dd3fc', userSelect: 'none', outline: 'none' }}>
                  🔍 Debug — payload preview (click to inspect)
                </summary>
                <div style={{ marginTop: 10, fontSize: 10.5, color: '#94a3b8' }}>POST → <span style={{ color: '#fbbf24' }}>functions/v1/approve-trial-user</span></div>
                <pre style={{ margin: '8px 0 0', padding: 10, background: '#020617', borderRadius: 8, overflow: 'auto', maxHeight: 180, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{JSON.stringify(payload, null, 2)}
                </pre>
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(payload, null, 2))} style={{ marginTop: 8, background: '#1e293b', color: '#7dd3fc', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', fontFamily: 'monospace', fontSize: 10.5, cursor: 'pointer' }}>📋 Copy JSON</button>
              </details>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc', position: 'sticky', bottom: 0 }}>
              <button disabled={working} onClick={() => setApproving(null)} style={{ background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={working} onClick={confirmApprove} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, padding: '11px 22px', fontFamily: 'DM Sans', fontWeight: 800, fontSize: 13, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1, boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                {working ? 'Approving…' : `✅ Approve & Send Email →`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {upgrading && (() => {
        const tiers = [
          { id: 'basic' as const, label: 'Basic', icon: '🔒', desc: '2 tools', accent: '#64748b', bg: '#f1f5f9' },
          { id: 'premium' as const, label: 'Premium', icon: '⚡', desc: 'All tools', accent: '#7c3aed', bg: '#f5f3ff' },
          { id: 'beta' as const, label: 'Beta', icon: '🧪', desc: 'All + previews', accent: '#db2777', bg: '#fdf2f8' },
        ];
        const expiryStr = new Date(upgrading.access_ends_at || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 0, maxWidth: 520, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 17, color: 'white' }}>🚀 Upgrade to Paid User</div>
              <button onClick={() => setUpgrading(null)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 14 }}>
                  {upgrading.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{upgrading.full_name}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{upgrading.email}</div>
                </div>
                <div style={{ background: '#fef9c3', color: '#92400e', fontFamily: 'DM Sans', fontWeight: 800, fontSize: 10, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase' }}>Trial · ends {expiryStr}</div>
              </div>

              <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Tier</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
                {tiers.map(t => {
                  const active = upgradeTier === t.id;
                  return (
                    <button key={t.id} onClick={() => setUpgradeTier(t.id)} style={{
                      padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                      border: active ? `2px solid ${t.accent}` : '1.5px solid #e2e8f0',
                      background: active ? t.bg : 'white',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      <div style={{ fontSize: 22 }}>{t.icon}</div>
                      <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: active ? t.accent : '#0f172a' }}>{t.label}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 10.5, color: '#94a3b8' }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>

              <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Amount (₹)</label>
              <input type="number" min={0} value={upgradeAmount} onChange={e => setUpgradeAmount(parseInt(e.target.value) || 0)} placeholder="0" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', marginBottom: 14, outline: 'none', boxSizing: 'border-box' }} />

              <label style={{ display: 'block', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Internal Notes (optional)</label>
              <textarea value={upgradeNotes} onChange={e => setUpgradeNotes(e.target.value)} placeholder="e.g. Paid via UPI" rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />

              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', fontFamily: 'DM Sans', fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
                ✓ Removes trial countdown · Adds <strong>500 bonus credits</strong> · Sends upgrade-confirmation email
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc', position: 'sticky', bottom: 0 }}>
              <button disabled={working} onClick={() => setUpgrading(null)} style={{ background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button disabled={working} onClick={confirmUpgrade} style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10, padding: '11px 22px', fontFamily: 'DM Sans', fontWeight: 800, fontSize: 13, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1, boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
                {working ? 'Upgrading…' : `🚀 Upgrade to ${upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1)} →`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
