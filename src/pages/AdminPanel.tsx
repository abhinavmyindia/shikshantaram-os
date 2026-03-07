import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  access_tier: string;
  payment_status: string;
  payment_amount: number;
  is_beta_user: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface FeedbackRow {
  id: string;
  user_id: string;
  rating: number;
  feedback_text: string;
  tool_used: string;
  created_at: string;
}

const glassCard = {
  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', outline: 'none', boxSizing: 'border-box' as const,
};

const tierColors: Record<string, { bg: string; color: string }> = {
  basic: { bg: '#dcfce7', color: '#15803d' },
  premium: { bg: '#ede9fe', color: '#7c3aed' },
  beta: { bg: '#fce7f3', color: '#be185d' },
  revoked: { bg: '#fee2e2', color: '#991b1b' },
};

export default function AdminPanel() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [stats, setStats] = useState({ total: 0, activeToday: 0, basic: 0, premium: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [usersRes, feedbackRes, sessionsRes, emailsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('user_sessions').select('id, session_start').gte('session_start', new Date(Date.now() - 86400000).toISOString()),
      supabase.functions.invoke('admin-list-emails'),
    ]);
    const u = (usersRes.data || []) as unknown as UserRow[];
    setUsers(u);
    setEmailMap(emailsRes.data?.emails || {});
    setFeedback((feedbackRes.data || []) as unknown as FeedbackRow[]);
    setStats({
      total: u.length,
      activeToday: new Set((sessionsRes.data || []).map((s: any) => s.user_id)).size,
      basic: u.filter(x => x.access_tier === 'basic').length,
      premium: u.filter(x => x.access_tier === 'premium').length,
    });
    setLoading(false);
  };

  const tabs = ['📊 Overview', '👥 Users', '➕ Add User', '🔑 Reset Password', '💬 Feedback'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
    }}>
      {/* Top bar */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 16px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 50 50" fill="none">
            <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
            <circle cx="21" cy="14" r="2" fill="white"/>
            <circle cx="29" cy="14" r="2" fill="white"/>
          </svg>
          <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Shikshantaram OS — Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{user?.email}</span>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Back to App</button>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 24px', background: 'rgba(255,255,255,0.8)', borderBottom: '1px solid #f1f5f9' }}>
        {tabs.map(t => {
          const id = t.split(' ').slice(1).join(' ').toLowerCase();
          const active = tab === id || (tab === 'overview' && t.includes('Overview'));
          const tabId = t.includes('Overview') ? 'overview' : t.includes('Users') ? 'users' : t.includes('Add') ? 'add' : t.includes('Reset') ? 'password' : 'feedback';
          return (
            <button key={t} onClick={() => setTab(tabId)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans',
              fontWeight: tab === tabId ? 700 : 500, fontSize: 13,
              background: tab === tabId ? 'rgba(124,58,237,0.08)' : 'transparent',
              color: tab === tabId ? '#7c3aed' : '#64748b',
              borderBottom: tab === tabId ? '2px solid #7c3aed' : '2px solid transparent',
            }}>{t}</button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab stats={stats} users={users} />}
            {tab === 'users' && <UsersTab users={users} onRefresh={loadData} />}
            {tab === 'add' && <AddUserTab onSuccess={loadData} />}
            {tab === 'password' && <ResetPasswordTab users={users} />}
            {tab === 'feedback' && <FeedbackTab feedback={feedback} users={users} />}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ stats, users }: { stats: any; users: UserRow[] }) {
  const statCards = [
    { label: 'Total Users', value: stats.total, icon: '👥', bg: '#ede9fe' },
    { label: 'Active Today', value: stats.activeToday, icon: '⚡', bg: '#dcfce7' },
    { label: 'Basic Tier', value: stats.basic, icon: '🛡️', bg: '#fef9c3' },
    { label: 'Premium Tier', value: stats.premium, icon: '👑', bg: '#ede9fe' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...glassCard, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.icon}</div>
            </div>
            <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 12 }}>Recent Sign-ups</h3>
      <div style={{ ...glassCard, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Email', 'Tier', 'Payment', 'Joined'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 10).map(u => {
              const tc = tierColors[u.access_tier] || tierColors.basic;
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name || 'Unknown'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{u.id.slice(0, 8)}...</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{u.access_tier}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#059669' }}>₹{u.payment_amount}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ users, onRefresh }: { users: UserRow[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = users.filter(u => {
    if (filter !== 'All' && u.access_tier !== filter.toLowerCase()) return false;
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateTier = async (userId: string, tier: string) => {
    await supabase.from('user_profiles').update({ access_tier: tier } as any).eq('id', userId);
    onRefresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1.5px solid #e2e8f0' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'DM Sans' }} />
        </div>
        {['All', 'Basic', 'Premium', 'Beta', 'Revoked'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: filter === f ? '#7c3aed' : '#f1f5f9', color: filter === f ? 'white' : '#64748b',
          }}>{f}</button>
        ))}
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Showing {filtered.length} of {users.length}</span>
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Tier', 'Payment', 'Beta', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const tc = tierColors[u.access_tier] || tierColors.basic;
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${tc.color},${tc.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 10, color: 'white', flexShrink: 0 }}>
                        {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{u.access_tier}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#059669' }}>₹{u.payment_amount}</td>
                  <td style={{ padding: '10px 16px' }}>{u.is_beta_user ? '✅' : '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {u.access_tier !== 'premium' && (
                        <button onClick={() => updateTier(u.id, 'premium')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed' }}>↑ Premium</button>
                      )}
                      {u.access_tier !== 'revoked' && (
                        <button onClick={() => updateTier(u.id, 'revoked')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>Revoke</button>
                      )}
                      {u.access_tier === 'revoked' && (
                        <button onClick={() => updateTier(u.id, 'basic')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>Restore</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddUserTab({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', tier: 'basic', paymentAmount: 0, notes: '', isBeta: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: form.email,
          full_name: form.fullName,
          phone: form.phone,
          access_tier: form.tier,
          payment_amount: form.paymentAmount,
          notes: form.notes,
          is_beta_user: form.isBeta,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Send welcome email
      const appUrl = window.location.origin;
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: form.email,
          full_name: form.fullName,
          access_tier: form.tier,
          temp_password: data.temp_password,
          login_url: appUrl,
        },
      });

      setResult({ success: true, message: `User added! Welcome email sent to ${form.email}` });
      onSuccess();
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to create user' });
    }
    setLoading(false);
  };

  const reset = () => {
    setForm({ fullName: '', email: '', phone: '', tier: 'basic', paymentAmount: 0, notes: '', isBeta: false });
    setResult(null);
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ ...glassCard, padding: '32px 28px' }}>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 4 }}>Add New User</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Manually add a user and they'll receive a welcome email instantly.</p>

        {result ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{result.success ? '✅' : '❌'}</div>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: result.success ? '#15803d' : '#991b1b', marginBottom: 8 }}>{result.success ? 'Success!' : 'Error'}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{result.message}</div>
            <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Add Another User
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Full Name *</label>
              <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} style={inputStyle} placeholder="John Doe" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Email Address *</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="user@example.com" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Phone Number</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="+91 98765 43210" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Access Tier *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['basic', 'premium', 'beta'].map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tier: t })} style={{
                    padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: form.tier === t ? '#7c3aed' : '#f1f5f9', color: form.tier === t ? 'white' : '#475569',
                    textTransform: 'capitalize',
                  }}>{t}</button>
                ))}
              </div>
            </div>
            {form.tier !== 'beta' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Payment Amount (₹)</label>
                <input type="number" value={form.paymentAmount} onChange={e => setForm({ ...form, paymentAmount: parseInt(e.target.value) || 0 })} style={inputStyle} placeholder="e.g. 999" />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Admin Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' } as any} placeholder="e.g. Referred by XYZ..." />
            </div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={form.isBeta} onChange={e => setForm({ ...form, isBeta: e.target.checked })} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Mark as Beta User</span>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Beta users see the feedback widget.</div>
              </div>
            </div>

            {/* Info box */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#15803d', fontSize: 12, marginBottom: 4 }}>✅ What happens next:</div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
                • A Supabase account is created with a temporary password<br/>
                • A welcome email is sent immediately<br/>
                • They can log in and change their password
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontFamily: 'Sora',
              fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
              {loading ? 'Creating account & sending email...' : 'Add User & Send Welcome Email →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordTab({ users }: { users: UserRow[] }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: selectedUser, new_password: newPassword },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const userName = users.find(u => u.id === selectedUser)?.full_name || 'User';
      setResult({ success: true, message: `Password updated for ${userName}` });
      setNewPassword('');
      setSelectedUser('');
      setSearch('');
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to reset password' });
    }
    setLoading(false);
  };

  const generatePassword = () => {
    const pwd = 'Shk' + Math.random().toString(36).slice(2, 9).toUpperCase();
    setNewPassword(pwd);
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ ...glassCard, padding: '32px 28px' }}>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 4 }}>Reset User Password</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Select a user and set a new password for them.</p>

        {result && (
          <div style={{
            background: result.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          }}>
            <div style={{ fontWeight: 700, color: result.success ? '#15803d' : '#991b1b', fontSize: 13 }}>
              {result.success ? '✅ ' : '❌ '}{result.message}
            </div>
          </div>
        )}

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Select User *</label>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedUser(''); }}
              placeholder="Search by name..."
              style={inputStyle}
            />
            {search && !selectedUser && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, maxHeight: 180, overflow: 'auto', background: 'white' }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>No users found</div>
                ) : (
                  filteredUsers.map(u => {
                    const tc = tierColors[u.access_tier] || tierColors.basic;
                    return (
                      <div
                        key={u.id}
                        onClick={() => { setSelectedUser(u.id); setSearch(u.full_name); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg,${tc.color},${tc.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 9, color: 'white', flexShrink: 0 }}>
                          {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1 }}>{u.full_name}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{u.access_tier}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>New Password *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Min 6 characters"
                minLength={6}
              />
              <button type="button" onClick={generatePassword} style={{
                padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, background: '#f8fafc', color: '#7c3aed', whiteSpace: 'nowrap',
              }}>🎲 Generate</button>
            </div>
          </div>

          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 12, marginBottom: 4 }}>⚠️ Important:</div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.8 }}>
              • The user will need to use this new password to log in<br/>
              • Make sure to communicate the new password securely
            </div>
          </div>

          <button type="submit" disabled={loading || !selectedUser || !newPassword} style={{
            width: '100%', padding: 13, borderRadius: 12, border: 'none',
            cursor: (loading || !selectedUser || !newPassword) ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontFamily: 'Sora',
            fontWeight: 700, fontSize: 14, opacity: (loading || !selectedUser || !newPassword) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
            {loading ? 'Updating password...' : '🔑 Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FeedbackTab({ feedback, users }: { feedback: FeedbackRow[]; users: UserRow[] }) {
  const [toolFilter, setToolFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);

  const userMap = new Map(users.map(u => [u.id, u]));
  const filtered = feedback.filter(f => {
    if (toolFilter !== 'all' && f.tool_used !== toolFilter) return false;
    if (ratingFilter > 0 && f.rating !== ratingFilter) return false;
    return true;
  });

  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : '0';
  const ratingColors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <div style={{ ...glassCard, padding: '16px 20px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Average Rating</div>
          <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>★ {avgRating}</div>
        </div>
        <div style={{ ...glassCard, padding: '16px 20px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Responses</div>
          <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{feedback.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'niche-clarity', 'product-navigator', 'overall'].map(t => (
          <button key={t} onClick={() => setToolFilter(t)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: toolFilter === t ? '#7c3aed' : '#f1f5f9', color: toolFilter === t ? 'white' : '#64748b',
            textTransform: 'capitalize',
          }}>{t.replace('-', ' ')}</button>
        ))}
        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 4px' }} />
        {[0,5,4,3,2,1].map(r => (
          <button key={r} onClick={() => setRatingFilter(r)} style={{
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: ratingFilter === r ? '#f59e0b' : '#f1f5f9', color: ratingFilter === r ? 'white' : '#64748b',
          }}>{r === 0 ? 'All' : `${r}★`}</button>
        ))}
      </div>

      {/* Cards */}
      {filtered.map(f => {
        const u = userMap.get(f.user_id);
        return (
          <div key={f.id} style={{ ...glassCard, padding: '16px 20px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 9, color: 'white' }}>
                {(u?.full_name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1 }}>{u?.full_name || 'Unknown'}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(f.created_at!).toLocaleDateString()}</span>
              <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: ratingColors[f.rating] }}>{f.rating}★</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>{f.tool_used?.replace('-', ' ')}</span>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, marginTop: 8 }}>{f.feedback_text}</div>
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>No feedback yet.</div>}
    </div>
  );
}
