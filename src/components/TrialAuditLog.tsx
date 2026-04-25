import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditRow {
  id: string;
  created_at: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  target_user_name: string | null;
  details: any;
}

const TRIAL_ACTIONS = ['trial_approved', 'trial_rejected', 'trial_extended', 'trial_upgraded'];

const actionMeta: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  trial_approved: { label: 'Approved',  emoji: '✅', bg: '#dcfce7', color: '#15803d' },
  trial_rejected: { label: 'Rejected',  emoji: '✗',  bg: '#fee2e2', color: '#991b1b' },
  trial_extended: { label: 'Extended',  emoji: '⏱️', bg: '#fef3c7', color: '#92400e' },
  trial_upgraded: { label: 'Upgraded',  emoji: '🚀', bg: '#ede9fe', color: '#7c3aed' },
};

const fmt = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

interface Props { onIpLookup?: (ip: string) => void }

export default function TrialAuditLog({ onIpLookup }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminMap, setAdminMap] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [logRes, adminRes] = await Promise.all([
      supabase.from('admin_activity_log').select('*').in('action_type', TRIAL_ACTIONS).order('created_at', { ascending: false }).limit(200),
      supabase.from('admin_users').select('user_id, display_name, email'),
    ]);
    setRows((logRes.data || []) as unknown as AuditRow[]);
    const map: Record<string, string> = {};
    (adminRes.data || []).forEach((a: any) => {
      map[a.user_id] = a.display_name || a.email || a.user_id.slice(0, 8);
    });
    setAdminMap(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' }}>📜 Trial Action Audit Log</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
            Every approve / reject / extend / upgrade by an admin, last 200 events.
          </div>
        </div>
        <button onClick={load} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11.5, color: '#475569', cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16 }}>No trial admin actions yet</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, marginTop: 6 }}>This log will populate as you approve, reject, extend, or upgrade trials.</div>
        </div>
      ) : (
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['When', 'Action', 'Admin', 'Target user', 'Trial Request ID', 'Details', 'Payload'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const meta = actionMeta[r.action_type] || { label: r.action_type, emoji: '•', bg: '#f1f5f9', color: '#64748b' };
                const adminName = adminMap[r.admin_id] || r.admin_id.slice(0, 8);
                const trialId = r.details?.trial_request_id || r.details?.requestId || '—';
                const ip = r.details?.ip_address;
                const detailParts: string[] = [];
                if (r.details?.duration_days) detailParts.push(`${r.details.duration_days}d`);
                if (r.details?.extra_days) detailParts.push(`+${r.details.extra_days}d`);
                if (r.details?.new_tier) detailParts.push(`→ ${r.details.new_tier}`);
                if (r.details?.reason) detailParts.push(`"${String(r.details.reason).slice(0, 60)}"`);
                if (r.details?.email) detailParts.push(r.details.email);
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmt(r.created_at)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 50, background: meta.bg, color: meta.color }}>{meta.emoji} {meta.label}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#0f172a', fontWeight: 700 }}>{adminName}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#475569' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.target_user_name || '—'}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>{r.target_user_id ? r.target_user_id.slice(0, 8) + '…' : '—'}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 10.5, fontFamily: 'monospace', color: '#64748b' }}>
                      {trialId !== '—' ? String(trialId).slice(0, 8) + '…' : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 11.5, color: '#475569' }}>
                      <div>{detailParts.join(' · ') || '—'}</div>
                      {ip && onIpLookup && (
                        <button onClick={() => onIpLookup(ip)} style={{ marginTop: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10.5, color: '#7c3aed', textDecoration: 'underline', fontFamily: 'monospace' }}>{ip}</button>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 10.5, color: '#475569' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 10.5, color: '#7c3aed', fontWeight: 700, userSelect: 'none', outline: 'none' }}>view JSON</summary>
                        <pre style={{ marginTop: 6, padding: 8, background: '#0f172a', color: '#e2e8f0', borderRadius: 6, fontSize: 10, lineHeight: 1.5, maxWidth: 320, maxHeight: 180, overflow: 'auto', fontFamily: 'monospace' }}>
{JSON.stringify(r.details || {}, null, 2)}
                        </pre>
                        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(r.details || {}, null, 2))} style={{ marginTop: 4, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace', fontSize: 9.5, cursor: 'pointer' }}>📋 Copy</button>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
