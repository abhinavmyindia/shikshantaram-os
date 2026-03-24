import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import TopUpModal from '@/components/TopUpModal';

const AVATAR_COLORS = [
  '#7c3aed', '#6366f1', '#0284c7', '#0891b2', '#059669', '#16a34a',
  '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#9333ea', '#0f172a',
];

const tierMeta: Record<string, { label: string; color: string; bg: string }> = {
  basic:   { label: 'Basic',   color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
  premium: { label: 'Premium', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  beta:    { label: 'Beta',    color: '#ec4899', bg: 'rgba(236,72,153,0.1)'  },
  revoked: { label: 'Revoked', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const formatRelative = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
};

const deviceIcon = (type: string) =>
  type === 'mobile' ? '📱' : type === 'tablet' ? '📋' : '💻';

export default function ProfilePage({
  user, profile, onProfileUpdate, onNavigateDashboard,
}: {
  user: User;
  profile: any;
  onProfileUpdate: () => Promise<void>;
  onNavigateDashboard: () => void;
}) {
  const [profileData, setProfileData] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'personal' | 'security' | 'account'>('personal');

  // Personal Info
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7c3aed');
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalSaved, setPersonalSaved] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');
  const [logoutOtherLoading, setLogoutOtherLoading] = useState(false);

  // Account
  const [notifNewTools, setNotifNewTools] = useState(true);
  const [notifTips, setNotifTips] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: pd } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      if (pd) {
        setProfileData(pd);
        setEditName((pd as any).full_name || '');
        setEditPhone((pd as any).phone || '');
        setSelectedColor((pd as any).avatar_color || '#7c3aed');
        setNotifNewTools((pd as any).notif_new_tools ?? true);
        setNotifTips((pd as any).notif_tips ?? true);
      }
      const { data: cd } = await supabase.from('user_credits').select('balance').eq('user_id', user.id).single();
      setCredits(cd?.balance ?? 0);
      const { data: sd } = await supabase.from('login_sessions').select('id, ip_city, ip_state, browser, os, device_type, created_at, is_active').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      setSessions(sd || []);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    window.dispatchEvent(new CustomEvent('avatarColorChanged', { detail: { color } }));
  };

  const savePersonalInfo = async () => {
    setSavingPersonal(true);
    setPersonalSaved(false);
    const { error } = await supabase.from('user_profiles').update({
      full_name: editName.trim(),
      phone: editPhone.trim(),
      avatar_color: selectedColor,
    } as any).eq('id', user.id);
    setSavingPersonal(false);
    if (!error) {
      setPersonalSaved(true);
      setProfileData((prev: any) => ({ ...prev, full_name: editName, phone: editPhone, avatar_color: selectedColor }));
      await onProfileUpdate();
      setTimeout(() => setPersonalSaved(false), 3000);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess(false);
    if (!currentPassword) { setPwError('Please enter your current password.'); return; }
    if (!newPassword) { setPwError('Please enter a new password.'); return; }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return; }
    if (currentPassword === newPassword) { setPwError('New password must be different from current password.'); return; }
    setPwLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
      if (signInError) { setPwError('Current password is incorrect. Please try again.'); setPwLoading(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { setPwError(updateError.message || 'Failed to update password.'); }
      else { setPwSuccess(true); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setTimeout(() => setPwSuccess(false), 5000); }
    } catch { setPwError('Something went wrong. Please try again.'); }
    setPwLoading(false);
  };

  const logoutOtherSessions = async () => {
    setLogoutOtherLoading(true);
    const currentToken = localStorage.getItem('shikshantaram_session_token');
    await supabase.from('login_sessions').update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'user_logout_other_devices' } as any).eq('user_id', user.id).eq('is_active', true).neq('session_token', currentToken || '');
    const { data } = await supabase.from('login_sessions').select('id, ip_city, ip_state, browser, os, device_type, created_at, is_active').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
    setSessions(data || []);
    setLogoutOtherLoading(false);
  };

  const saveNotifications = async () => {
    setSavingNotif(true);
    await supabase.from('user_profiles').update({ notif_new_tools: notifNewTools, notif_tips: notifTips } as any).eq('id', user.id);
    setSavingNotif(false);
  };

  const requestDeletion = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteLoading(true);
    await supabase.from('user_profiles').update({ deletion_requested: true, deletion_requested_at: new Date().toISOString() } as any).eq('id', user.id);
    await supabase.functions.invoke('log-error', {
      body: { errorType: 'account_deletion_request', severity: 'warning', message: `User ${user.email} has requested account deletion`, module: 'profile', additionalData: { userId: user.id, email: user.email } },
    });
    setDeleteLoading(false);
    setShowDeleteConfirm(false);
    alert('Your deletion request has been received. Our team will process it within 48 hours and confirm via email.');
  };

  const tier = tierMeta[profileData?.access_tier || profile?.access_tier || 'basic'];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );

  const cardStyle: CSSProperties = {
    background:'rgba(255,255,255,0.88)', backdropFilter:'blur(20px)',
    borderRadius:'16px', padding:'22px', border:'1px solid rgba(255,255,255,0.95)',
    boxShadow:'0 4px 20px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ maxWidth:'680px', margin:'0 auto', padding:'0 16px 80px' }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom:'28px' }}>
        <h1 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'24px', color:'#0f172a', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          My Profile
        </h1>
        <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#64748b', margin:0 }}>
          Manage your personal info, security, and account settings
        </p>
      </div>

      {/* PROFILE HEADER CARD */}
      <div style={{
        background:'rgba(255,255,255,0.88)', backdropFilter:'blur(20px)',
        borderRadius:'20px', padding:'24px', border:'1px solid rgba(255,255,255,0.95)',
        boxShadow:'0 4px 24px rgba(0,0,0,0.06)', marginBottom:'20px',
        display:'flex', alignItems:'center', gap:'18px', flexWrap:'wrap',
      }}>
        <div style={{
          width:'64px', height:'64px', borderRadius:'18px',
          background: selectedColor,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0, boxShadow:`0 4px 16px ${selectedColor}44`,
          transition:'background 0.2s, box-shadow 0.2s',
        }}>
          <span style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'24px', color:'white' }}>
            {(editName || user?.email || 'U')[0].toUpperCase()}
          </span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'18px', color:'#0f172a', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {editName || 'Your Name'}
          </h2>
          <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {user?.email}
          </p>
          <span style={{
            background: tier.bg, color: tier.color,
            padding:'3px 12px', borderRadius:'50px',
            fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'10px',
            textTransform:'uppercase', letterSpacing:'0.08em',
          }}>
            {tier.label}
          </span>
        </div>
        <div style={{
          background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.15)',
          borderRadius:'12px', padding:'10px 14px', textAlign:'center', flexShrink:0,
        }}>
          <p style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'20px', color:'#7c3aed', margin:'0 0 2px' }}>{credits}</p>
          <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'10px', color:'#94a3b8', margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>credits</p>
        </div>
      </div>

      {/* SECTION TABS */}
      <div style={{ display:'flex', gap:'4px', background:'#f8fafc', borderRadius:'14px', padding:'4px', marginBottom:'20px' }}>
        {([
          { id:'personal' as const, icon:'👤', label:'Personal Info' },
          { id:'security' as const, icon:'🔒', label:'Security' },
          { id:'account' as const, icon:'⚙️', label:'Account' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            style={{
              flex:1, padding:'10px 8px', borderRadius:'10px', border:'none',
              cursor:'pointer', transition:'all 0.15s',
              background: activeSection === tab.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
              color: activeSection === tab.id ? 'white' : '#64748b',
              fontFamily:'DM Sans,sans-serif', fontWeight: activeSection === tab.id ? 800 : 600, fontSize:'13px',
              boxShadow: activeSection === tab.id ? '0 2px 12px rgba(124,58,237,0.25)' : 'none',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
            }}
          >
            <span style={{ fontSize:'14px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ PERSONAL INFO ═══ */}
      {activeSection === 'personal' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Full name */}
          <div style={cardStyle}>
            <label style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'8px' }}>Full Name</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name"
              style={{ width:'100%', padding:'11px 14px', borderRadius:'12px', border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:'14px', color:'#0f172a', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor='#7c3aed'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
          </div>
          {/* Email */}
          <div style={cardStyle}>
            <label style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'8px' }}>Email Address</label>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <input type="email" value={user?.email || ''} disabled style={{ flex:1, padding:'11px 14px', borderRadius:'12px', border:'1.5px solid #f1f5f9', fontFamily:'DM Sans', fontSize:'14px', color:'#94a3b8', background:'#f8fafc', cursor:'not-allowed', boxSizing:'border-box' }} />
              <span style={{ fontFamily:'DM Sans', fontSize:'11px', color:'#94a3b8', whiteSpace:'nowrap' }}>🔒 Contact support to change</span>
            </div>
          </div>
          {/* Phone */}
          <div style={cardStyle}>
            <label style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'8px' }}>Phone Number</label>
            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 98765 43210"
              style={{ width:'100%', padding:'11px 14px', borderRadius:'12px', border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:'14px', color:'#0f172a', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor='#7c3aed'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
          </div>
          {/* Avatar color */}
          <div style={cardStyle}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <label style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em' }}>Avatar Color</label>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:selectedColor, boxShadow:`0 2px 8px ${selectedColor}44`, transition:'background 0.2s' }} />
                <span style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'12px', color:'#64748b' }}>{selectedColor}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              {AVATAR_COLORS.map(color => (
                <button key={color} onClick={() => handleColorChange(color)} title={color}
                  style={{
                    width:'36px', height:'36px', borderRadius:'10px', background:color, border:'none', cursor:'pointer', transition:'all 0.15s',
                    boxShadow: selectedColor === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : '0 2px 6px rgba(0,0,0,0.15)',
                    transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                  }} />
              ))}
            </div>
            <p style={{ fontFamily:'DM Sans', fontSize:'11px', color:'#94a3b8', margin:'10px 0 0' }}>Color updates everywhere in the app instantly when you click. Save to make it permanent.</p>
          </div>
          {/* Save */}
          <button onClick={savePersonalInfo} disabled={savingPersonal}
            style={{
              width:'100%', padding:'14px', borderRadius:'14px', border:'none',
              background: personalSaved ? 'linear-gradient(135deg,#059669,#10b981)' : savingPersonal ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color:'white', cursor: savingPersonal ? 'not-allowed' : 'pointer',
              fontFamily:'Sora', fontWeight:900, fontSize:'15px',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              boxShadow: savingPersonal || personalSaved ? 'none' : '0 4px 20px rgba(124,58,237,0.3)',
              transition:'all 0.2s',
            }}>
            {savingPersonal ? (<><span style={{ width:'16px', height:'16px', border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />Saving...</>)
              : personalSaved ? (<>✅ Saved!</>)
              : (<>💾 Save Changes</>)}
          </button>
        </div>
      )}

      {/* ═══ SECURITY ═══ */}
      {activeSection === 'security' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Change password */}
          <div style={{ ...cardStyle, padding:'24px' }}>
            <h3 style={{ fontFamily:'Sora', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>🔒 Change Password</h3>
            <p style={{ fontFamily:'DM Sans', fontSize:'13px', color:'#64748b', margin:'0 0 20px', lineHeight:1.6 }}>Enter your current password to verify your identity, then set a new one.</p>
            {[
              { label:'Current Password', value:currentPassword, setter:setCurrentPassword, show:showCurrentPw, toggle:()=>setShowCurrentPw(p=>!p) },
              { label:'New Password', value:newPassword, setter:setNewPassword, show:showNewPw, toggle:()=>setShowNewPw(p=>!p) },
              { label:'Confirm New Password', value:confirmPassword, setter:setConfirmPassword, show:showConfirmPw, toggle:()=>setShowConfirmPw(p=>!p) },
            ].map((f, i) => (
              <div key={f.label} style={{ marginBottom: i < 2 ? '14px' : '0' }}>
                <label style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'6px' }}>{f.label}</label>
                <div style={{ position:'relative' }}>
                  <input type={f.show ? 'text' : 'password'} value={f.value} onChange={e => f.setter(e.target.value)} placeholder="••••••••"
                    style={{ width:'100%', padding:'11px 44px 11px 14px', borderRadius:'12px', border:'1.5px solid #e2e8f0', fontFamily:'DM Sans', fontSize:'14px', color:'#0f172a', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor='#7c3aed'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
                  <button onClick={f.toggle} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#94a3b8', padding:'4px' }}>
                    {f.show ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            ))}
            {newPassword.length > 0 && (
              <div style={{ marginTop:'10px' }}>
                <div style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:'3px', borderRadius:'50px', background: newPassword.length >= i * 2 ? i <= 1 ? '#dc2626' : i <= 2 ? '#f59e0b' : i <= 3 ? '#3b82f6' : '#059669' : '#f1f5f9', transition:'background 0.2s' }} />
                  ))}
                </div>
                <p style={{ fontFamily:'DM Sans', fontSize:'11px', color:'#94a3b8', margin:0 }}>{newPassword.length < 4 ? 'Too short' : newPassword.length < 6 ? 'Weak' : newPassword.length < 8 ? 'Fair' : 'Strong ✓'}</p>
              </div>
            )}
            {pwError && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', padding:'10px 14px', marginTop:'14px', fontFamily:'DM Sans', fontSize:'13px', color:'#dc2626', fontWeight:600 }}>❌ {pwError}</div>}
            {pwSuccess && <div style={{ background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:'10px', padding:'10px 14px', marginTop:'14px', fontFamily:'DM Sans', fontSize:'13px', color:'#059669', fontWeight:600 }}>✅ Password updated successfully!</div>}
            <button onClick={handlePasswordChange} disabled={pwLoading}
              style={{
                width:'100%', padding:'13px', borderRadius:'12px', border:'none', marginTop:'18px',
                background: pwLoading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color:'white', cursor: pwLoading ? 'not-allowed' : 'pointer',
                fontFamily:'Sora', fontWeight:800, fontSize:'14px',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              }}>
              {pwLoading ? (<><span style={{ width:'15px', height:'15px', border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />Verifying &amp; Updating...</>) : '🔒 Update Password'}
            </button>
          </div>

          {/* Sessions */}
          <div style={{ ...cardStyle, padding:'24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px', gap:'12px', flexWrap:'wrap' }}>
              <div>
                <h3 style={{ fontFamily:'Sora', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>📱 Login Sessions</h3>
                <p style={{ fontFamily:'DM Sans', fontSize:'13px', color:'#64748b', margin:0 }}>Your recent logins. {sessions.filter(s=>s.is_active).length} active right now.</p>
              </div>
              {sessions.filter(s => s.is_active).length > 1 && (
                <button onClick={logoutOtherSessions} disabled={logoutOtherLoading}
                  style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#dc2626', padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontFamily:'DM Sans', fontWeight:700, fontSize:'12px', flexShrink:0 }}>
                  {logoutOtherLoading ? 'Logging out...' : '🚪 Log Out Other Devices'}
                </button>
              )}
            </div>
            {sessions.length === 0 ? (
              <p style={{ fontFamily:'DM Sans', fontSize:'13px', color:'#94a3b8', textAlign:'center', padding:'16px 0' }}>No session history found.</p>
            ) : sessions.map((session, i) => (
              <div key={session.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom: i < sessions.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0, background: session.is_active ? 'rgba(5,150,105,0.1)' : '#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
                  {deviceIcon(session.device_type)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                    <span style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'13px', color:'#0f172a' }}>{session.browser || 'Browser'} on {session.os || 'Unknown OS'}</span>
                    {session.is_active && <span style={{ background:'rgba(5,150,105,0.1)', color:'#059669', padding:'1px 8px', borderRadius:'50px', fontFamily:'DM Sans', fontWeight:800, fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Active</span>}
                  </div>
                  <p style={{ fontFamily:'DM Sans', fontSize:'11px', color:'#94a3b8', margin:0 }}>
                    {[session.ip_city, session.ip_state].filter(Boolean).join(', ') || 'Unknown location'} · {formatRelative(session.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ACCOUNT ═══ */}
      {activeSection === 'account' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Credits */}
          <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(168,85,247,0.06))', backdropFilter:'blur(20px)', borderRadius:'16px', padding:'24px', border:'1px solid rgba(124,58,237,0.15)', boxShadow:'0 4px 20px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontFamily:'Sora', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 16px' }}>⚡ My Credits</h3>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
              <div>
                <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'4px' }}>
                  <span style={{ fontFamily:'Sora', fontWeight:900, fontSize:'42px', color:'#7c3aed', lineHeight:1 }}>{credits}</span>
                  <span style={{ fontFamily:'DM Sans', fontSize:'15px', color:'#94a3b8' }}>credits remaining</span>
                </div>
                <p style={{ fontFamily:'DM Sans', fontSize:'12px', color:'#94a3b8', margin:0 }}>≈ ₹{credits} in AI research value · Credits never expire</p>
              </div>
              <button onClick={() => setShowTopUp(true)}
                style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', border:'none', borderRadius:'12px', padding:'12px 24px', cursor:'pointer', fontFamily:'Sora', fontWeight:800, fontSize:'14px', boxShadow:'0 4px 16px rgba(124,58,237,0.3)', flexShrink:0 }}>
                ⚡ Add Credits
              </button>
            </div>
            {credits < 20 && credits >= 0 && (
              <div style={{ background: credits === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${credits === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius:'10px', padding:'10px 14px', marginTop:'14px', fontFamily:'DM Sans', fontSize:'13px', color: credits === 0 ? '#dc2626' : '#b45309', fontWeight:600 }}>
                {credits === 0 ? '🚨 You have no credits left. Top up to continue using AI tools.' : `⚠️ Low balance — only ${credits} credits remaining.`}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={{ ...cardStyle, padding:'24px' }}>
            <h3 style={{ fontFamily:'Sora', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>🔔 Notification Preferences</h3>
            <p style={{ fontFamily:'DM Sans', fontSize:'13px', color:'#64748b', margin:'0 0 20px' }}>Choose what emails you receive from Shikshantaram OS.</p>
            {[
              { key:'newTools', label:'New tools & feature launches', sub:'Get notified when we add new modules or capabilities', value:notifNewTools, setter:setNotifNewTools },
              { key:'tips', label:'Product tips & tutorials', sub:'Weekly tips to help you get more from Shikshantaram OS', value:notifTips, setter:setNotifTips },
            ].map(item => (
              <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'14px 0', borderBottom: item.key === 'newTools' ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:'14px', color:'#0f172a', margin:'0 0 2px' }}>{item.label}</p>
                  <p style={{ fontFamily:'DM Sans', fontSize:'12px', color:'#94a3b8', margin:0 }}>{item.sub}</p>
                </div>
                <div onClick={() => { item.setter((p: boolean) => !p); setTimeout(saveNotifications, 300); }}
                  style={{ width:'44px', height:'24px', borderRadius:'50px', flexShrink:0, background: item.value ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                  <div style={{ position:'absolute', top:'3px', left: item.value ? '23px' : '3px', width:'18px', height:'18px', borderRadius:'50%', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
                </div>
              </div>
            ))}
            {savingNotif && <p style={{ fontFamily:'DM Sans', fontSize:'11px', color:'#94a3b8', margin:'8px 0 0', textAlign:'right' }}>Saving preferences...</p>}
          </div>

          {/* Danger zone */}
          <div style={{ background:'rgba(239,68,68,0.03)', backdropFilter:'blur(20px)', borderRadius:'16px', padding:'24px', border:'1px solid rgba(239,68,68,0.12)', boxShadow:'0 4px 20px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily:'Sora', fontWeight:800, fontSize:'16px', color:'#dc2626', margin:'0 0 4px' }}>⚠️ Danger Zone</h3>
            <p style={{ fontFamily:'DM Sans', fontSize:'13px', color:'#64748b', margin:'0 0 16px', lineHeight:1.6 }}>Requesting deletion will notify our team. We will delete your account and all associated data within 48 hours.</p>
            <button onClick={() => setShowDeleteConfirm(true)}
              style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.2)', color:'#dc2626', padding:'11px 20px', borderRadius:'12px', cursor:'pointer', fontFamily:'DM Sans', fontWeight:700, fontSize:'13px' }}>
              🗑️ Request Account Deletion
            </button>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'white', borderRadius:'24px', padding:'36px 32px', maxWidth:'400px', width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:'48px', textAlign:'center', marginBottom:'16px' }}>⚠️</div>
            <h2 style={{ fontFamily:'Sora', fontWeight:900, fontSize:'20px', color:'#0f172a', textAlign:'center', marginBottom:'10px' }}>Delete Account?</h2>
            <p style={{ fontFamily:'DM Sans', fontSize:'14px', color:'#64748b', textAlign:'center', lineHeight:1.7, marginBottom:'20px' }}>
              This will permanently delete your account, all saved work, and credits. Type <strong>DELETE</strong> to confirm.
            </p>
            <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="Type DELETE to confirm"
              style={{ width:'100%', padding:'11px 14px', borderRadius:'12px', border:`1.5px solid ${deleteInput === 'DELETE' ? '#dc2626' : '#e2e8f0'}`, fontFamily:'DM Sans', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'16px', textAlign:'center', fontWeight:700 }} />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1.5px solid #e2e8f0', background:'transparent', cursor:'pointer', fontFamily:'DM Sans', fontWeight:700, fontSize:'14px', color:'#64748b' }}>Cancel</button>
              <button onClick={requestDeletion} disabled={deleteInput !== 'DELETE' || deleteLoading}
                style={{ flex:2, padding:'12px', borderRadius:'12px', border:'none', background: deleteInput === 'DELETE' ? '#dc2626' : 'rgba(239,68,68,0.3)', color:'white', cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed', fontFamily:'DM Sans', fontWeight:800, fontSize:'14px' }}>
                {deleteLoading ? 'Requesting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TopUp modal */}
      {showTopUp && (
        <TopUpModal userId={user.id} userEmail={user.email || ''} userName={editName || ''} currentBalance={credits}
          onClose={() => setShowTopUp(false)} onSuccess={(newBalance) => { setCredits(newBalance); setShowTopUp(false); }} />
      )}
    </div>
  );
}
