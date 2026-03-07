import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ProfileData {
  full_name: string;
  phone: string;
  access_tier: string;
  payment_status: string;
  is_beta_user: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  bio: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  website: string;
  avatar_gradient: string;
}

interface FormData {
  fullName: string;
  username: string;
  phone: string;
  bio: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  website: string;
  avatarGradient: string;
}

const GRADIENT_OPTIONS = [
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#ea580c,#f59e0b)',
  'linear-gradient(135deg,#059669,#06b6d4)',
  'linear-gradient(135deg,#0891b2,#6366f1)',
  'linear-gradient(135deg,#ec4899,#f97316)',
  'linear-gradient(135deg,#0f172a,#334155)',
];

const GRADIENT_ACCENTS = ['#7c3aed', '#ea580c', '#059669', '#0891b2', '#ec4899', '#334155'];

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', fontWeight: 500,
  background: '#f8fafc', outline: 'none', transition: 'all 0.18s',
};

const labelStyle: CSSProperties = {
  fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#64748b',
  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
};

const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#7c3aed';
  e.target.style.background = 'white';
  e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)';
};
const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#e2e8f0';
  e.target.style.background = '#f8fafc';
  e.target.style.boxShadow = 'none';
};

function getInitials(name: string): string {
  if (!name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getRelativeTime(date: Date | null): string {
  if (!date) return 'Not saved yet';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs} seconds ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return `${Math.floor(mins / 60)} hour${Math.floor(mins / 60) > 1 ? 's' : ''} ago`;
}

/* ─── SVG Icons ─── */
const InstagramSvg = ({ color = '#e1306c', size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill={color} stroke="none"/></svg>
);
const LinkedInSvg = ({ color = '#0a66c2', size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);
const TwitterSvg = ({ color = '#000', size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);
const FacebookSvg = ({ color = '#1877f2', size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const GlobeSvg = ({ color = '#7c3aed', size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const LockSmallSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

/* ─── Skeleton ─── */
const Pulse = ({ w, h, r = 6, mt = 0, mx }: { w: number | string; h: number; r?: number; mt?: number; mx?: string }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#f1f5f9', animation: 'pulse 1.4s ease-in-out infinite', marginTop: mt, marginLeft: mx === 'auto' ? 'auto' : undefined, marginRight: mx === 'auto' ? 'auto' : undefined }} />
);

function SkeletonLeft() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '28px 24px', textAlign: 'center' }}>
        <Pulse w={88} h={88} r={44} mx="auto" />
        <Pulse w={140} h={14} mt={16} mx="auto" />
        <Pulse w={100} h={12} mt={8} mx="auto" />
        <Pulse w={200} h={12} mt={10} mx="auto" />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          {[0,1,2,3,4,5].map(i => <Pulse key={i} w={22} h={22} r={11} />)}
        </div>
      </div>
      <div style={{ background: 'rgba(124,58,237,0.04)', borderRadius: 20, padding: '20px 22px' }}>
        <Pulse w={160} h={14} />
        {[0,1,2].map(i => <Pulse key={i} w="100%" h={16} mt={12} />)}
      </div>
    </div>
  );
}

function SkeletonRight() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '28px 28px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Pulse w={30} h={30} r={8} />
        <div><Pulse w={120} h={14} /><Pulse w={160} h={10} mt={4} /></div>
      </div>
      {[0,1,2].map(i => <Pulse key={i} w="100%" h={40} mt={16} />)}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 28 }}>
        <Pulse w={30} h={30} r={8} />
        <div><Pulse w={80} h={14} /><Pulse w={180} h={10} mt={4} /></div>
      </div>
      <Pulse w="100%" h={110} mt={16} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 28 }}>
        <Pulse w={30} h={30} r={8} />
        <div><Pulse w={100} h={14} /><Pulse w={150} h={10} mt={4} /></div>
      </div>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <Pulse w={32} h={32} r={8} />
          <Pulse w="100%" h={40} />
        </div>
      ))}
    </div>
  );
}

/* ─── Social pill for left card ─── */
const PLATFORM_COLORS: Record<string, { color: string; lightBg: string; label: string }> = {
  instagram: { color: '#e1306c', lightBg: '#fce7f3', label: 'Instagram' },
  linkedin: { color: '#0a66c2', lightBg: '#dbeafe', label: 'LinkedIn' },
  twitter: { color: '#000000', lightBg: '#f1f5f9', label: 'X / Twitter' },
  facebook: { color: '#1877f2', lightBg: '#dbeafe', label: 'Facebook' },
  website: { color: '#7c3aed', lightBg: '#ede9fe', label: 'Website' },
};

const PLATFORM_ICONS: Record<string, (s: number) => JSX.Element> = {
  instagram: (s) => <InstagramSvg size={s} />,
  linkedin: (s) => <LinkedInSvg size={s} />,
  twitter: (s) => <TwitterSvg size={s} />,
  facebook: (s) => <FacebookSvg size={s} />,
  website: (s) => <GlobeSvg size={s} />,
};

function SocialPill({ platform, url }: { platform: string; url: string }) {
  const [hovered, setHovered] = useState(false);
  const info = PLATFORM_COLORS[platform];
  if (!info) return null;
  return (
    <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 5, alignItems: 'center', textDecoration: 'none',
        background: hovered ? info.lightBg : '#f8fafc',
        border: `1px solid ${hovered ? info.color : '#e2e8f0'}`,
        borderRadius: 50, padding: '6px 12px', transition: 'all 0.15s',
        color: hovered ? info.color : '#475569',
      }}>
      {PLATFORM_ICONS[platform](14)}
      <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600 }}>{info.label}</span>
    </a>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function ProfilePage({
  user, profile, onProfileUpdate, onNavigateDashboard,
}: {
  user: User;
  profile: any;
  onProfileUpdate: () => Promise<void>;
  onNavigateDashboard: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: '', username: '', phone: '', bio: '',
    instagram: '', linkedin: '', twitter: '', facebook: '', website: '',
    avatarGradient: GRADIENT_OPTIONS[0],
  });
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      const p = data as any;
      setProfileData(p);
      const fd: FormData = {
        fullName: p.full_name || '',
        username: p.username || '',
        phone: p.phone || '',
        bio: p.bio || '',
        instagram: p.instagram || '',
        linkedin: p.linkedin || '',
        twitter: p.twitter || '',
        facebook: p.facebook || '',
        website: p.website || '',
        avatarGradient: p.avatar_gradient || GRADIENT_OPTIONS[0],
      };
      setFormData(fd);
      setOriginalData(fd);
      setIsDirty(false);
      if (p.updated_at) setLastSaved(new Date(p.updated_at));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadProfileData(); }, [loadProfileData]);

  const updateField = (key: keyof FormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(originalData));
      return next;
    });
    if (saveError) setSaveError(null);
  };

  const handleUsernameChange = (val: string) => {
    updateField('username', val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.fullName.trim(),
          username: formData.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''),
          phone: formData.phone.trim(),
          bio: formData.bio.trim().slice(0, 280),
          instagram: formData.instagram.trim(),
          linkedin: formData.linkedin.trim(),
          twitter: formData.twitter.trim(),
          facebook: formData.facebook.trim(),
          website: formData.website.trim(),
          avatar_gradient: formData.avatarGradient,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);
      if (error) throw error;
      setIsDirty(false);
      setOriginalData({ ...formData });
      setLastSaved(new Date());
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 3000);
      await onProfileUpdate();
    } catch (err: any) {
      setSaveError(err.message || 'Save failed');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (originalData) {
      setFormData({ ...originalData });
      setIsDirty(false);
    }
  };

  const initials = getInitials(formData.fullName).toUpperCase();
  const tier = profileData?.access_tier || profile?.access_tier || 'basic';
  const paymentStatus = profileData?.payment_status || profile?.payment_status || 'none';

  const socials = [
    { key: 'instagram', val: formData.instagram },
    { key: 'linkedin', val: formData.linkedin },
    { key: 'twitter', val: formData.twitter },
    { key: 'facebook', val: formData.facebook },
    { key: 'website', val: formData.website },
  ].filter(s => s.val.trim());

  /* ─── Error state ─── */
  if (loadError && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <span style={{ fontSize: 32 }}>😕</span>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Could not load profile</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' }}>Please refresh the page or contact support.</div>
        <button onClick={loadProfileData} style={{
          marginTop: 8, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none',
          borderRadius: 10, padding: '10px 22px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>Retry</button>
      </div>
    );
  }

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 28, animation: 'fadeUp 0.4s ease' }}>
          <Pulse w={180} h={12} />
          <Pulse w={140} h={26} mt={8} />
          <Pulse w={320} h={14} mt={6} />
        </div>
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>
          <SkeletonLeft />
          <SkeletonRight />
        </div>
      </div>
    );
  }

  /* ─── Tier badge ─── */
  const tierBadge = () => {
    if (tier === 'premium') return <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 50, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white' }}>PREMIUM ✦</span>;
    if (tier === 'beta') return <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 50, background: 'linear-gradient(135deg,#ec4899,#c026d3)', color: 'white' }}>BETA 🧪</span>;
    return <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 50, background: '#dcfce7', color: '#15803d' }}>BASIC</span>;
  };

  const paymentLabel = () => {
    if (paymentStatus === 'reserved') return <span style={{ color: '#059669', fontWeight: 700 }}>Reserve Paid ✓</span>;
    if (paymentStatus === 'paid') return <span style={{ color: '#059669', fontWeight: 700 }}>Full Payment ✓</span>;
    if (paymentStatus === 'beta') return <span style={{ color: '#ec4899', fontWeight: 700 }}>Beta Access</span>;
    return <span style={{ color: '#f59e0b', fontWeight: 700 }}>Pending</span>;
  };

  const toolsLabel = () => {
    if (tier === 'premium') return <span style={{ color: '#7c3aed', fontWeight: 700 }}>All tools ✦</span>;
    if (tier === 'beta') return <span style={{ color: '#ec4899', fontWeight: 700 }}>All tools 🧪</span>;
    return <span style={{ color: '#64748b' }}>2 of 8 tools</span>;
  };

  const cardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  };

  const sectionHeader = (emoji: string, bgColor: string, title: string, subtitle: string) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{emoji}</div>
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{title}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ height: 1, background: '#f1f5f9' }} />
    </div>
  );

  const socialFieldData = [
    { key: 'instagram' as const, icon: (s: number) => <InstagramSvg size={s} />, bg: '#fce7f3', placeholder: 'instagram.com/yourusername' },
    { key: 'linkedin' as const, icon: (s: number) => <LinkedInSvg size={s} />, bg: '#dbeafe', placeholder: 'linkedin.com/in/yourprofile' },
    { key: 'twitter' as const, icon: (s: number) => <TwitterSvg size={s} />, bg: '#f1f5f9', placeholder: 'twitter.com/yourhandle or x.com/yourhandle' },
    { key: 'facebook' as const, icon: (s: number) => <FacebookSvg size={s} />, bg: '#dbeafe', placeholder: 'facebook.com/yourprofile' },
    { key: 'website' as const, icon: (s: number) => <GlobeSvg size={s} />, bg: '#ede9fe', placeholder: 'https://yourwebsite.com' },
  ];

  return (
    <div>
      {/* ═══ PAGE HEADER ═══ */}
      <div style={{ animation: 'fadeUp 0.4s ease', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8' }}>
            <span onClick={onNavigateDashboard} style={{ cursor: 'pointer', color: '#94a3b8' }}>Dashboard</span>
            {' / '}
            <span style={{ fontWeight: 700, color: '#0f172a' }}>My Profile</span>
          </div>
          <h1 style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 }}>My Profile</h1>
          <p style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 }}>
            Manage your account, access details & public creator profile.
          </p>
        </div>
        {isDirty && (
          <button onClick={saveProfile} disabled={saving} style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 22px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35)', animation: 'fadeUp 0.3s ease', transition: 'transform 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
            {saving ? 'Saving...' : 'Save Changes ✓'}
          </button>
        )}
      </div>

      {/* ═══ TWO COLUMN LAYOUT ═══ */}
      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card A — Identity */}
          <div style={{ ...cardStyle, padding: '28px 24px', textAlign: 'center', animation: 'fadeUp 0.4s ease 0.05s both' }}>
            {/* Avatar */}
            <div style={{
              width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px',
              background: formData.avatarGradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
            }}>
              <span style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: 'white', letterSpacing: '-0.02em' }}>{initials}</span>
            </div>

            {/* Gradient picker */}
            <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pick your colour</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              {GRADIENT_OPTIONS.map((g, i) => (
                <div key={g} onClick={() => updateField('avatarGradient', g)} style={{
                  width: 22, height: 22, borderRadius: '50%', background: g, cursor: 'pointer',
                  border: formData.avatarGradient === g ? '2px solid white' : '2px solid transparent',
                  boxShadow: formData.avatarGradient === g ? `0 0 0 2px ${GRADIENT_ACCENTS[i]}` : 'none',
                  transition: 'all 0.15s',
                }} />
              ))}
            </div>

            {/* Name */}
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: formData.fullName.trim() ? '#0f172a' : '#94a3b8', letterSpacing: '-0.02em', marginTop: 16 }}>
              {formData.fullName.trim() || 'Your Name'}
            </div>

            {/* Username */}
            <div style={{ marginTop: 4 }}>
              {formData.username.trim() ? (
                <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>@{formData.username}</span>
              ) : (
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' }}>Set a username →</span>
              )}
            </div>

            {/* Bio preview */}
            <div style={{
              fontFamily: 'DM Sans', fontSize: 13, color: formData.bio.trim() ? '#64748b' : '#cbd5e1',
              lineHeight: 1.65, textAlign: 'center', marginTop: 10, marginBottom: 16,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as CSSProperties}>
              {formData.bio.trim() || 'Add a bio to introduce yourself to the community.'}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            {/* Social pills */}
            {socials.length > 0 ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {socials.map(s => <SocialPill key={s.key} platform={s.key} url={s.val} />)}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'center' }}>Add your socials below →</div>
            )}

            {/* Member since */}
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14 }}>
              Member since {formatMemberSince(profileData?.created_at)}
            </div>
          </div>

          {/* Card B — Access & Plan */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(168,85,247,0.04))',
            border: '1px solid rgba(124,58,237,0.15)', borderRadius: 20, padding: '20px 22px',
            animation: 'fadeUp 0.4s ease 0.1s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>🔐 Access & Plan</span>
              {tierBadge()}
            </div>

            {[
              { label: 'Plan Type', value: <span style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#0f172a', fontWeight: 700 }}>{tier === 'basic' ? 'Basic Access' : tier === 'premium' ? 'Premium Access' : 'Beta Access'}</span> },
              { label: 'Payment Status', value: paymentLabel() },
              { label: 'Tools Available', value: toolsLabel(), noBorder: true },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
                borderBottom: row.noBorder ? 'none' : '1px solid rgba(124,58,237,0.08)',
              }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12.5 }}>{row.value}</span>
              </div>
            ))}

            {tier === 'basic' && (
              <div style={{ marginTop: 14, padding: 12, background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.15)', borderRadius: 10 }}>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 700, color: '#ea580c' }}>⚡ Want full access?</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Upgrade to Premium to unlock all 8 tools.</div>
                <a href="mailto:support@shikshantaram.com?subject=Upgrade to Premium" style={{ fontSize: 11.5, color: '#ea580c', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
                  Contact to Upgrade →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (EDIT FORM) ── */}
        <div style={{ ...cardStyle, padding: '28px 28px', animation: 'fadeUp 0.4s ease 0.08s both' }}>
          {/* SECTION 1 — Basic Info */}
          {sectionHeader('👤', '#ede9fe', 'Basic Information', 'Your name and contact details')}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>FULL NAME *</label>
            <input style={inputStyle} value={formData.fullName} placeholder="e.g. Abhinav Sharma"
              onChange={e => updateField('fullName', e.target.value)}
              onFocus={handleFocus} onBlur={handleBlur} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700, fontSize: 14, pointerEvents: 'none' }}>@</span>
              <input style={{ ...inputStyle, paddingLeft: 30 }} value={formData.username} placeholder="yourname"
                onChange={e => handleUsernameChange(e.target.value)}
                onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>This will be your handle in the community. Only letters, numbers, and underscores.</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inputStyle, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }} value={user.email || ''} disabled />
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}><LockSmallSvg /></div>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Email cannot be changed. Contact support if needed.</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>PHONE NUMBER</label>
            <input style={inputStyle} type="tel" value={formData.phone} placeholder="+91 98765 43210"
              onChange={e => updateField('phone', e.target.value)}
              onFocus={handleFocus} onBlur={handleBlur} />
          </div>

          {/* SECTION 2 — Bio */}
          <div style={{ marginTop: 28 }}>
            {sectionHeader('✍️', '#fff7ed', 'Your Bio', 'Introduce yourself to the community')}
            <label style={labelStyle}>ABOUT YOU</label>
            <textarea
              style={{
                ...inputStyle, minHeight: 110, fontSize: 13.5, lineHeight: 1.7, resize: 'vertical',
                padding: '12px 14px',
              } as CSSProperties}
              value={formData.bio}
              maxLength={280}
              placeholder="e.g. I help Indian creators launch digital products and build online income. Building Shikshantaram OS to make it easier for everyone."
              onChange={e => updateField('bio', e.target.value)}
              onFocus={handleFocus as any} onBlur={handleBlur as any}
            />
            <div style={{
              textAlign: 'right', fontFamily: 'DM Sans', fontSize: 11, marginTop: 4,
              color: formData.bio.length >= 280 ? '#ef4444' : formData.bio.length > 250 ? '#f59e0b' : '#94a3b8',
            }}>
              {formData.bio.length}/280
            </div>
          </div>

          {/* SECTION 3 — Social Links */}
          <div style={{ marginTop: 28 }}>
            {sectionHeader('🌐', '#f0f9ff', 'Social Profiles', 'Connect your online presence')}
            {socialFieldData.map(sf => (
              <div key={sf.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: sf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sf.icon(16)}
                </div>
                <input style={{ ...inputStyle, flex: 1 }} value={formData[sf.key]} placeholder={sf.placeholder}
                  onChange={e => updateField(sf.key, e.target.value)}
                  onFocus={handleFocus} onBlur={handleBlur} />
              </div>
            ))}
          </div>

          {/* SECTION 4 — Save Footer */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: showSavedIndicator ? '#059669' : '#94a3b8' }}>
              {showSavedIndicator ? '✅ Saved just now' : `Last saved: ${getRelativeTime(lastSaved)}`}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {isDirty && (
                <button onClick={discardChanges} style={{
                  background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10,
                  padding: '9px 18px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>Discard Changes</button>
              )}
              <button onClick={saveProfile} disabled={saving} style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10,
                padding: '10px 22px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)', opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Saving...' : 'Save Profile →'}
              </button>
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div style={{
              marginTop: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '8px 14px', fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b',
            }}>
              ⚠ Could not save. Please try again.
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
