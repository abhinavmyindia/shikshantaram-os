import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import TopUpModal from '@/components/TopUpModal';

/* ───────── Avatar Gradients ───────── */
const AVATAR_GRADIENTS = [
  { id: 'purple',  gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', label: 'Purple'  },
  { id: 'indigo',  gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)', label: 'Indigo'  },
  { id: 'blue',    gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', label: 'Blue'    },
  { id: 'cyan',    gradient: 'linear-gradient(135deg,#0284c7,#06b6d4)', label: 'Cyan'    },
  { id: 'teal',    gradient: 'linear-gradient(135deg,#0d9488,#14b8a6)', label: 'Teal'    },
  { id: 'green',   gradient: 'linear-gradient(135deg,#15803d,#22c55e)', label: 'Green'   },
  { id: 'lime',    gradient: 'linear-gradient(135deg,#4d7c0f,#84cc16)', label: 'Lime'    },
  { id: 'amber',   gradient: 'linear-gradient(135deg,#b45309,#f59e0b)', label: 'Amber'   },
  { id: 'orange',  gradient: 'linear-gradient(135deg,#c2410c,#f97316)', label: 'Orange'  },
  { id: 'red',     gradient: 'linear-gradient(135deg,#b91c1c,#ef4444)', label: 'Red'     },
  { id: 'pink',    gradient: 'linear-gradient(135deg,#be185d,#ec4899)', label: 'Pink'    },
  { id: 'rose',    gradient: 'linear-gradient(135deg,#9f1239,#f43f5e)', label: 'Rose'    },
  { id: 'violet',  gradient: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', label: 'Violet'  },
  { id: 'fuchsia', gradient: 'linear-gradient(135deg,#a21caf,#d946ef)', label: 'Fuchsia' },
  { id: 'dark',    gradient: 'linear-gradient(135deg,#0f172a,#334155)', label: 'Dark'    },
  { id: 'sunset',  gradient: 'linear-gradient(135deg,#dc2626,#ea580c,#f59e0b)', label: 'Sunset' },
];

export { AVATAR_GRADIENTS };

/* ───────── Helpers ───────── */
const tierMeta: Record<string, { label: string; color: string; bg: string }> = {
  basic:   { label: 'Basic',   color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
  premium: { label: 'Premium', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  beta:    { label: 'Beta',    color: '#ec4899', bg: 'rgba(236,72,153,0.1)'  },
  revoked: { label: 'Revoked', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const fmtTime = (secs: number) => {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const fmtRelative = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const toolLabel: Record<string, string> = {
  product_navigator: '🧭 Product Navigator',
  niche_clarity: '🎯 Niche Clarity',
  offer_creation: '🎁 Offer Creation',
  funnel_builder: '🔀 Funnel Builder',
  copywriting_suite: '✍️ Copy Suite',
};

const deviceIcon = (type: string) =>
  type === 'mobile' ? '📱' : type === 'tablet' ? '📋' : '💻';

const cardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '22px',
  border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

/* ───────── Component ───────── */
export default function ProfilePage({
  user,
  profile,
  onProfileUpdate,
  onNavigateDashboard,
}: {
  user: User;
  profile: any;
  onProfileUpdate: () => Promise<void>;
  onNavigateDashboard: () => void;
}) {
  const [profileData, setProfileData] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'security' | 'credits' | 'settings'>('profile');

  // Tab 1 — Profile
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInsta, setEditInsta] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(AVATAR_GRADIENTS[0]);
  const [hoveredGradient, setHoveredGradient] = useState<typeof AVATAR_GRADIENTS[0] | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Tab 3 — Security
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Tab 4 — Credits
  const [showTopUp, setShowTopUp] = useState(false);

  // Tab 5 — Settings
  const [notifNewTools, setNotifNewTools] = useState(true);
  const [notifTips, setNotifTips] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  /* ───────── Data Loading ───────── */
  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      if (p) {
        setProfileData(p);
        setEditName((p as any).full_name || '');
        setEditBio((p as any).bio || '');
        setEditPhone((p as any).phone || '');
        setEditInsta((p as any).instagram_url || '');
        setEditTwitter((p as any).twitter_url || '');
        setEditLinkedin((p as any).linkedin_url || '');
        setEditYoutube((p as any).youtube_url || '');
        setEditWebsite((p as any).website_url || '');
        setNotifNewTools((p as any).notif_new_tools ?? true);
        setNotifTips((p as any).notif_tips ?? true);
        setDeletionRequested((p as any).deletion_requested || false);
        const grad = AVATAR_GRADIENTS.find(g => g.id === (p as any).avatar_color) || AVATAR_GRADIENTS[0];
        setSelectedGradient(grad);
      }

      const { data: cr } = await supabase.from('user_credits').select('*').eq('user_id', user.id).single();
      setCredits(cr);

      const { data: sess } = await supabase.from('login_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      setSessions(sess || []);

      const { data: tx } = await supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      setTransactions(tx || []);

      // Activity stats
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      const [{ data: sessions7d }, { data: aiLogs7d }, { data: toolUsage }] = await Promise.all([
        supabase.from('user_sessions').select('duration_seconds, session_start').eq('user_id', user.id).gte('session_start', sevenDaysAgo),
        supabase.from('ai_usage_logs').select('module, total_tokens, created_at').eq('user_id', user.id).gte('created_at', sevenDaysAgo),
        supabase.from('tool_usage').select('tool_id, time_spent_secs').eq('user_id', user.id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000);
        return d.toISOString().split('T')[0];
      });
      const dailyMinutes: Record<string, number> = {};
      days.forEach(d => { dailyMinutes[d] = 0; });
      (sessions7d || []).forEach((s: any) => {
        const day = s.session_start?.split('T')[0];
        if (day && dailyMinutes[day] !== undefined) {
          dailyMinutes[day] += Math.round((s.duration_seconds || 0) / 60);
        }
      });

      const totalSecs7d = (sessions7d || []).reduce((s: number, x: any) => s + (x.duration_seconds || 0), 0);
      const todaySecs = (sessions7d || [])
        .filter((s: any) => new Date(s.session_start) >= todayStart)
        .reduce((s: number, x: any) => s + (x.duration_seconds || 0), 0);
      const aiCalls7d = (aiLogs7d || []).length;
      const creditsSpent7d = (tx || [])
        .filter((t: any) => t.type === 'deduction' && new Date(t.created_at) > new Date(sevenDaysAgo))
        .reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

      const toolCounts: Record<string, number> = {};
      (toolUsage || []).forEach((t: any) => { toolCounts[t.tool_id] = (toolCounts[t.tool_id] || 0) + 1; });
      const topTool = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      const memberSince = (p as any)?.created_at || user.created_at;
      const daysSince = Math.floor((Date.now() - new Date(memberSince).getTime()) / 86400000);

      setActivityData({
        totalSecs7d, todaySecs, aiCalls7d, creditsSpent7d,
        topTool, dailyMinutes, days,
        sessionCount7d: (sessions7d || []).length,
        daysSince,
      });

      setLoading(false);
    };
    load();
  }, [user.id]);

  /* ───────── Save Functions ───────── */
  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    await supabase.from('user_profiles').update({
      full_name: editName.trim(),
      bio: editBio.trim(),
      phone: editPhone.trim(),
      avatar_color: selectedGradient.id,
    } as any).eq('id', user.id);
    setSavingProfile(false);
    setProfileSaved(true);
    setProfileData((prev: any) => ({ ...prev, full_name: editName, avatar_color: selectedGradient.id }));
    await onProfileUpdate();
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleGradientChange = (grad: typeof AVATAR_GRADIENTS[0]) => {
    setSelectedGradient(grad);
    window.dispatchEvent(new CustomEvent('avatarColorChanged', { detail: { gradient: grad.gradient, id: grad.id } }));
  };

  const handlePasswordChange = async () => {
    setPwError(''); setPwSuccess(false);
    if (!currentPw) { setPwError('Enter your current password.'); return; }
    if (!newPw) { setPwError('Enter a new password.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (currentPw === newPw) { setPwError('New password must be different.'); return; }
    setPwLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPw });
    if (signInErr) { setPwError('Current password is incorrect.'); setPwLoading(false); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    if (updateErr) { setPwError(updateErr.message || 'Update failed. Try again.'); }
    else { setPwSuccess(true); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setTimeout(() => setPwSuccess(false), 5000); }
    setPwLoading(false);
  };

  const logoutOtherSessions = async () => {
    setLogoutLoading(true);
    const currentToken = localStorage.getItem('shikshantaram_session_token') || '';
    const { data: activeSess } = await supabase.from('login_sessions').select('id, session_token').eq('user_id', user.id).eq('is_active', true);
    const otherIds = (activeSess || []).filter((s: any) => s.session_token !== currentToken).map((s: any) => s.id);
    if (otherIds.length > 0) {
      await supabase.from('login_sessions').update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'force_logout_other_devices' } as any).in('id', otherIds);
    }
    const { data } = await supabase.from('login_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
    setSessions(data || []);
    setLogoutLoading(false);
  };

  const saveNotifications = async (patch: any) => {
    setSavingNotif(true);
    await supabase.from('user_profiles').update(patch as any).eq('id', user.id);
    setSavingNotif(false);
  };

  const requestDeletion = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteLoading(true);
    await supabase.from('deletion_requests').insert({
      user_id: user.id,
      user_email: user.email!,
      user_name: editName,
      reason: deleteReason || 'No reason provided',
      status: 'pending',
    } as any);
    await supabase.from('user_profiles').update({ deletion_requested: true, deletion_requested_at: new Date().toISOString() } as any).eq('id', user.id);
    setDeletionRequested(true);
    setShowDeleteConfirm(false);
    setDeleteLoading(false);
  };

  /* ───────── Derived ───────── */
  const tier = tierMeta[profileData?.access_tier || profile?.access_tier || 'basic'];
  const displayGradient = hoveredGradient?.gradient || selectedGradient.gradient;

  /* ───────── Loading ───────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 80px' }}>

      {/* ─── PAGE HEADER ─── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 24, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          My Profile
        </h1>
        <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#64748b', margin: 0 }}>
          Manage your personal info, security, and account settings
        </p>
      </div>

      {/* ─── PROFILE HERO CARD ─── */}
      <div style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
        borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: displayGradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          transition: 'background 0.3s',
        }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 24, color: 'white' }}>
            {(editName || user?.email || 'U')[0].toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 18, color: '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editName || 'Your Name'}
          </h2>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: tier.bg, color: tier.color,
              padding: '3px 12px', borderRadius: 50,
              fontFamily: 'DM Sans,sans-serif', fontWeight: 800, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {tier.label}
            </span>
            {activityData && (
              <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8' }}>
                Member for {activityData.daysSince} days
              </span>
            )}
          </div>
        </div>
        <div style={{
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 12, padding: '10px 14px', textAlign: 'center', flexShrink: 0,
        }}>
          <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 20, color: '#7c3aed', margin: '0 0 2px' }}>
            {credits?.balance ?? 0}
          </p>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            credits
          </p>
        </div>
      </div>

      {/* ─── 5-TAB NAV ─── */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 14, padding: 4, marginBottom: 20 }}>
        {([
          { id: 'profile' as const, icon: '👤', label: 'Profile' },
          { id: 'activity' as const, icon: '📊', label: 'Activity' },
          { id: 'security' as const, icon: '🔒', label: 'Security' },
          { id: 'credits' as const, icon: '⚡', label: 'Credits' },
          { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === tab.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#64748b',
            fontFamily: 'DM Sans,sans-serif', fontWeight: activeTab === tab.id ? 800 : 600, fontSize: 11,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            boxShadow: activeTab === tab.id ? '0 2px 12px rgba(124,58,237,0.25)' : 'none',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 1 — PROFILE                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar gradient picker */}
          <div style={cardStyle}>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
              Avatar Style
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
              {AVATAR_GRADIENTS.map(grad => (
                <button key={grad.id} onClick={() => handleGradientChange(grad)}
                  onMouseEnter={() => setHoveredGradient(grad)}
                  onMouseLeave={() => setHoveredGradient(null)}
                  title={grad.label}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12,
                    background: grad.gradient, border: 'none', cursor: 'pointer',
                    outline: selectedGradient.id === grad.id ? '3px solid #7c3aed' : '2px solid transparent',
                    outlineOffset: 2,
                    transform: selectedGradient.id === grad.id || hoveredGradient?.id === grad.id ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.15s',
                    boxShadow: selectedGradient.id === grad.id ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>
              Hover to preview in your avatar above · Click to select · Save to make permanent
            </p>
          </div>

          {/* Name + Bio */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Full Name
              </label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div>
              <label style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Bio (visible on your community profile)
              </label>
              <textarea value={editBio} onChange={e => setEditBio(e.target.value.slice(0, 160))} placeholder="Tell the community about yourself and what you're building..." rows={3}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical', transition: 'border-color 0.15s', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: '4px 0 0', textAlign: 'right' }}>{editBio.length}/160</p>
            </div>
          </div>

          {/* Contact */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email Address</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="email" value={user?.email || ''} disabled
                  style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid #f1f5f9', fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#94a3b8', background: '#f8fafc', cursor: 'not-allowed', boxSizing: 'border-box' }} />
                <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>🔒 Contact support</span>
              </div>
            </div>
            <div>
              <label style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Phone Number</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          </div>

          {/* Social Links */}
          <div style={cardStyle}>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
              Social Links <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11, textTransform: 'none' }}>— shown on your community profile</span>
            </p>
            {[
              { label: 'Instagram', icon: '📸', value: editInsta, setter: setEditInsta, placeholder: 'https://instagram.com/yourhandle' },
              { label: 'Twitter / X', icon: '🐦', value: editTwitter, setter: setEditTwitter, placeholder: 'https://twitter.com/yourhandle' },
              { label: 'LinkedIn', icon: '💼', value: editLinkedin, setter: setEditLinkedin, placeholder: 'https://linkedin.com/in/yourname' },
              { label: 'YouTube', icon: '▶️', value: editYoutube, setter: setEditYoutube, placeholder: 'https://youtube.com/@yourchannel' },
              { label: 'Website', icon: '🌐', value: editWebsite, setter: setEditWebsite, placeholder: 'https://yourwebsite.com' },
            ].map((field, i) => (
              <div key={field.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 4 ? 10 : 0 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{field.icon}</span>
                <input type="url" value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            ))}
          </div>

          {/* Save button */}
          <button onClick={saveProfile} disabled={savingProfile}
            style={{
              width: '100%', padding: 14, borderRadius: 14, border: 'none',
              background: profileSaved ? 'linear-gradient(135deg,#059669,#10b981)' : savingProfile ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: 'white', cursor: savingProfile ? 'not-allowed' : 'pointer',
              fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: savingProfile || profileSaved ? 'none' : '0 4px 20px rgba(124,58,237,0.3)',
              transition: 'all 0.2s',
            }}>
            {savingProfile ? (<><span style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />Saving...</>)
              : profileSaved ? (<>✅ Saved!</>)
              : (<>💾 Save Profile</>)}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 2 — ACTIVITY                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && activityData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { icon: '⏱️', label: 'Today', value: fmtTime(activityData.todaySecs), sub: 'time on platform' },
              { icon: '📅', label: 'Last 7 Days', value: fmtTime(activityData.totalSecs7d), sub: 'total session time' },
              { icon: '🤖', label: 'AI Calls (7d)', value: activityData.aiCalls7d, sub: 'generations made' },
              { icon: '⚡', label: 'Credits Used (7d)', value: activityData.creditsSpent7d, sub: 'credits spent' },
            ].map(stat => (
              <div key={stat.label} style={{ ...cardStyle, textAlign: 'center', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{stat.icon}</span>
                  <span style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
                </div>
                <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 28, color: '#0f172a', margin: '0 0 2px' }}>{stat.value}</p>
                <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: 0 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* 7-day bar chart */}
          <div style={{ ...cardStyle, padding: 24 }}>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16, color: '#0f172a', margin: '0 0 4px' }}>📈 Daily Usage — Last 7 Days</h3>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Minutes spent on platform each day</p>
            {(() => {
              const maxMins = Math.max(...Object.values(activityData.dailyMinutes as Record<string, number>), 1);
              return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                  {activityData.days.map((day: string) => {
                    const mins = activityData.dailyMinutes[day] || 0;
                    const pct = (mins / maxMins) * 100;
                    const isToday = day === new Date().toISOString().split('T')[0];
                    return (
                      <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 700, color: '#64748b' }}>{mins}m</span>
                        <div style={{
                          width: '100%', borderRadius: 8, minHeight: 4,
                          height: `${Math.max(pct, 3)}%`,
                          background: isToday ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)',
                          transition: 'height 0.3s',
                        }} />
                        <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: isToday ? '#7c3aed' : '#94a3b8', fontWeight: isToday ? 800 : 600 }}>
                          {new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Most used tool + sessions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ ...cardStyle, textAlign: 'center', padding: 20 }}>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Most Used Tool</p>
              <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: '0 0 4px' }}>
                {activityData.topTool ? (toolLabel[activityData.topTool] || activityData.topTool) : 'No data yet'}
              </p>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: 0 }}>last 30 days</p>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center', padding: 20 }}>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Sessions (7d)</p>
              <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 28, color: '#0f172a', margin: '0 0 4px' }}>{activityData.sessionCount7d}</p>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: 0 }}>login sessions</p>
            </div>
          </div>

          {/* Member stats footer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ ...cardStyle, padding: 16 }}>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Member Since</p>
              <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>
                {new Date(profileData?.created_at || user?.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div style={{ ...cardStyle, padding: 16 }}>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Total Credits Used</p>
              <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>{credits?.lifetime_spent ?? 0} credits</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3, 4, 5 + modals come in Part B */}
      {activeTab === 'security' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#64748b' }}>Security tab coming in Part B</p>
        </div>
      )}
      {activeTab === 'credits' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⚡</p>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#64748b' }}>Credits tab coming in Part B</p>
        </div>
      )}
      {activeTab === 'settings' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⚙️</p>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#64748b' }}>Settings tab coming in Part B</p>
        </div>
      )}

      {showTopUp && (
        <TopUpModal
          userId={user.id}
          userEmail={user.email || ''}
          userName={editName || ''}
          currentBalance={credits?.balance ?? 0}
          onClose={() => setShowTopUp(false)}
          onSuccess={(newBalance) => { setCredits((prev: any) => ({ ...prev, balance: newBalance })); setShowTopUp(false); }}
        />
      )}
    </div>
  );
}
