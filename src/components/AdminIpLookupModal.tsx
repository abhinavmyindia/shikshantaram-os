import { useEffect, useState, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Match {
  source: 'trial' | 'signup' | 'session';
  email: string | null;
  full_name: string | null;
  status?: string | null;
  user_agent?: string | null;
  created_at: string | null;
}

interface Props {
  ip: string;
  onClose: () => void;
}

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)',
  zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const card: CSSProperties = {
  background: 'white', borderRadius: 18, padding: 0, maxWidth: 720, width: '100%',
  maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
  display: 'flex', flexDirection: 'column',
};

const sourceMeta: Record<string, { label: string; bg: string; color: string }> = {
  trial:   { label: 'TRIAL',   bg: '#fef3c7', color: '#92400e' },
  signup:  { label: 'SIGNUP',  bg: '#ede9fe', color: '#7c3aed' },
  session: { label: 'SESSION', bg: '#dbeafe', color: '#1d4ed8' },
};

const fmt = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function AdminIpLookupModal({ ip, onClose }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const [trials, signups, sessions] = await Promise.all([
        supabase.from('trial_requests').select('email, full_name, status, user_agent, submitted_at').eq('ip_address', ip),
        supabase.from('signup_requests').select('email, full_name, status, user_agent, submitted_at').eq('ip_address', ip),
        supabase.from('login_sessions').select('user_email, user_agent, created_at').eq('ip_address', ip).order('created_at', { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      const out: Match[] = [];
      (trials.data || []).forEach((r: any) => out.push({ source: 'trial', email: r.email, full_name: r.full_name, status: r.status, user_agent: r.user_agent, created_at: r.submitted_at }));
      (signups.data || []).forEach((r: any) => out.push({ source: 'signup', email: r.email, full_name: r.full_name, status: r.status, user_agent: r.user_agent, created_at: r.submitted_at }));
      (sessions.data || []).forEach((r: any) => out.push({ source: 'session', email: r.user_email, full_name: null, user_agent: r.user_agent, created_at: r.created_at }));
      out.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setMatches(out);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [ip]);

  // group emails by source
  const uniqueEmails = Array.from(new Set(matches.map(m => m.email).filter(Boolean))) as string[];

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #ffffff)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 16, color: '#0f172a' }}>🌐 IP Lookup</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', letterSpacing: '0.06em' }}>INTERNAL ONLY</span>
              </div>
              <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>{ip}</code>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
                ⚠ This data (IP addresses & browser strings) is for internal fraud-prevention only.
                Do not share externally. Privacy policy: never disclose to third parties.
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 50, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#64748b' }}>✕</button>
          </div>
        </div>

        {/* Email summary */}
        <div style={{ padding: '14px 24px', background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Emails grouped under this IP ({uniqueEmails.length})
          </div>
          {uniqueEmails.length === 0 ? (
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' }}>No emails matched.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {uniqueEmails.map(e => (
                <span key={e} style={{ fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: 'white', border: '1px solid #fde68a', color: '#0f172a' }}>{e}</span>
              ))}
            </div>
          )}
        </div>

        {/* Matches list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontFamily: 'DM Sans', fontSize: 13 }}>
              No records found for this IP across trials, signups, or sessions.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Source', 'Identity', 'Status', 'When', 'Browser (UA)'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => {
                  const meta = sourceMeta[m.source];
                  const ua = m.user_agent || '';
                  const uaShort = ua.length > 40 ? ua.slice(0, 40) + '…' : ua || '—';
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color, letterSpacing: '0.06em' }}>{meta.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#0f172a' }}>
                        <div style={{ fontWeight: 700 }}>{m.full_name || '—'}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{m.email || '—'}</div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{m.status || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmt(m.created_at)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 10.5, color: '#64748b', fontFamily: 'monospace' }} title={ua}>{uaShort}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: '#0f172a', color: 'white', border: 'none', borderRadius: 10,
            padding: '8px 18px', fontFamily: 'Sora', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}
