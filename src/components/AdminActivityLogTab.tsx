import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogRow {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  target_user_name: string | null;
  details: any;
  created_at: string;
}

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  signup_approved: 'Signup Approved',
  signup_rejected: 'Signup Rejected',
  user_edited: 'User Edited',
  user_deleted: 'User Deleted',
  trial_approved: 'Trial Approved',
  trial_upgraded: 'Trial Upgraded',
  trial_extended: 'Trial Extended',
  trial_ended_early: 'Trial Ended Early',
  trial_users_exported: 'Trial Users Exported',
  gift_credits: 'Credits Gifted',
  force_logout: 'Force Logout',
  password_reset_sent: 'Password Reset Sent',
  csv_exported: 'CSV Exported',
  test_trial_created: 'Test Trial Created',
  bulk_force_logout: 'Bulk Force Logout',
};

const ACTION_COLORS: Record<string, { bg: string; fg: string }> = {
  signup_approved: { bg: '#dcfce7', fg: '#166534' },
  signup_rejected: { bg: '#fee2e2', fg: '#991b1b' },
  user_edited: { bg: '#e0e7ff', fg: '#3730a3' },
  user_deleted: { bg: '#fee2e2', fg: '#991b1b' },
  trial_approved: { bg: '#ede9fe', fg: '#5b21b6' },
  trial_upgraded: { bg: '#dbeafe', fg: '#1e40af' },
  trial_extended: { bg: '#fef3c7', fg: '#92400e' },
  trial_ended_early: { bg: '#fee2e2', fg: '#991b1b' },
  gift_credits: { bg: '#d1fae5', fg: '#065f46' },
  force_logout: { bg: '#ffedd5', fg: '#9a3412' },
  password_reset_sent: { bg: '#e0f2fe', fg: '#075985' },
  csv_exported: { bg: '#f1f5f9', fg: '#475569' },
};

export default function AdminActivityLogTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('7days');
  const [page, setPage] = useState(0);
  const [adminMap, setAdminMap] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    const fromDate =
      dateRange === '24h' ? new Date(Date.now() - 86400000).toISOString() :
      dateRange === '7days' ? new Date(Date.now() - 7 * 86400000).toISOString() :
      dateRange === '30days' ? new Date(Date.now() - 30 * 86400000).toISOString() :
      null;

    let q = supabase.from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (fromDate) q = q.gte('created_at', fromDate);
    if (filter !== 'all') q = q.eq('action_type', filter);
    if (search.trim()) q = q.ilike('target_user_name', `%${search.trim()}%`);

    const { data, error } = await q;
    if (error) { showToast('Failed to load activity log', 'error'); setLoading(false); return; }
    setLogs(data || []);

    // Resolve admin display names
    const adminIds = Array.from(new Set((data || []).map(d => d.admin_id).filter(Boolean)));
    if (adminIds.length) {
      const { data: admins } = await supabase.from('admin_users')
        .select('user_id, display_name, email')
        .in('user_id', adminIds);
      const m: Record<string, string> = {};
      (admins || []).forEach((a: any) => { m[a.user_id] = a.display_name || a.email || 'Admin'; });
      setAdminMap(m);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); /* eslint-disable-next-line */ }, [filter, dateRange, page]);
  useEffect(() => { const t = setTimeout(() => { setPage(0); fetchLogs(); }, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search]);

  const exportCSV = () => {
    if (!logs.length) { showToast('Nothing to export', 'warning'); return; }
    const rows = [
      ['Timestamp', 'Admin', 'Action', 'Target User', 'Details'],
      ...logs.map(l => [
        new Date(l.created_at).toISOString(),
        adminMap[l.admin_id] || l.admin_id,
        ACTION_LABELS[l.action_type] || l.action_type,
        l.target_user_name || '',
        JSON.stringify(l.details || {}),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Activity log exported', 'success');
  };

  const formatDetails = (l: LogRow) => {
    if (!l.details || typeof l.details !== 'object') return '';
    const parts: string[] = [];
    if (l.details.tier) parts.push(`tier=${l.details.tier}`);
    if (l.details.credits) parts.push(`${l.details.credits} credits`);
    if (l.details.reason) parts.push(`"${l.details.reason}"`);
    if (l.details.days) parts.push(`${l.details.days} days`);
    if (l.details.count) parts.push(`${l.details.count} items`);
    return parts.join(' · ');
  };

  const timeAgo = (ts: string) => {
    const d = Date.now() - new Date(ts).getTime();
    if (d < 60000) return 'just now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return new Date(ts).toLocaleString();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#0f172a' }}>📋 Admin Activity Log</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 }}>Every administrative action across the platform</div>
        </div>
        <button onClick={exportCSV} style={{
          padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.2)',
          background: 'rgba(124,58,237,0.06)', color: '#7c3aed', cursor: 'pointer',
          fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
        }}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="all">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <select value={dateRange} onChange={e => { setDateRange(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="24h">Last 24 hours</option>
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search target user name…"
          style={{ ...selectStyle, minWidth: 240, flex: 1 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontFamily: 'DM Sans' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            No activity in this range
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const colors = ACTION_COLORS[l.action_type] || { bg: '#f1f5f9', fg: '#475569' };
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }} title={new Date(l.created_at).toLocaleString()}>{timeAgo(l.created_at)}</td>
                    <td style={tdStyle}>{adminMap[l.admin_id] || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: colors.bg, color: colors.fg,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>{ACTION_LABELS[l.action_type] || l.action_type}</span>
                    </td>
                    <td style={tdStyle}>{l.target_user_name || '—'}</td>
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{formatDetails(l)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>
          Page {page + 1} · Showing {logs.length} entries
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={pageBtn(page === 0)}>← Previous</button>
          <button onClick={() => setPage(page + 1)} disabled={logs.length < PAGE_SIZE} style={pageBtn(logs.length < PAGE_SIZE)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#374151', background: 'white', cursor: 'pointer',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4,
};
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' };
const pageBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 9, border: '1px solid #e2e8f0',
  background: disabled ? '#f8fafc' : 'white', color: disabled ? '#cbd5e1' : '#374151',
  cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12,
});
