import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EmailRow = {
  id: string;
  created_at: string;
  email_type: string;
  recipient_email: string;
  recipient_user_id: string | null;
  status: 'sent' | 'failed';
  error_message: string | null;
  provider_message_id: string | null;
  triggered_by_email: string | null;
  context: string | null;
  metadata: Record<string, any> | null;
};

const TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  password_reset: { label: 'Password Reset', color: '#0284c7', icon: '🔐' },
  welcome_approval: { label: 'Welcome / Approval', color: '#059669', icon: '🎉' },
  welcome: { label: 'Welcome', color: '#059669', icon: '👋' },
  trial_approval: { label: 'Trial Approval', color: '#7c3aed', icon: '🚀' },
  rejection: { label: 'Rejection', color: '#64748b', icon: '✋' },
  upgrade: { label: 'Tier Upgrade', color: '#ec4899', icon: '⚡' },
  gift_credits: { label: 'Gift Credits', color: '#f59e0b', icon: '🎁' },
};

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  padding: 16,
};

export default function AdminEmailDeliveryTab({ showToast }: { showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [detail, setDetail] = useState<EmailRow | null>(null);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - rangeDays * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('email_delivery_log' as any)
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      showToast?.(`Failed to load email log: ${error.message}`, 'error');
      setRows([]);
    } else {
      setRows((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [rangeDays]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.email_type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.recipient_email.toLowerCase().includes(s) &&
          !(r.error_message || '').toLowerCase().includes(s) &&
          !(r.triggered_by_email || '').toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [rows, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter(r => r.status === 'sent').length;
    const failed = rows.filter(r => r.status === 'failed').length;
    const rate = total ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, rate };
  }, [rows]);

  const types = useMemo(() => Array.from(new Set(rows.map(r => r.email_type))).sort(), [rows]);

  const StatCard = ({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) => (
    <div style={{ ...card, padding: '14px 18px' }}>
      <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ fontFamily: 'DM Sans' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#0f172a', margin: 0 }}>📬 Email Delivery</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Tracks every transactional email (signup approvals, trial approvals, password resets, rejections, upgrades, gifts) with status and provider errors.
          </p>
        </div>
        <button
          onClick={load}
          style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >🔄 Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard label="Total Sent Attempts" value={stats.total} color="#0f172a" sub={`Last ${rangeDays} days`} />
        <StatCard label="Delivered" value={stats.sent} color="#059669" />
        <StatCard label="Failed" value={stats.failed} color="#dc2626" />
        <StatCard label="Success Rate" value={`${stats.rate}%`} color="#7c3aed" />
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: 14, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email, error, admin…"
          style={{ flex: '1 1 240px', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={selectStyle}>
          <option value="all">All status</option>
          <option value="sent">✅ Sent</option>
          <option value="failed">❌ Failed</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all">All email types</option>
          {types.map(t => <option key={t} value={t}>{TYPE_LABEL[t]?.label || t}</option>)}
        </select>
        <select value={rangeDays} onChange={e => setRangeDays(Number(e.target.value) as any)} style={selectStyle}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Showing <b style={{ color: '#0f172a' }}>{filtered.length}</b> of {rows.length}
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading email history…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            No email events in this range.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Th>Time</Th>
                  <Th>Type</Th>
                  <Th>Recipient</Th>
                  <Th>Status</Th>
                  <Th>Error</Th>
                  <Th>Triggered by</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const t = TYPE_LABEL[r.email_type] || { label: r.email_type, color: '#64748b', icon: '✉️' };
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <Td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(r.created_at).toLocaleTimeString()}</div>
                      </Td>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${t.color}15`, color: t.color, padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                          <span>{t.icon}</span> {t.label}
                        </span>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.recipient_email}</div>
                        {r.context && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.context}</div>}
                      </Td>
                      <Td>
                        {r.status === 'sent' ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>✅ Sent</span>
                        ) : (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>❌ Failed</span>
                        )}
                      </Td>
                      <Td>
                        {r.error_message ? (
                          <div style={{ color: '#dc2626', fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.error_message}>
                            {r.error_message}
                          </div>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </Td>
                      <Td>
                        <div style={{ fontSize: 12, color: '#475569' }}>{r.triggered_by_email || (r.triggered_by_email === null ? 'system' : '')}</div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => setDetail(r)}
                          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#7c3aed', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                        >View</button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detail && (
        <div
          onClick={() => setDetail(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9998, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(520px, 100%)', background: 'white', height: '100%', overflowY: 'auto', padding: 28, boxShadow: '-8px 0 32px rgba(0,0,0,0.15)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, margin: 0 }}>Email Event Details</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <Row k="Status" v={detail.status === 'sent' ? '✅ Sent' : '❌ Failed'} />
            <Row k="Type" v={TYPE_LABEL[detail.email_type]?.label || detail.email_type} />
            <Row k="Recipient" v={detail.recipient_email} />
            <Row k="Time" v={new Date(detail.created_at).toLocaleString()} />
            {detail.context && <Row k="Context" v={detail.context} />}
            {detail.triggered_by_email && <Row k="Triggered by" v={detail.triggered_by_email} />}
            {detail.provider_message_id && <Row k="Resend ID" v={detail.provider_message_id} />}
            {detail.error_message && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Error</div>
                <pre style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 10, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                  {detail.error_message}
                </pre>
              </div>
            )}
            {detail.metadata && Object.keys(detail.metadata).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Metadata</div>
                <pre style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', padding: 12, borderRadius: 10, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                  {JSON.stringify(detail.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 13,
  fontFamily: 'DM Sans',
  background: 'white',
  cursor: 'pointer',
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{children}</td>
);
const Row = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
    <div style={{ width: 110, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{k}</div>
    <div style={{ flex: 1, fontSize: 13, color: '#0f172a', wordBreak: 'break-word' }}>{v}</div>
  </div>
);
