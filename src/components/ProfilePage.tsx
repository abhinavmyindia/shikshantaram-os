import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import TopUpModal from '@/components/TopUpModal';
import { useLowBalanceThreshold, useReducedMotion } from '@/hooks/useUserPrefs';

/* ───────── Avatar Colors ───────── */
const AVATAR_COLORS = [
  { id: 'purple',  color: '#7c3aed', label: 'Purple'  },
  { id: 'indigo',  color: '#4f46e5', label: 'Indigo'  },
  { id: 'blue',    color: '#2563eb', label: 'Blue'    },
  { id: 'cyan',    color: '#0891b2', label: 'Cyan'    },
  { id: 'teal',    color: '#0d9488', label: 'Teal'    },
  { id: 'green',   color: '#16a34a', label: 'Green'   },
  { id: 'lime',    color: '#65a30d', label: 'Lime'    },
  { id: 'amber',   color: '#d97706', label: 'Amber'   },
  { id: 'orange',  color: '#ea580c', label: 'Orange'  },
  { id: 'red',     color: '#dc2626', label: 'Red'     },
  { id: 'pink',    color: '#db2777', label: 'Pink'    },
  { id: 'rose',    color: '#e11d48', label: 'Rose'    },
  { id: 'violet',  color: '#7c3aed', label: 'Violet'  },
  { id: 'fuchsia', color: '#a21caf', label: 'Fuchsia' },
  { id: 'dark',    color: '#1e293b', label: 'Dark'    },
  { id: 'slate',   color: '#475569', label: 'Slate'   },
];

export { AVATAR_COLORS };

/* ───────── Social Icons (SVG) ───────── */
const SocialIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, JSX.Element> = {
    instagram: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    twitter: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    linkedin: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
      </svg>
    ),
    youtube: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
      </svg>
    ),
    website: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  };
  return icons[platform] || null;
};

/* ───────── Helpers ───────── */
const tierMeta: Record<string, { label: string; color: string; bg: string }> = {
  trial:   { label: 'Trial',   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
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
  // Long-form module names (from ai_usage_logs.module)
  product_navigator: '🧭 Product Navigator',
  niche_clarity: '🎯 Niche Clarity',
  offer_creation: '🎁 Offer Creation',
  funnel_builder: '🔀 Funnel Builder',
  copywriting_suite: '✍️ Copy Suite',
  copy_suite: '✍️ Copy Suite',
  knowledge_base: '📚 Knowledge Base',
  // Short-form tool ids (from tool_usage.tool_id)
  product: '🧭 Product Navigator',
  niche: '🎯 Niche Clarity',
  offer: '🎁 Offer Creation',
  funnel: '🔀 Funnel Builder',
  copy: '✍️ Copy Suite',
  saved: '💾 My Saved',
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

const labelStyle: CSSProperties = {
  fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 6,
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif',
  fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
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
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'security' | 'credits' | 'settings' | 'apikeys'>(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('profile_initial_tab') : null;
    if (stored && ['profile','activity','security','credits','settings','apikeys'].includes(stored)) {
      sessionStorage.removeItem('profile_initial_tab');
      return stored as any;
    }
    return 'profile';
  });

  // Listen for in-page tab navigation requests (e.g. "View all transactions" from TopUpModal)
  useEffect(() => {
    const handler = (e: any) => {
      const tab = e?.detail?.tab;
      if (tab && ['profile','activity','security','credits','settings','apikeys'].includes(tab)) {
        setActiveTab(tab);
        // Scroll the main content area to top so the user lands on the tab header.
        const main = document.getElementById('main-content-area');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('navigateToProfile', handler);
    return () => window.removeEventListener('navigateToProfile', handler);
  }, []);

  // Tab 1 — Profile
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInsta, setEditInsta] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [hoveredColor, setHoveredColor] = useState<typeof AVATAR_COLORS[0] | null>(null);
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
  const [byokLogs7d, setByokLogs7d] = useState<any[]>([]);

  // Tab 5 — Settings
  const [notifNewTools, setNotifNewTools] = useState(true);
  const [notifTips, setNotifTips] = useState(true);
  const [notifCredits, setNotifCredits] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThresholdPref] = useLowBalanceThreshold();
  const [reducedMotion, setReducedMotionPref] = useReducedMotion();

  // Tab 6 — API Keys (BYOK)
  const [byokStatus, setByokStatus] = useState<any[]>([]);
  const [byokPreferred, setByokPreferred] = useState<string | null>(null);
  const [byokLoading, setByokLoading] = useState(false);
  const [byokLoaded, setByokLoaded] = useState(false);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});
  const [saveResults, setSaveResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [deletingKey, setDeletingKey] = useState<Record<string, boolean>>({});
  const [togglingPref, setTogglingPref] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState<Record<string, boolean>>({});

  const PROVIDERS = [
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🔮', description: 'Claude Sonnet — same AI as our platform, your own billing', keyFormat: 'Starts with sk-ant-', docsUrl: 'https://console.anthropic.com/account/keys', models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'], color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
    { id: 'openai', name: 'GPT-4o (OpenAI)', icon: '⚡', description: 'OpenAI GPT-4o — great for structured outputs and coding tasks', keyFormat: 'Starts with sk-', docsUrl: 'https://platform.openai.com/api-keys', models: ['gpt-4o', 'gpt-4o-mini'], color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)' },
    { id: 'gemini', name: 'Gemini (Google)', icon: '✨', description: 'Google Gemini 1.5 Pro — excellent for long context and research', keyFormat: 'Starts with AIza', docsUrl: 'https://aistudio.google.com/app/apikey', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], color: '#0284c7', bg: 'rgba(2,132,199,0.08)', border: 'rgba(2,132,199,0.2)' },
  ];

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
        setNotifCredits((p as any).notif_credits ?? true);
        setNotifSecurity((p as any).notif_security ?? true);
        setDeletionRequested((p as any).deletion_requested || false);
        const col = AVATAR_COLORS.find(c => c.id === (p as any).avatar_color) || AVATAR_COLORS[0];
        setSelectedColor(col);
      }

      const { data: cr } = await supabase.from('user_credits').select('*').eq('user_id', user.id).single();
      setCredits(cr);

      const { data: sess } = await supabase.from('login_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      setSessions(sess || []);

      // Hide zero-amount shadow deductions — they're internal tracking, not real balance changes
      const { data: tx } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .neq('type', 'shadow_deduction')
        .order('created_at', { ascending: false })
        .limit(30);
      setTransactions(tx || []);

      // Activity stats + BYOK logs
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // Fetch BYOK usage for credits tab
      const { data: byokLogs } = await supabase.from('byok_usage_logs').select('provider, created_at').eq('user_id', user.id).gte('created_at', sevenDaysAgo);
      setByokLogs7d(byokLogs || []);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      const [{ data: sessions7d }, { data: aiLogs7d }, { data: toolUsage }] = await Promise.all([
        supabase.from('user_sessions').select('duration_seconds, session_start').eq('user_id', user.id).gte('session_start', sevenDaysAgo),
        supabase.from('ai_usage_logs').select('module, created_at').eq('user_id', user.id).gte('created_at', sevenDaysAgo),
        supabase.from('tool_usage').select('tool_id').eq('user_id', user.id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000);
        return d.toISOString().split('T')[0];
      });
      const dailyMinutes: Record<string, number> = {};
      days.forEach(d => { dailyMinutes[d] = 0; });
      (sessions7d || []).forEach((s: any) => {
        const day = s.session_start?.split('T')[0];
        if (day && dailyMinutes[day] !== undefined)
          dailyMinutes[day] += Math.round((s.duration_seconds || 0) / 60);
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
      const daysSince = Math.floor((Date.now() - new Date((p as any)?.created_at || user.created_at).getTime()) / 86400000);

      setActivityData({ totalSecs7d, todaySecs, aiCalls7d, creditsSpent7d, topTool, dailyMinutes, days, sessionCount7d: (sessions7d || []).length, daysSince });
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
      instagram_url: editInsta.trim(),
      twitter_url: editTwitter.trim(),
      linkedin_url: editLinkedin.trim(),
      youtube_url: editYoutube.trim(),
      website_url: editWebsite.trim(),
      avatar_color: selectedColor.id,
    } as any).eq('id', user.id);
    setSavingProfile(false);
    setProfileSaved(true);
    setProfileData((prev: any) => ({ ...prev, full_name: editName, avatar_color: selectedColor.id }));
    await onProfileUpdate();
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleColorChange = (col: typeof AVATAR_COLORS[0]) => {
    setSelectedColor(col);
    window.dispatchEvent(new CustomEvent('avatarColorChanged', { detail: { color: col.color, id: col.id } }));
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
      user_id: user.id, user_email: user.email!, user_name: editName,
      reason: deleteReason || 'No reason provided', status: 'pending',
    } as any);
    await supabase.from('user_profiles').update({ deletion_requested: true, deletion_requested_at: new Date().toISOString() } as any).eq('id', user.id);
    setDeletionRequested(true);
    setShowDeleteConfirm(false);
    setDeleteLoading(false);
  };

  /* ───────── BYOK Handlers ───────── */
  const loadByokStatus = async () => {
    if (!user) return;
    setByokLoading(true);
    try {
      const { data } = await supabase.functions.invoke('get-byok-status', { body: { userId: user.id } });
      setByokStatus(data?.status || []);
      setByokPreferred(data?.preferredProvider || null);
    } catch (_) {}
    setByokLoaded(true);
    setByokLoading(false);
  };

  useEffect(() => { if (activeTab === 'apikeys' && user && !byokLoaded) loadByokStatus(); }, [activeTab, user, byokLoaded]);

  const handleSaveKey = async (provider: string) => {
    const rawKey = keyInputs[provider]?.trim();
    if (!rawKey) return;
    setSavingKey(prev => ({ ...prev, [provider]: true }));
    setSaveResults(prev => ({ ...prev, [provider]: null }));
    try {
      const { data } = await supabase.functions.invoke('save-byok-key', { body: { userId: user.id, provider, rawKey } });
      if (data?.success) {
        setSaveResults(prev => ({ ...prev, [provider]: { success: true, message: `✅ ${data.message}` } }));
        setKeyInputs(prev => ({ ...prev, [provider]: '' }));
        setShowKeyInput(prev => ({ ...prev, [provider]: false }));
        await loadByokStatus();
      } else {
        setSaveResults(prev => ({ ...prev, [provider]: { success: false, message: `❌ ${data?.error || 'Failed to save key'}` } }));
      }
    } catch (err: any) {
      setSaveResults(prev => ({ ...prev, [provider]: { success: false, message: `❌ ${err.message}` } }));
    }
    setSavingKey(prev => ({ ...prev, [provider]: false }));
    setTimeout(() => setSaveResults(prev => ({ ...prev, [provider]: null })), 5000);
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm(`Remove your ${provider} API key? You'll fall back to platform credits.`)) return;
    setDeletingKey(prev => ({ ...prev, [provider]: true }));
    try {
      await supabase.functions.invoke('delete-byok-key', { body: { userId: user.id, provider } });
      if (byokPreferred === provider) setByokPreferred(null);
      await loadByokStatus();
    } catch (_) {}
    setDeletingKey(prev => ({ ...prev, [provider]: false }));
  };

  const handleSetPreferred = async (provider: string | null) => {
    setTogglingPref(true);
    try {
      const { data } = await supabase.functions.invoke('update-byok-preference', { body: { userId: user.id, provider } });
      if (data?.success) setByokPreferred(data.preferredProvider);
    } catch (_) {}
    setTogglingPref(false);
  };

  const tier = tierMeta[profileData?.access_tier || profile?.access_tier || 'basic'];
  const displayColor = hoveredColor?.color || selectedColor.color;

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
          background: displayColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: `0 4px 16px ${displayColor}44`,
          transition: 'background 0.2s, box-shadow 0.2s',
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

      {/* ─── 6-TAB NAV ─── */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 14, padding: 4, marginBottom: 20 }}>
        {([
          { id: 'profile' as const, icon: '👤', label: 'Profile' },
          { id: 'activity' as const, icon: '📊', label: 'Activity' },
          { id: 'security' as const, icon: '🔒', label: 'Security' },
          { id: 'credits' as const, icon: '⚡', label: 'Credits' },
          { id: 'settings' as const, icon: '⚙️', label: 'Settings' },
          { id: 'apikeys' as const, icon: '🔑', label: 'API Keys' },
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

          {/* Avatar color picker — compact dots */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <label style={labelStyle as any}>Avatar Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: selectedColor.color, boxShadow: `0 2px 6px ${selectedColor.color}44` }} />
                <span style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 12, color: '#64748b' }}>{selectedColor.label}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(col => (
                <button key={col.id} onClick={() => handleColorChange(col)}
                  onMouseEnter={() => setHoveredColor(col)}
                  onMouseLeave={() => setHoveredColor(null)}
                  title={col.label}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: col.color, border: 'none', cursor: 'pointer',
                    outline: selectedColor.id === col.id ? `3px solid ${col.color}` : '2px solid transparent',
                    outlineOffset: 2,
                    transform: selectedColor.id === col.id ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>
              Hover to preview · Click to select · Save to apply
            </p>
          </div>

          {/* Name + Bio */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle as any}>Full Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div>
              <label style={labelStyle as any}>Bio (visible on community profile)</label>
              <textarea value={editBio} onChange={e => setEditBio(e.target.value.slice(0, 160))} placeholder="Tell the community about yourself and what you're building..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' as any, lineHeight: 1.6, minHeight: 80 }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: '4px 0 0', textAlign: 'right' }}>{editBio.length}/160</p>
            </div>
          </div>

          {/* Contact */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle as any}>Email Address</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="email" value={user?.email || ''} disabled
                  style={{ ...inputStyle, border: '1.5px solid #f1f5f9', color: '#94a3b8', background: '#f8fafc', cursor: 'not-allowed' }} />
                <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>🔒 Contact support</span>
              </div>
            </div>
            <div>
              <label style={labelStyle as any}>Phone Number</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 98765 43210"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          </div>

          {/* Social Links — SVG icons */}
          <div style={cardStyle}>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
              Social Links <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11, textTransform: 'none' }}>— shown on your community profile</span>
            </p>
            {[
              { platform: 'instagram', label: 'Instagram', value: editInsta, setter: setEditInsta, placeholder: 'instagram.com/yourhandle' },
              { platform: 'twitter', label: 'Twitter / X', value: editTwitter, setter: setEditTwitter, placeholder: 'twitter.com/yourhandle' },
              { platform: 'linkedin', label: 'LinkedIn', value: editLinkedin, setter: setEditLinkedin, placeholder: 'linkedin.com/in/yourname' },
              { platform: 'youtube', label: 'YouTube', value: editYoutube, setter: setEditYoutube, placeholder: 'youtube.com/@yourchannel' },
              { platform: 'website', label: 'Website', value: editWebsite, setter: setEditWebsite, placeholder: 'yourwebsite.com' },
            ].map((field, i) => (
              <div key={field.platform} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 4 ? 10 : 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: '#f8fafc', border: '1.5px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b', transition: 'border-color 0.15s',
                }}>
                  <SocialIcon platform={field.platform} />
                </div>
                <input type="url" value={field.value} onChange={e => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  style={{ ...inputStyle, flex: 1, width: 'auto', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
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
              { icon: '⏱️', label: 'Today', value: fmtTime(activityData.todaySecs), sub: 'on platform' },
              { icon: '📅', label: 'Last 7 Days', value: fmtTime(activityData.totalSecs7d), sub: 'total time' },
              { icon: '🤖', label: 'AI Calls (7d)', value: activityData.aiCalls7d, sub: 'generations' },
              { icon: '⚡', label: 'Credits Used (7d)', value: activityData.creditsSpent7d, sub: 'spent' },
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
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Minutes per day</p>
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
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Lifetime Credits Used</p>
              <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>{credits?.lifetime_spent ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 3 — SECURITY                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Change password card */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>🔒 Change Password</h3>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 20px', lineHeight:1.6 }}>
              Enter your current password first to verify your identity.
            </p>

            {[
              { label:'Current Password',     value:currentPw,  setter:setCurrentPw,  show:showCurrentPw, toggle:()=>setShowCurrentPw((p: boolean)=>!p) },
              { label:'New Password',         value:newPw,      setter:setNewPw,      show:showNewPw,     toggle:()=>setShowNewPw((p: boolean)=>!p)     },
              { label:'Confirm New Password', value:confirmPw,  setter:setConfirmPw,  show:showConfirmPw, toggle:()=>setShowConfirmPw((p: boolean)=>!p) },
            ].map((f, i) => (
              <div key={f.label} style={{ marginBottom: i < 2 ? '14px' : '0' }}>
                <label style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'6px' }}>
                  {f.label}
                </label>
                <div style={{ position:'relative' }}>
                  <input
                    type={f.show ? 'text' : 'password'}
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder="••••••••"
                    style={{ width:'100%', padding:'11px 44px 11px 14px', borderRadius:'12px', border:'1.5px solid #e2e8f0', fontFamily:'DM Sans,sans-serif', fontSize:'14px', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor='#7c3aed'}
                    onBlur={e => e.target.style.borderColor='#e2e8f0'}
                  />
                  <button onClick={f.toggle} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', padding:'4px' }}>
                    {f.show ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            ))}

            {/* Password strength bar */}
            {newPw.length > 0 && (
              <div style={{ marginTop:'10px' }}>
                <div style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex:1, height:'3px', borderRadius:'50px', transition:'background 0.2s',
                      background: newPw.length >= i*2 ? (i<=1?'#dc2626':i<=2?'#f59e0b':i<=3?'#3b82f6':'#059669') : '#f1f5f9',
                    }} />
                  ))}
                </div>
                <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:0 }}>
                  {newPw.length<4 ? 'Too short' : newPw.length<6 ? 'Weak' : newPw.length<8 ? 'Fair' : 'Strong ✓'}
                </p>
              </div>
            )}

            {pwError   && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', padding:'10px 14px', marginTop:'14px', fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#dc2626', fontWeight:600 }}>❌ {pwError}</div>}
            {pwSuccess && <div style={{ background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:'10px', padding:'10px 14px', marginTop:'14px', fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#059669', fontWeight:600 }}>✅ Password updated! Use your new password next time you log in.</div>}

            <button onClick={handlePasswordChange} disabled={pwLoading} style={{
              width:'100%', padding:'13px', borderRadius:'12px', border:'none', marginTop:'18px',
              background: pwLoading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color:'white', cursor: pwLoading ? 'not-allowed' : 'pointer',
              fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'14px',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            }}>
              {pwLoading
                ? <><span style={{ width:'15px', height:'15px', border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />Verifying & Updating...</>
                : '🔒 Update Password'}
            </button>
          </div>

          {/* Login sessions card */}
          <div style={cardStyle}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px', gap:'12px', flexWrap:'wrap' }}>
              <div>
                <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>📱 Login Sessions</h3>
                <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:0 }}>
                  {sessions.filter((s: any) => s.is_active).length} active · {sessions.length} recent logins
                </p>
              </div>
              {sessions.filter((s: any) => s.is_active).length > 1 && (
                <button onClick={logoutOtherSessions} disabled={logoutLoading} style={{
                  background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                  color:'#dc2626', padding:'8px 16px', borderRadius:'10px',
                  cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px', flexShrink:0,
                }}>
                  {logoutLoading ? 'Logging out...' : '🚪 Log Out Other Devices'}
                </button>
              )}
            </div>

            {sessions.length === 0
              ? <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#94a3b8', textAlign:'center', padding:'16px 0' }}>No session history yet.</p>
              : sessions.map((s: any, i: number) => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom: i < sessions.length-1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'10px', flexShrink:0, background: s.is_active ? 'rgba(5,150,105,0.1)' : '#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
                    {deviceIcon(s.device_type)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px', flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px', color:'#0f172a' }}>
                        {s.browser || 'Browser'} on {s.os || 'Unknown'}
                      </span>
                      {s.is_active && (
                        <span style={{ background:'rgba(5,150,105,0.1)', color:'#059669', padding:'1px 8px', borderRadius:'50px', fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          Active
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:0 }}>
                      {[s.ip_city, s.ip_state].filter(Boolean).join(', ') || 'Unknown location'} · {fmtRelative(s.created_at)}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 4 — CREDITS                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'credits' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Balance hero */}
          <div style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius:'16px', padding:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px', boxShadow:'0 8px 32px rgba(124,58,237,0.25)' }}>
            <div>
              <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'11px', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px' }}>Current Balance</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
                <span style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'52px', color:'white', lineHeight:1 }}>{credits?.balance ?? 0}</span>
                <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'16px', color:'rgba(255,255,255,0.8)' }}>credits</span>
              </div>
              {(credits?.lifetime_spent ?? 0) > 0 && (
                <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'rgba(255,255,255,0.6)', margin:'6px 0 0' }}>
                  Lifetime used: {credits.lifetime_spent} credits
                </p>
              )}
            </div>
            <button onClick={() => setShowTopUp(true)} style={{ background:'white', color:'#7c3aed', border:'none', borderRadius:'12px', padding:'13px 24px', cursor:'pointer', fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'14px', boxShadow:'0 4px 16px rgba(0,0,0,0.15)', flexShrink:0 }}>
              ⚡ Add Credits
            </button>
          </div>

          {/* Pack breakdown */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'15px', color:'#0f172a', margin:'0 0 4px' }}>💡 What Can You Do With Credits?</h3>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 16px' }}>
              Each credit = ₹1 worth of AI research. Here's what every top-up pack gets you:
            </p>

            {[
              { label:'Starter',  amount:500,  total:500,  bonus:0    },
              { label:'Growth',   amount:1000, total:1100, bonus:100  },
              { label:'Pro',      amount:2000, total:2400, bonus:400  },
              { label:'Power',    amount:5000, total:6500, bonus:1500 },
            ].map((pack, i, arr) => (
              <div key={pack.label} style={{ paddingBottom:'14px', marginBottom: i<arr.length-1 ? '14px' : '0', borderBottom: i<arr.length-1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <div>
                    <span style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'14px', color:'#0f172a' }}>{pack.label}</span>
                    <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', marginLeft:'8px' }}>₹{pack.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'14px', color:'#7c3aed' }}>{pack.total.toLocaleString('en-IN')} credits</span>
                    {pack.bonus > 0 && <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#059669', marginLeft:'6px', fontWeight:700 }}>+{pack.bonus} bonus</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {[
                    { icon:'🔬', label:`${Math.floor(pack.total/15)} deep researches`     },
                    { icon:'💡', label:`${Math.floor(pack.total/5)} idea sets`             },
                    { icon:'🎁', label:`${Math.floor(pack.total/12)} full offers`          },
                    { icon:'✍️', label:`${Math.floor(pack.total/8)} copy generations`     },
                  ].map(item => (
                    <span key={item.label} style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#374151', background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:'50px', padding:'3px 10px' }}>
                      {item.icon} {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={() => setShowTopUp(true)} style={{
              width:'100%', padding:'13px', borderRadius:'12px', border:'none', marginTop:'4px',
              background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', cursor:'pointer',
              fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'14px',
              boxShadow:'0 4px 16px rgba(124,58,237,0.25)',
            }}>
              ⚡ Top Up Now
            </button>
          </div>

          {/* Transaction history */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'15px', color:'#0f172a', margin:'0 0 16px' }}>📋 Transaction History</h3>
            {transactions.length === 0
              ? <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#94a3b8', textAlign:'center', padding:'16px 0' }}>No transactions yet.</p>
              : transactions.map((tx: any, i: number) => (
                <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom: i<transactions.length-1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{
                    width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px',
                    background: tx.type==='topup' ? 'rgba(5,150,105,0.1)' : tx.type==='gift'||tx.type==='promo' ? 'rgba(6,182,212,0.1)' : 'rgba(124,58,237,0.08)',
                  }}>
                    {tx.type==='topup' ? '💳' : tx.type==='gift'||tx.type==='promo' ? '🎁' : tx.type==='shadow_deduction' ? '👻' : '⚡'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px', color:'#0f172a', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {tx.description || tx.type}
                    </p>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:0 }}>
                      {fmtRelative(tx.created_at)}
                    </p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'14px', margin:'0 0 2px', color: tx.amount>0 ? '#059669' : '#7c3aed' }}>
                      {tx.amount>0?'+':''}{tx.amount}
                    </p>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'10px', color:'#94a3b8', margin:0 }}>bal: {tx.balance_after}</p>
                  </div>
                </div>
              ))
            }
          </div>


          {/* BYOK section in Credits tab */}
          {byokLogs7d && byokLogs7d.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'15px', color:'#0f172a', margin:'0 0 4px' }}>🔑 Your Key Usage (7 days)</h3>
              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 14px' }}>
                These calls used your own API key — no platform credits deducted.
              </p>
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:'120px', background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.15)', borderRadius:'12px', padding:'14px', textAlign:'center' }}>
                  <p style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'28px', color:'#059669', margin:'0 0 4px' }}>{byokLogs7d.length}</p>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#64748b', margin:0 }}>BYOK calls made</p>
                </div>
                <div style={{ flex:1, minWidth:'120px', background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.12)', borderRadius:'12px', padding:'14px', textAlign:'center' }}>
                  <p style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'28px', color:'#7c3aed', margin:'0 0 4px' }}>~{byokLogs7d.length * 8}</p>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#64748b', margin:0 }}>credits saved</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 5 — SETTINGS                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Notification preferences */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>🔔 Notifications</h3>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 18px' }}>
              Choose what emails you receive from Shikshantaram OS.
            </p>

            {[
              { key:'newTools',  label:'New tools & features',    sub:'Get notified when we launch new modules or major upgrades',    value:notifNewTools,  setter:setNotifNewTools,  dbKey:'notif_new_tools'  },
              { key:'tips',      label:'Product tips & tutorials',sub:'Weekly tips to help you get more from Shikshantaram OS',        value:notifTips,      setter:setNotifTips,      dbKey:'notif_tips'       },
              { key:'credits',   label:'Low credits alert',       sub:'Email when your balance drops below 20 credits',               value:notifCredits,   setter:setNotifCredits,   dbKey:'notif_credits'    },
              { key:'security',  label:'New login detected',      sub:'Alert when a new device or location logs into your account',   value:notifSecurity,  setter:setNotifSecurity,  dbKey:'notif_security'   },
            ].map((item, i, arr) => (
              <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'13px 0', borderBottom: i<arr.length-1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'14px', color:'#0f172a', margin:'0 0 2px' }}>{item.label}</p>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#94a3b8', margin:0 }}>{item.sub}</p>
                </div>
                <div
                  onClick={() => {
                    const newVal = !item.value;
                    item.setter(newVal);
                    setTimeout(() => saveNotifications({ [item.dbKey]: newVal }), 200);
                  }}
                  style={{
                    width:'44px', height:'24px', borderRadius:'50px', flexShrink:0, cursor:'pointer',
                    background: item.value ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e2e8f0',
                    position:'relative', transition:'background 0.2s',
                  }}
                >
                  <div style={{
                    position:'absolute', top:'3px', left: item.value ? '23px' : '3px',
                    width:'18px', height:'18px', borderRadius:'50%', background:'white',
                    boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s',
                  }} />
                </div>
              </div>
            ))}

            {savingNotif && (
              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:'8px 0 0', textAlign:'right' }}>Saving...</p>
            )}
          </div>

          {/* Default AI Provider */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>🤖 Default AI Provider</h3>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 16px' }}>
              Choose which AI engine powers your generations. Using your own key skips credit deductions.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* Platform credits option */}
              <div
                onClick={() => byokPreferred && handleSetPreferred(null)}
                style={{
                  display:'flex', alignItems:'center', gap:'12px', padding:'14px',
                  borderRadius:'12px', cursor: byokPreferred ? 'pointer' : 'default',
                  border: !byokPreferred ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                  background: !byokPreferred ? 'rgba(124,58,237,0.04)' : 'white',
                  transition:'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{
                  width:'18px', height:'18px', borderRadius:'50%', flexShrink:0,
                  border: !byokPreferred ? '5px solid #7c3aed' : '2px solid #cbd5e1',
                  background: !byokPreferred ? 'white' : 'transparent',
                  boxSizing:'border-box',
                }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'14px', color:'#0f172a', margin:'0 0 2px' }}>⚡ Platform Credits</p>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#94a3b8', margin:0 }}>
                    Use Shikshantaram OS credits — managed billing, instant access.
                  </p>
                </div>
              </div>

              {/* BYOK provider options */}
              {PROVIDERS.map(p => {
                const status = byokStatus.find((s: any) => s.provider === p.id);
                const connected = status?.connected && status?.isValid;
                const isPreferred = byokPreferred === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => connected && !isPreferred && handleSetPreferred(p.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:'12px', padding:'14px',
                      borderRadius:'12px',
                      cursor: connected && !isPreferred ? 'pointer' : connected ? 'default' : 'not-allowed',
                      border: isPreferred ? `2px solid ${p.color}` : '1.5px solid #e2e8f0',
                      background: isPreferred ? p.bg : connected ? 'white' : '#f8fafc',
                      opacity: connected ? 1 : 0.6,
                      transition:'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{
                      width:'18px', height:'18px', borderRadius:'50%', flexShrink:0,
                      border: isPreferred ? `5px solid ${p.color}` : '2px solid #cbd5e1',
                      background: isPreferred ? 'white' : 'transparent',
                      boxSizing:'border-box',
                    }} />
                    <div style={{ flex:1 }}>
                      <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'14px', color:'#0f172a', margin:'0 0 2px' }}>
                        {p.icon} {p.name}
                      </p>
                      <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#94a3b8', margin:0 }}>
                        {connected ? 'Connected — using your own key, no credits deducted.' : 'Not connected — add a key in API Keys to enable.'}
                      </p>
                    </div>
                    {!connected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('apikeys'); }}
                        style={{
                          background: p.bg, border:`1px solid ${p.border}`, color: p.color,
                          padding:'6px 12px', borderRadius:'8px', cursor:'pointer',
                          fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px', whiteSpace:'nowrap',
                        }}
                      >
                        Connect →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low-balance alert threshold */}
          <div style={cardStyle}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'4px' }}>
              <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:0 }}>⚡ Low-Balance Alert</h3>
              <span style={{
                fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'15px', color:'#7c3aed',
                background:'rgba(124,58,237,0.08)', padding:'4px 12px', borderRadius:'50px',
              }}>
                {lowBalanceThreshold} credits
              </span>
            </div>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 16px' }}>
              Show a top-up reminder when your balance falls below this threshold.
            </p>

            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThresholdPref(parseInt(e.target.value, 10))}
              style={{
                width:'100%', accentColor:'#7c3aed', cursor:'pointer', height:'6px',
              }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px' }}>
              <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8' }}>5</span>
              <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8' }}>100</span>
            </div>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:'10px 0 0' }}>
              Saved per device. We&rsquo;ll quietly remind you in-app — no extra emails unless you also enabled the email alert above.
            </p>
          </div>

          {/* Reduced motion */}
          <div style={cardStyle}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
              <div style={{ flex:1 }}>
                <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#0f172a', margin:'0 0 4px' }}>🎬 Reduced Motion</h3>
                <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:0 }}>
                  Minimize animations and transitions across the app. Helpful if motion makes you dizzy or you prefer a snappier feel.
                </p>
              </div>
              <div
                onClick={() => setReducedMotionPref(!reducedMotion)}
                style={{
                  width:'44px', height:'24px', borderRadius:'50px', flexShrink:0, cursor:'pointer',
                  background: reducedMotion ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e2e8f0',
                  position:'relative', transition:'background 0.2s',
                }}
              >
                <div style={{
                  position:'absolute', top:'3px', left: reducedMotion ? '23px' : '3px',
                  width:'18px', height:'18px', borderRadius:'50%', background:'white',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s',
                }} />
              </div>
            </div>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:'10px 0 0' }}>
              Saved per device. Applies immediately and persists across sessions.
            </p>
          </div>

          {/* Danger zone */}
          <div style={{ background:'rgba(239,68,68,0.03)', borderRadius:'16px', padding:'22px', border:'1px solid rgba(239,68,68,0.12)' }}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'16px', color:'#dc2626', margin:'0 0 4px' }}>⚠️ Danger Zone</h3>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:'0 0 16px', lineHeight:1.6 }}>
              Requesting deletion notifies our team. We review within 48 hours and will confirm by email. Your data is preserved as a deleted account record.
            </p>

            {deletionRequested ? (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'12px', padding:'14px', fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#b45309', fontWeight:600 }}>
                ⏳ Deletion request submitted. Our team will review and confirm within 48 hours.
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.2)', color:'#dc2626', padding:'11px 20px', borderRadius:'12px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px' }}>
                🗑️ Request Account Deletion
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 6 — API KEYS (BYOK)                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'apikeys' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Header explanation */}
          <div style={{ ...cardStyle, padding:'20px', background:'rgba(124,58,237,0.04)', border:'1px solid rgba(124,58,237,0.15)' }}>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'16px', color:'#0f172a', margin:'0 0 8px' }}>
              🔑 Bring Your Own API Key
            </h3>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#64748b', lineHeight:1.7, margin:'0 0 12px' }}>
              Connect your own AI provider key to use Shikshantaram OS at no credit cost.
              Your key is encrypted with AES-256 and stored securely — we can never see or export it.
            </p>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {['🔒 Encrypted at rest with AES-256-GCM', '🚫 Never logged or returned to frontend', '⚡ Credits not deducted when your key is active', '🔄 Switch back to platform credits anytime'].map(point => (
                <span key={point} style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#374151', background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.12)', borderRadius:'50px', padding:'4px 12px' }}>
                  {point}
                </span>
              ))}
            </div>
          </div>

          {/* Active mode indicator */}
          <div style={{ ...cardStyle, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
            <div>
              <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 4px' }}>Current AI Mode</p>
              <p style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'15px', color:'#0f172a', margin:0 }}>
                {byokPreferred ? `🔑 Using ${PROVIDERS.find(p => p.id === byokPreferred)?.name || byokPreferred}` : '⚡ Using Platform Credits'}
              </p>
            </div>
            {byokPreferred && (
              <button onClick={() => handleSetPreferred(null)} disabled={togglingPref} style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#b45309', padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px' }}>
                Switch to Platform Credits
              </button>
            )}
          </div>

          {/* Provider cards */}
          {byokLoading && !byokLoaded ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'32px' }}>
              <div style={{ width:'28px', height:'28px', border:'3px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            PROVIDERS.map(provider => {
              const status = byokStatus.find((s: any) => s.provider === provider.id);
              const connected = status?.connected && status?.isValid;
              const isPreferred = byokPreferred === provider.id;
              const isSavingProv = savingKey[provider.id];
              const isDeleting = deletingKey[provider.id];
              const result = saveResults[provider.id];
              const showInput = showKeyInput[provider.id];

              return (
                <div key={provider.id} style={{
                  ...cardStyle,
                  border: isPreferred ? `2px solid ${provider.color}` : connected ? `1px solid ${provider.border}` : '1px solid rgba(255,255,255,0.95)',
                }}>
                  {/* Provider header */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flex:1 }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:provider.bg, border:`1px solid ${provider.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                        {provider.icon}
                      </div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                          <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'15px', color:'#0f172a', margin:0 }}>{provider.name}</h3>
                          {isPreferred && <span style={{ background:provider.bg, color:provider.color, padding:'2px 10px', borderRadius:'50px', fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Active</span>}
                          {connected && !isPreferred && <span style={{ background:'rgba(5,150,105,0.08)', color:'#059669', padding:'2px 10px', borderRadius:'50px', fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'10px' }}>Connected</span>}
                        </div>
                        <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#64748b', margin:'2px 0 0' }}>{provider.description}</p>
                      </div>
                    </div>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', flexShrink:0, marginTop:'4px', background: connected ? '#10b981' : '#e2e8f0', boxShadow: connected ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none' }} />
                  </div>

                  {/* Connected state */}
                  {connected && (
                    <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                      <div>
                        <span style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px', color:'#374151' }}>
                          Key ending in <code style={{ background:'#e2e8f0', padding:'1px 6px', borderRadius:'4px', fontSize:'12px', fontFamily:'monospace' }}>{status.keyHint}</code>
                        </span>
                        {status.lastUsed && <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:'2px 0 0' }}>Last used: {new Date(status.lastUsed).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</p>}
                      </div>
                      <div style={{ display:'flex', gap:'6px' }}>
                        {!isPreferred && (
                          <button onClick={() => handleSetPreferred(provider.id)} disabled={togglingPref} style={{ background:provider.bg, border:`1px solid ${provider.border}`, color:provider.color, padding:'6px 14px', borderRadius:'8px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px', whiteSpace:'nowrap' }}>
                            {togglingPref ? '...' : 'Use This Key'}
                          </button>
                        )}
                        <button onClick={() => handleDeleteKey(provider.id)} disabled={isDeleting} style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', color:'#dc2626', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px' }}>
                          {isDeleting ? '...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add key section */}
                  {!connected && (
                    <>
                      {!showInput ? (
                        <button onClick={() => setShowKeyInput(prev => ({ ...prev, [provider.id]: true }))} style={{ width:'100%', padding:'11px', borderRadius:'12px', border:`1.5px dashed ${provider.border}`, background:provider.bg, color:provider.color, cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                          <span style={{ fontSize:'16px' }}>+</span> Connect {provider.name}
                        </button>
                      ) : (
                        <div>
                          <label style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'6px' }}>
                            Your API Key — <span style={{ fontWeight:400, color:'#94a3b8' }}>{provider.keyFormat}</span>
                          </label>
                          <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                            <input type="password" value={keyInputs[provider.id] || ''} onChange={e => setKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))} placeholder={`Paste your ${provider.id} API key here`}
                              style={{ flex:1, padding:'11px 14px', borderRadius:'12px', border:'1.5px solid #e2e8f0', fontFamily:'monospace', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }}
                              onFocus={e => e.target.style.borderColor = provider.color} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
                            <button onClick={() => handleSaveKey(provider.id)} disabled={isSavingProv || !keyInputs[provider.id]?.trim()}
                              style={{ padding:'11px 18px', borderRadius:'12px', border:'none', background: isSavingProv || !keyInputs[provider.id]?.trim() ? 'rgba(124,58,237,0.3)' : `linear-gradient(135deg,${provider.color},${provider.color}cc)`, color:'white', cursor: isSavingProv ? 'not-allowed' : 'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px', whiteSpace:'nowrap', flexShrink:0 }}>
                              {isSavingProv ? (
                                <span style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                  <span style={{ width:'14px', height:'14px', border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
                                  Testing...
                                </span>
                              ) : '🔐 Test & Save'}
                            </button>
                          </div>
                          <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:'0 0 6px' }}>
                            Key is validated with a test call, then encrypted before storage. Never stored in plain text.
                          </p>
                          <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:provider.color, fontWeight:600 }}>
                            Get your {provider.name} API key →
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {/* Save result message */}
                  {result && (
                    <div style={{ marginTop:'10px', padding:'10px 14px', borderRadius:'10px', background: result.success ? 'rgba(5,150,105,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.success ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)'}`, fontFamily:'DM Sans,sans-serif', fontSize:'13px', fontWeight:600, color: result.success ? '#059669' : '#dc2626' }}>
                      {result.message}
                    </div>
                  )}

                  {/* Models available */}
                  <div style={{ marginTop:'12px', display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8' }}>Models:</span>
                    {provider.models.map(m => (
                      <span key={m} style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#374151', background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:'50px', padding:'2px 10px' }}>{m}</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Note about credits */}
          <div style={{ ...cardStyle, padding:'16px 20px', background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.15)' }}>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#b45309', margin:0, lineHeight:1.6 }}>
              <strong>Note:</strong> When your own key is active, AI calls use your provider account directly.
              You will be billed by the provider (Anthropic/OpenAI/Google) — not by Shikshantaram OS.
              Platform credits are only used when no BYOK key is set or when you switch back to platform mode.
            </p>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'white', borderRadius:'24px', padding:'36px 32px', maxWidth:'400px', width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:'48px', textAlign:'center', marginBottom:'16px' }}>⚠️</div>
            <h2 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'20px', color:'#0f172a', textAlign:'center', marginBottom:'10px' }}>Request Account Deletion?</h2>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#64748b', textAlign:'center', lineHeight:1.7, marginBottom:'16px' }}>
              All your saved work, credits, and data will be permanently removed after admin review.
            </p>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'11px', color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'6px' }}>
                Reason (optional)
              </label>
              <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Why are you leaving? Helps us improve." rows={2}
                style={{ width:'100%', padding:'10px 12px', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontFamily:'DM Sans,sans-serif', fontSize:'13px', outline:'none', boxSizing:'border-box', resize:'none' }} />
            </div>
            <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder='Type "DELETE" to confirm'
              style={{ width:'100%', padding:'11px 14px', borderRadius:'12px', border:`1.5px solid ${deleteInput==='DELETE' ? '#dc2626' : '#e2e8f0'}`, fontFamily:'DM Sans,sans-serif', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'16px', textAlign:'center', fontWeight:700 }} />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteReason(''); }} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1.5px solid #e2e8f0', background:'transparent', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'14px', color:'#64748b' }}>
                Cancel
              </button>
              <button onClick={requestDeletion} disabled={deleteInput !== 'DELETE' || deleteLoading} style={{ flex:2, padding:'12px', borderRadius:'12px', border:'none', background: deleteInput==='DELETE' ? '#dc2626' : 'rgba(239,68,68,0.3)', color:'white', cursor: deleteInput==='DELETE' ? 'pointer' : 'not-allowed', fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'14px' }}>
                {deleteLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TopUp modal */}
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
