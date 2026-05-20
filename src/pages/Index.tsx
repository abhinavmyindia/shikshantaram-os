import { useState, useEffect, useRef, CSSProperties, useCallback } from 'react';
import { getRetailValue } from '@/utils/calculateResearchValue';
import { Menu, X } from 'lucide-react';
import AIResearchEngine from '@/components/AIResearchEngine';
import CopySuite from '@/components/CopySuite';
import OfferCreation from '@/components/OfferCreation';
import FunnelBuilder from '@/components/FunnelBuilder';
import MySavedPage from '@/components/MySavedPage';
import KnowledgeBasePage from '@/components/KnowledgeBasePage';
import AskAbhinavAI from '@/components/AskAbhinavAI';
import ChatHistorySidebar from '@/components/ChatHistorySidebar';
import { useNavigate } from 'react-router-dom';
import { nicheCategories, NicheCategory } from '@/data/niches';
import { productCategories, ProductCategory } from '@/data/products';
import { useAuth } from '@/hooks/useAuth';
import { useTracking } from '@/hooks/useTracking';
import BetaFeedback from '@/components/BetaFeedback';
import { supabase } from '@/integrations/supabase/client';
import { autoSaveWork } from '@/utils/recentWork';
import { fileToBase64, getFileType, extractTextFromTxt, extractTextFromDocx, validateFile } from '@/utils/documentExtract';
import ProfilePage, { AVATAR_COLORS } from '@/components/ProfilePage';
import CreditBalance from '@/components/CreditBalance';
// supabase already imported above
import { trackPageView } from '@/utils/activityTracker';
import { useLowBalanceToast } from '@/hooks/useLowBalanceToast';
import TrialCountdownPill from '@/components/TrialCountdownPill';
import TrialExpiryPopup from '@/components/TrialExpiryPopup';
import TrialLockModal, { LockedTool } from '@/components/TrialLockModal';
import TrialStatusBanner from '@/components/TrialStatusBanner';

/* ───────── seedRng ───────── */
function seedRng(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/* ───────── Global Styles (injected) ───────── */
const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
input::placeholder { color: #94a3b8; }
button:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
@keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
@keyframes popIn { from { opacity:0; transform:scale(0.88) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes slideRight { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
@keyframes shimmer { 0%{background-position:-400px 0;} 100%{background-position:400px 0;} }
@keyframes spinSlow { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
@keyframes float { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-6px);} }
@keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.3);} 50%{box-shadow:0 0 40px rgba(124,58,237,0.6);} }
@keyframes shrinkBar { from{width:100%;} to{width:0%;} }
@keyframes cardBounce {
  0%   { transform: translateY(-4px) scale(1); }
  15%  { transform: translateY(-4px) scale(0.96) rotate(-1deg); }
  30%  { transform: translateY(-4px) scale(1.04) rotate(1deg); }
  45%  { transform: translateY(-4px) scale(0.98) rotate(-0.5deg); }
  60%  { transform: translateY(-4px) scale(1.01) rotate(0.5deg); }
  100% { transform: translateY(-4px) scale(1) rotate(0deg); }
}
@keyframes lockBreathe {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50%       { transform: scale(1.08); opacity: 1; }
}
@keyframes badgeShimmer {
  0%   { background-position: -100px 0; }
  100% { background-position: 200px 0; }
}
@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.7; }
}
@keyframes popupFadeOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
@keyframes typeChar {
  from { width: 0; }
  to   { width: 100%; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}
@keyframes radarPulse {
  0%   { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes sparkleFloat {
  0%   { opacity: 0; transform: scale(0) translateY(0); }
  30%  { opacity: 1; transform: scale(1) translateY(-8px); }
  100% { opacity: 0; transform: scale(0.5) translateY(-20px); }
}
@keyframes blockSlide {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(20px, 0); }
  50%  { transform: translate(20px, 16px); }
  75%  { transform: translate(0, 16px); }
  100% { transform: translate(0, 0); }
}
@keyframes flameUp {
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes progressFill {
  from { width: 0%; }
}
`;

function GlobalStyles() {
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);
  return null;
}

/* ───────── SVG Icons ───────── */
const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 50 50" fill="none">
    <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
    <circle cx="21" cy="14" r="2" fill="white"/>
    <circle cx="29" cy="14" r="2" fill="white"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);

const ChevronDown = ({ size = 12, color = '#94a3b8' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
);

const ChevronRight = ({ size = 14, color = '#94a3b8' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
);

/* Nav icons — using lucide-react-style inline SVGs with unique icons per tool */
const GridIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
);
const TargetIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const CompassIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={color} opacity="0.3"/></svg>
);
const GiftIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8"/><path d="M16.5 8a2.5 2.5 0 0 0 0-5C15 3 12 8 12 8"/></svg>
);
const GitMergeIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
);
const PackageIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
const TypeIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
);
const MegaphoneIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
);
const MonitorIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const ChatBubbleIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const GearIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const HelpIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5" fill={color}/></svg>
);
const LockIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const CloseIcon = ({ size = 14, color = '#94a3b8' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

/* ───────── Types ───────── */
type PageId = 'dashboard' | 'niche' | 'product' | 'offer' | 'funnel' | 'copy_suite' | 'settings' | 'help' | 'profile' | 'saved' | 'knowledge_base' | 'ask_abhinav';
interface ToastData { toolName: string; type?: 'locked' | 'premium'; }

const UNLOCKED: PageId[] = ['dashboard', 'niche', 'product', 'offer', 'funnel', 'copy_suite', 'knowledge_base', 'ask_abhinav'];

const TOOL_ACCESS: Record<string, string[]> = {
  dashboard: ['trial','basic','premium','beta'],
  niche: ['trial','basic','premium','beta'],
  product: ['trial','basic','premium','beta'],
  offer: ['basic','premium','beta'],
  funnel: ['basic','premium','beta'],
  copy_suite: ['basic','premium','beta'],
  knowledge_base: ['basic','premium','beta'],
  ask_abhinav: ['trial','basic','premium','beta'],
  creator: ['premium','beta'],
  copy: ['premium','beta'],
  ads: ['premium','beta'],
};

const canAccess = (toolId: string, tier: string) => TOOL_ACCESS[toolId]?.includes(tier) ?? false;

interface NavItem {
  id: string;
  label: string;
  icon: (c: string) => JSX.Element;
  badge?: 'LIVE' | 'SOON';
  locked: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: (c) => <GridIcon color={c} />, locked: false },
  { id: 'niche', label: 'Niche Clarity', icon: (c) => <TargetIcon color={c} />, badge: 'LIVE', locked: false },
  { id: 'product', label: 'Product Navigator', icon: (c) => <CompassIcon color={c} />, badge: 'LIVE', locked: false },
  { id: 'offer', label: 'Offer Creation', icon: (c) => <GiftIcon color={c} />, badge: 'LIVE', locked: false },
  { id: 'funnel', label: 'Funnel Builder', icon: (c) => <GitMergeIcon color={c} />, badge: 'LIVE', locked: false },
  { id: 'copy_suite', label: 'Copywriting Suite', icon: (c) => <TypeIcon color={c} />, badge: 'LIVE', locked: false },
  { id: 'creator', label: 'Product Creator', icon: (c) => <PackageIcon color={c} />, badge: 'LIVE', locked: false },
  { id: 'landing', label: 'Landing Page Designer', icon: (c) => <MonitorIcon color={c} />, badge: 'SOON', locked: true },
  { id: 'ads', label: 'AI Ads Suite', icon: (c) => <MegaphoneIcon color={c} />, badge: 'SOON', locked: true },
];

const TOOL_CARDS = [
  { id: 'niche', num: '01', name: 'Niche Clarity', desc: 'Discover 594+ profitable niches with market data, growth signals & ideal buyer personas.', tags: ['594 Niches', 'Market Data'], gradient: 'linear-gradient(135deg, #7c3aed, #c026d3)', accent: '#7c3aed', accentLight: 'rgba(124,58,237,0.08)', locked: false },
  { id: 'product', num: '02', name: 'Product Navigator', desc: '500+ digital product ideas with launch timelines, price points & full ascension paths.', tags: ['500+ Ideas', 'Launch Fast'], gradient: 'linear-gradient(135deg, #ea580c, #f59e0b)', accent: '#ea580c', accentLight: 'rgba(234,88,12,0.08)', locked: false },
  { id: 'offer', num: '03', name: 'Offer Creation', desc: 'Build irresistible offers with pricing psychology, bonuses & positioning frameworks.', tags: ['Offers', 'Pricing'], gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', accent: '#f59e0b', accentLight: 'rgba(245,158,11,0.08)', locked: false },
  { id: 'funnel', num: '04', name: 'Funnel Builder', desc: 'Design your complete sales funnel — from lead magnet to high-ticket back-end.', tags: ['Funnels', 'Automation'], gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', accent: '#06b6d4', accentLight: 'rgba(6,182,212,0.08)', locked: false },
  { id: 'copy_suite', num: '05', name: 'Copywriting Suite', desc: 'Write sales pages, email sequences, ad copy & hooks in minutes with AI-powered copywriting.', tags: ['Copywriting', 'AI Writing'], gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)', accent: '#8b5cf6', accentLight: 'rgba(139,92,246,0.08)', locked: false },
  { id: 'creator', num: '06', name: 'Product Creator', desc: 'AI-powered suite to create ebooks, templates, prompt packs & micro-courses inside the app.', tags: ['AI Creator', 'Auto-build'], gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', accent: '#10b981', accentLight: 'rgba(16,185,129,0.08)', locked: false },
  { id: 'landing', num: '07', name: 'Landing Page Designer', desc: 'Drag-and-drop page builder with conversion-optimized templates for every product type.', tags: ['Pages', 'Conversion'], gradient: 'linear-gradient(135deg, #6366f1, #7c3aed)', accent: '#6366f1', accentLight: 'rgba(99,102,241,0.08)', locked: true },
  { id: 'ads', num: '08', name: 'AI Ads Suite', desc: 'Generate Meta, Google & YouTube ads with AI — creatives, copy, targeting & budgets.', tags: ['Paid Ads', 'Ad Creatives'], gradient: 'linear-gradient(135deg, #f97316, #ec4899)', accent: '#f97316', accentLight: 'rgba(249,115,22,0.08)', locked: true },
];

/* ───────── Navbar ───────── */
function Navbar({ userName, userTier, isAdmin, onSignOut, onProfileClick, avatarColor = '#7c3aed', userId, trialEndsAt }: { userName: string; userTier: string; isAdmin: boolean; onSignOut: () => void; onProfileClick: () => void; avatarColor?: string; userId?: string; trialEndsAt?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const goToCreditsTab = () => {
    sessionStorage.setItem('profile_initial_tab', 'credits');
    onProfileClick();
    // Also fire event so an already-mounted ProfilePage switches tabs.
    window.dispatchEvent(new CustomEvent('navigateToProfile', { detail: { tab: 'credits' } }));
  };

  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 16px rgba(0,0,0,0.06)', flexShrink: 0,
      position: 'relative' as const, zIndex: 400, overflow: 'visible',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoSvg />
        <span style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 15, color: '#0f172a', letterSpacing: '-0.03em' }}>Shikshantaram OS</span>
        <span style={{ fontSize: 9, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', padding: '2px 7px', borderRadius: 20, letterSpacing: '0.06em' }}>v1.0 BETA</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '7px 12px', border: '1.5px solid #e2e8f0', width: 320, maxWidth: '100%' }}>
        <SearchIcon />
        <input placeholder="Search tools, features..." style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', border: 'none', background: 'transparent', outline: 'none', flex: 1 }} />
        <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 4 }}>⌘K</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        {trialEndsAt && <TrialCountdownPill trialEndsAt={trialEndsAt} onClick={onProfileClick} />}
        {userId && <CreditBalance userId={userId} onTopUp={goToCreditsTab} />}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <BellIcon />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6, borderRadius: '50%', background: '#ea580c' }} />
        </div>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <div onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 4px', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', borderRadius: 50, cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 11, color: 'white' }}>{initials}</span>
          </div>
          <span style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{userName.split(' ')[0]}</span>
          <ChevronDown />
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
            <div style={{
              position: 'absolute', top: 48, right: 0, minWidth: 220, zIndex: 300,
              background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              padding: 8, animation: 'popIn 0.2s ease',
            }}>
              {/* User info */}
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                  <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: 'white' }}>{initials}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{userName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: userTier === 'premium' ? '#ede9fe' : userTier === 'beta' ? '#fce7f3' : '#dcfce7', color: userTier === 'premium' ? '#7c3aed' : userTier === 'beta' ? '#be185d' : '#15803d', padding: '1px 6px', borderRadius: 20, textTransform: 'uppercase' }}>{userTier}</span>
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
              {[
                { emoji: '👤', label: 'My Profile', action: () => onProfileClick() },
                { emoji: '❓', label: 'Help & Docs', action: () => {} },
              ].map(m => (
                <div key={m.label} onClick={() => { m.action(); setMenuOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span>{m.emoji}</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>{m.label}</span>
                </div>
              ))}
              {isAdmin && (
                <>
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                  <div onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span>⚙️</span>
                    <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>Admin Panel →</span>
                  </div>
                </>
              )}
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
              <div onClick={() => { onSignOut(); setMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span>🚪</span>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Sign Out</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────── Sidebar ───────── */
function Sidebar({ activePage, onNavigate, onLockedClick, accessTier = 'basic', savedCount = 0 }: { activePage: PageId; onNavigate: (p: PageId) => void; onLockedClick: (name: string) => void; accessTier?: string; savedCount?: number }) {
  const handleNavigateHome = () => onNavigate('dashboard');
  const [hoveredSoon, setHoveredSoon] = useState<string | null>(null);

  const BookmarkIcon = ({ filled, color = '#64748b' }: { filled?: boolean; color?: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  );

  const liveItems = NAV_ITEMS.filter(i => !i.locked);
  const soonItems = NAV_ITEMS.filter(i => i.locked);
  const liveCount = liveItems.length - 1; // subtract dashboard
  const totalTools = NAV_ITEMS.length - 1; // subtract dashboard

  return (
    <div style={{
      width: 240, flexShrink: 0, height: '100%', overflowY: 'auto', background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.85)', padding: '20px 12px',
      boxShadow: '2px 0 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column',
    }}>
      <ChatHistorySidebar onNavigateHome={handleNavigateHome} />

      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '0 8px', marginTop: 4, paddingBottom: 12, fontFamily: 'DM Sans' }}>MY WORKSPACE</div>

      {/* LIVE items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {liveItems.map(item => {
          const active = activePage === item.id;
          const iconColor = active ? 'white' : '#64748b';
          return (
            <div key={item.id} onClick={() => onNavigate(item.id as PageId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                transition: 'all 0.2s', position: 'relative' as const, width: '100%',
                background: active ? 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(109,40,217,0.06))' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget.style.background = 'rgba(0,0,0,0.03)'); }}
              onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
            >
              {/* Left accent bar */}
              {active && <div style={{ position: 'absolute' as const, left: 0, top: '25%', bottom: '25%', width: 3, background: 'linear-gradient(180deg,#7c3aed,#a855f7)', borderRadius: '0 2px 2px 0' }} />}
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: active ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#f1f5f9',
                boxShadow: active ? '0 3px 10px rgba(124,58,237,0.3)' : 'none',
              }}>
                {item.icon(iconColor)}
              </div>
              <span style={{ fontFamily: active ? 'Sora' : 'DM Sans', fontSize: 14, fontWeight: active ? 800 : 600, color: active ? '#7c3aed' : '#374151', flex: 1 }}>{item.label}</span>
              {item.badge === 'LIVE' && (
                <span style={{ fontSize: 9, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: 50, fontFamily: 'DM Sans', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>LIVE</span>
              )}
            </div>
          );
        })}
      </div>

      {/* LIVE/SOON divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 8px' }}>
        <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
        <span style={{ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, padding: '0 4px' }}>COMING SOON</span>
        <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
      </div>

      {/* SOON items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {soonItems.map(item => (
          <div key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12,
              cursor: 'default', transition: 'all 0.2s', position: 'relative' as const, width: '100%',
              background: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.05)'; setHoveredSoon(item.id); }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; setHoveredSoon(null); }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: hoveredSoon === item.id ? 'rgba(245,158,11,0.1)' : '#f8fafc',
              border: '1px solid #f1f5f9',
              transition: 'all 0.2s',
            }}>
              {item.icon(hoveredSoon === item.id ? '#f59e0b' : '#94a3b8')}
            </div>
            <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: hoveredSoon === item.id ? '#64748b' : '#94a3b8', flex: 1, transition: 'color 0.2s' }}>{item.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#b45309', padding: '2px 7px', borderRadius: 50, fontFamily: 'DM Sans', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>SOON</span>
            {/* Tooltip */}
            {hoveredSoon === item.id && (
              <div style={{
                position: 'absolute' as const, left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)',
                background: '#0f172a', color: 'white', borderRadius: 8, padding: '5px 10px',
                fontFamily: 'DM Sans', fontSize: 11, whiteSpace: 'nowrap' as const, zIndex: 100,
                animation: 'fadeIn 0.15s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}>Coming soon! 🚧</div>
            )}
          </div>
        ))}
      </div>

      {/* My Saved divider + item */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '8px 8px' }} />
      <div onClick={() => onNavigate('saved')}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
          transition: 'all 0.2s', position: 'relative' as const,
          background: activePage === 'saved' ? 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(109,40,217,0.06))' : 'transparent',
        }}
        onMouseEnter={e => { if (activePage !== 'saved') (e.currentTarget.style.background = 'rgba(0,0,0,0.03)'); }}
        onMouseLeave={e => { if (activePage !== 'saved') (e.currentTarget.style.background = 'transparent'); }}
      >
        {activePage === 'saved' && <div style={{ position: 'absolute' as const, left: 0, top: '25%', bottom: '25%', width: 3, background: 'linear-gradient(180deg,#7c3aed,#a855f7)', borderRadius: '0 2px 2px 0' }} />}
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: activePage === 'saved' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : savedCount > 0 ? 'rgba(234,88,12,0.1)' : '#f8fafc',
          boxShadow: activePage === 'saved' ? '0 3px 10px rgba(124,58,237,0.3)' : 'none',
        }}>
          <BookmarkIcon filled={savedCount > 0} color={activePage === 'saved' ? 'white' : savedCount > 0 ? '#ea580c' : '#64748b'} />
        </div>
        <span style={{ fontFamily: activePage === 'saved' ? 'Sora' : 'DM Sans', fontSize: 14, fontWeight: activePage === 'saved' ? 800 : 600, color: activePage === 'saved' ? '#7c3aed' : '#374151', flex: 1 }}>My Saved</span>
        {savedCount > 0 && (
          <span style={{ background: 'linear-gradient(135deg,#ea580c,#f59e0b)', color: 'white', fontFamily: 'DM Sans', fontWeight: 800, fontSize: 9, padding: '2px 7px', borderRadius: 50 }}>
            {savedCount <= 9 ? `${savedCount} saved` : '9+ saved'}
          </span>
        )}
      </div>

      {/* Knowledge Base */}
      <div onClick={() => onNavigate('knowledge_base' as PageId)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
          transition: 'all 0.2s', position: 'relative' as const,
          background: activePage === ('knowledge_base' as string) ? 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(109,40,217,0.06))' : 'transparent',
        }}
        onMouseEnter={e => { if (activePage !== ('knowledge_base' as string)) (e.currentTarget.style.background = 'rgba(0,0,0,0.03)'); }}
        onMouseLeave={e => { if (activePage !== ('knowledge_base' as string)) (e.currentTarget.style.background = 'transparent'); }}
      >
        {activePage === ('knowledge_base' as string) && <div style={{ position: 'absolute' as const, left: 0, top: '25%', bottom: '25%', width: 3, background: 'linear-gradient(180deg,#7c3aed,#a855f7)', borderRadius: '0 2px 2px 0' }} />}
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16,
          background: activePage === ('knowledge_base' as string) ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#f8fafc',
          boxShadow: activePage === ('knowledge_base' as string) ? '0 3px 10px rgba(124,58,237,0.3)' : 'none',
        }}>
          📚
        </div>
        <span style={{ fontFamily: activePage === ('knowledge_base' as string) ? 'Sora' : 'DM Sans', fontSize: 14, fontWeight: activePage === ('knowledge_base' as string) ? 800 : 600, color: activePage === ('knowledge_base' as string) ? '#7c3aed' : '#374151', flex: 1 }}>Knowledge Base</span>
        <span style={{
          background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white',
          fontFamily: 'DM Sans', fontWeight: 800, fontSize: 8, padding: '2px 6px', borderRadius: 50,
          letterSpacing: '0.06em',
        }}>NEW</span>
      </div>

      {/* Settings/Help */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '8px 8px' }} />
      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '0 8px', marginBottom: 6, fontFamily: 'DM Sans' }}>ACCOUNT</div>
      {[{ icon: GearIcon, label: 'Settings' }, { icon: HelpIcon, label: 'Help & Docs' }].map(a => (
        <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><a.icon color="#94a3b8" /></div>
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>{a.label}</span>
        </div>
      ))}

      {/* Progress card */}
      <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(168,85,247,0.06))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: 12 }}>
        <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#7c3aed', marginBottom: 4 }}>🚀 72-Hour Launch</div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 8 }}>{liveCount} of {totalTools} tools unlocked</div>
        <div style={{ width: '100%', height: 5, background: '#f1f5f9', borderRadius: 50 }}>
          <div style={{ width: `${Math.round((liveCount / totalTools) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 50 }} />
        </div>
        <div style={{ fontSize: 9.5, color: '#7c3aed', fontWeight: 600, marginTop: 6 }}>More tools dropping soon →</div>
      </div>
    </div>
  );
}

/* ───────── Toast ───────── */
function Toast({ data, onClose }: { data: ToastData; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const isPremium = data.type === 'premium';

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      background: isPremium ? 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(168,85,247,0.03))' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)', borderRadius: 14, padding: '14px 18px',
      border: isPremium ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 280, maxWidth: 360,
    }}>
      <div style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer' }} onClick={onClose}><CloseIcon /></div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isPremium ? '#ede9fe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{isPremium ? '⚡' : '🔒'}</div>
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{isPremium ? '⚡ Premium Feature' : 'Coming Soon 🔒'}</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginTop: 2 }}>
            {isPremium ? 'Upgrade your Shikshantaram OS plan to unlock all 8 tools.' : `${data.toolName} is under construction. We're building something incredible — stay tuned!`}
          </div>
          {isPremium && (
            <a href="mailto:shikshantaram@gmail.com?subject=Upgrade to Premium" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#7c3aed', textDecoration: 'none' }}>
              Contact to Upgrade →
            </a>
          )}
        </div>
      </div>
      <div style={{ marginTop: 10, height: 3, borderRadius: 50, overflow: 'hidden', background: '#f1f5f9' }}>
        <div style={{ height: '100%', borderRadius: 50, background: 'linear-gradient(90deg,#e2e8f0,#f1f5f9)', backgroundSize: '400px 100%', animation: 'shrinkBar 3.5s linear forwards, shimmer 1.5s linear infinite' }} />
      </div>
    </div>
  );
}

/* ───────── Stat Card ───────── */
function StatCard({ label, value, iconBg, iconColor, changePill, changeColor, icon, delay }: {
  label: string; value: string; iconBg: string; iconColor: string; changePill: string; changeColor: string; icon: string; delay: number;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: '18px 20px',
      border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      animation: `fadeUp 0.4s ease ${delay}s both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 8, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: changeColor, marginTop: 4 }}>{changePill}</div>
    </div>
  );
}

/* ───────── Locked Card Popup Data ───────── */
const LOCKED_POPUP_DATA: Record<string, { emoji: string; title: string; message: string; percent: number; percentLabel: string; funDetail: string }> = {
  creator: { emoji: '✨', title: 'Something Magical is Brewing!', message: "AI-powered product creation in the making. Soon you'll build ebooks, templates & micro-courses in minutes.", percent: 40, percentLabel: '40% built', funDetail: 'sparkles' },
  copy: { emoji: '✍️', title: 'Words Are Being Crafted...', message: 'Your AI copywriter is learning to write headlines that stop thumbs, emails that sell, and ads that convert.', percent: 55, percentLabel: '55% built', funDetail: 'typing' },
  ads: { emoji: '📡', title: 'Launching Ad Intelligence!', message: "We're training our AI on thousands of winning ads. Your campaign machine will be ready to dominate Meta & Google.", percent: 30, percentLabel: '30% built', funDetail: 'radar' },
  landing: { emoji: '🎨', title: 'Designing the Designer!', message: "Meta, right? We're building a page builder inside a beautifully designed app. Worth the wait — trust the process.", percent: 25, percentLabel: '25% built', funDetail: 'blocks' },
};

/* ───────── Fun Detail Components ───────── */
function FlamesDetail() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
      {['🔥', '🔥', '🔥'].map((f, i) => (
        <span key={i} style={{ fontSize: 18, animation: `flameUp 0.4s ease ${0.1 + i * 0.15}s both` }}>{f}</span>
      ))}
    </div>
  );
}

function BuildingDetail() {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500);
    return () => clearInterval(iv);
  }, []);
  return <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#06b6d4', fontWeight: 700, textAlign: 'center', marginTop: 8 }}>Building{dots}</div>;
}

function SparklesDetail() {
  const positions = [
    { top: -8, left: '20%', delay: 0 },
    { top: -4, left: '60%', delay: 0.3 },
    { top: 2, left: '80%', delay: 0.6 },
    { top: -10, left: '40%', delay: 0.9 },
    { top: 0, left: '10%', delay: 1.2 },
  ];
  return (
    <div style={{ position: 'relative', height: 24, marginTop: 4 }}>
      {positions.map((p, i) => (
        <span key={i} style={{ position: 'absolute', top: p.top, left: p.left, fontSize: 14, animation: `sparkleFloat 1.5s ease ${p.delay}s infinite` }}>✨</span>
      ))}
    </div>
  );
}

function TypingDetail() {
  const text = 'Your headline is loading...';
  const [charCount, setCharCount] = useState(0);
  useEffect(() => {
    if (charCount < text.length) {
      const t = setTimeout(() => setCharCount(c => c + 1), 60);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setCharCount(0), 1000);
      return () => clearTimeout(t);
    }
  }, [charCount]);
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b5cf6', textAlign: 'center', marginTop: 8 }}>
      {text.slice(0, charCount)}<span style={{ animation: 'blink 0.8s step-end infinite' }}>|</span>
    </div>
  );
}

function RadarDetail() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, position: 'relative', height: 30 }}>
      {[0, 0.5, 1].map((d, i) => (
        <div key={i} style={{
          position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: '2px solid #f97316',
          animation: `radarPulse 2s ease-out ${d}s infinite`,
        }} />
      ))}
    </div>
  );
}

function BlocksDetail() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, position: 'relative', height: 30 }}>
      <div style={{ width: 20, height: 14, borderRadius: 4, background: '#6366f1', animation: 'blockSlide 2s ease-in-out infinite' }} />
      <div style={{ width: 20, height: 14, borderRadius: 4, background: '#7c3aed', animation: 'blockSlide 2s ease-in-out 0.5s infinite reverse' }} />
    </div>
  );
}

function FunDetailRenderer({ type }: { type: string }) {
  switch (type) {
    case 'flames': return <FlamesDetail />;
    case 'building': return <BuildingDetail />;
    case 'sparkles': return <SparklesDetail />;
    case 'typing': return <TypingDetail />;
    case 'radar': return <RadarDetail />;
    case 'blocks': return <BlocksDetail />;
    default: return null;
  }
}

/* ───────── Locked Card Popup ───────── */
function LockedCardPopup({ cardId, gradient, accent, onClose }: { cardId: string; gradient: string; accent: string; onClose: () => void }) {
  const data = LOCKED_POPUP_DATA[cardId];
  const [notified, setNotified] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [fillActive, setFillActive] = useState(false);

  useEffect(() => {
    setTimeout(() => setFillActive(true), 100);
    const t = setTimeout(() => {
      setFadingOut(true);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!data) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.5)', backdropFilter: 'blur(8px)',
      zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: fadingOut ? 'popupFadeOut 0.3s ease forwards' : 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 360, width: '90%', borderRadius: 24, overflow: 'hidden',
        animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        {/* Close button */}
        <div onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2, border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
        }}>✕</div>
        {/* Top band */}
        <div style={{ height: 100, background: gradient, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            {cardId === 'creator' ? <span style={{ animation: 'spinSlow 3s linear infinite' }}>{data.emoji}</span> : data.emoji}
          </div>
        </div>
        {/* Bottom content */}
        <div style={{ padding: 24, textAlign: 'center', background: 'white' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 6, position: 'relative' }}>
            {data.title}
          </div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>{data.message}</div>
          <FunDetailRenderer type={data.funDetail} />
          {/* Progress bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 50, background: gradient,
                width: fillActive ? `${data.percent}%` : '0%',
                transition: 'width 0.8s ease 0.2s',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 4, textAlign: 'right' }}>{data.percentLabel}</div>
          </div>
          {/* Notify button */}
          <button onClick={(e) => { e.stopPropagation(); setNotified(true); }} style={{
            width: '100%', marginTop: 16, borderRadius: 12, border: 'none', padding: 12,
            fontWeight: 700, fontSize: 13.5, color: notified ? '#15803d' : 'white', cursor: 'pointer',
            background: notified ? '#dcfce7' : gradient,
            boxShadow: notified ? 'none' : `0 4px 16px ${accent}66`,
            transition: 'all 0.2s',
          }}>
            {notified ? '✅ We\'ll notify you!' : 'Notify Me When Live →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Tool Card ───────── */
function ToolCard({ card, onClick, delay, lockedIndex, trialLocked = false }: { card: typeof TOOL_CARDS[0]; onClick: () => void; delay: number; lockedIndex?: number; trialLocked?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  // Treat as locked visually if either the tool is "Coming Soon" OR the user is on a trial without access
  const locked = card.locked || trialLocked;
  const grad = card.gradient;
  const entranceDelay = locked && lockedIndex !== undefined ? (0.18 + lockedIndex * 0.04) : delay;

  const handleClick = () => {
    if (locked) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 500);
    }
    onClick();
  };

  return (
    <div onClick={handleClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: hovered ? `0 12px 40px ${card.accent}30` : '0 4px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.8)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        animation: bouncing
          ? 'cardBounce 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both'
          : `popIn 0.4s ease ${entranceDelay}s both`,
      }}>
      {/* Top band */}
      <div style={{
        height: 120, background: grad, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: hovered && locked ? 'brightness(1.05)' : 'none',
        transition: 'filter 0.22s',
      }}>
        {/* Frosted overlay for locked */}
        {locked && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)' }} />}
        {/* Big bg icon */}
        <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: locked ? 0.15 : 0.12, fontSize: 72 }}>
          {card.id === 'niche' ? '🎯' : card.id === 'product' ? '🧭' : card.id === 'offer' ? '🎁' : card.id === 'funnel' ? '🔽' : card.id === 'creator' ? '✨' : card.id === 'copy' ? '✍️' : card.id === 'ads' ? '📢' : '📄'}
        </div>
        {/* Status badge */}
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 2 }}>
          {locked
            ? <span style={{
                fontSize: 9, fontWeight: 800, color: 'white', padding: '3px 10px', borderRadius: 50,
                letterSpacing: '0.1em', display: 'inline-block',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) 100%)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.35)',
                animation: 'badgePulse 2s ease-in-out infinite',
                position: 'relative' as const, overflow: 'hidden',
              }}>
                <span style={{
                  position: 'absolute' as const, inset: 0,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
                  backgroundSize: '200px 100%',
                  animation: 'badgeShimmer 2.5s linear infinite',
                }} />
                <span style={{ position: 'relative' as const }}>{trialLocked && !card.locked ? '🔒 TRIAL LOCKED' : '⚡ BUILDING NOW'}</span>
              </span>
            : <span style={{ fontSize: 8, fontWeight: 800, background: 'rgba(255,255,255,0.3)', color: 'white', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em' }}>LIVE</span>
          }
        </div>
        {/* Number */}
        <span style={{ position: 'absolute', bottom: 12, left: 20, fontFamily: 'Sora', fontWeight: 900, fontSize: 32, color: locked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.25)' }}>{card.num}</span>
        {/* Lock icon for locked cards */}
        {locked && (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: hovered ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'lockBreathe 3s ease-in-out infinite',
            transition: 'all 0.22s',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            zIndex: 2,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}
      </div>
      {/* Bottom content */}
      <div style={{ padding: '18px 20px 20px', background: locked ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)' }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', opacity: locked ? 0.85 : 1, marginBottom: 4 }}>{card.name}</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#475569', opacity: locked ? 0.9 : 1, lineHeight: 1.6, marginBottom: 14 }}>{card.desc}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {card.tags.map(t => (
              <span key={t} style={{
                fontSize: 10, fontWeight: 600,
                color: locked ? card.accent : '#64748b',
                background: locked ? `${card.accent}12` : '#f1f5f9',
                border: locked ? `1px solid ${card.accent}25` : 'none',
                padding: '2px 8px', borderRadius: 20,
              }}>{t}</span>
            ))}
          </div>
          {locked
            ? <span
                onMouseEnter={e => { e.currentTarget.style.background = card.accent; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${card.accent}12`; e.currentTarget.style.color = card.accent; e.currentTarget.style.transform = 'scale(1)'; }}
                style={{
                  fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12,
                  background: `${card.accent}12`, color: card.accent,
                  border: `1px solid ${card.accent}30`,
                  padding: '5px 14px', borderRadius: 50, cursor: 'pointer',
                  transition: 'all 0.18s',
                }}>{trialLocked && !card.locked ? '🔒 Upgrade to Unlock' : '⚡ Coming Soon'}</span>
            : <button onMouseEnter={e => { e.currentTarget.style.background = card.accent; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = card.accentLight; e.currentTarget.style.color = card.accent; }}
                style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: card.accent, background: card.accentLight, padding: '5px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                Open Tool →
              </button>
          }
        </div>
      </div>
    </div>
  );
}

/* ───────── Dashboard Home ───────── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardHome({ onNavigate, onLockedClick, userName = 'Shiksha', isTrialUser = false }: { onNavigate: (p: PageId) => void; onLockedClick: (name: string) => void; userName?: string; isTrialUser?: boolean }) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [popupCard, setPopupCard] = useState<typeof TOOL_CARDS[0] | null>(null);
  const [recentWork, setRecentWork] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    import('@/utils/recentWork').then(({ loadAllRecentWork }) => {
      loadAllRecentWork(user.id).then(setRecentWork);
    });
  }, [user?.id]);

  const TOOL_META: Record<string, { label: string; icon: string; color: string; page: PageId }> = {
    product_navigator: { label: 'Product Navigator', icon: '🧭', color: '#7c3aed', page: 'product' },
    niche_clarity: { label: 'Niche Clarity', icon: '🎯', color: '#0284c7', page: 'niche' },
    offer_creation: { label: 'Offer Creation', icon: '🎁', color: '#059669', page: 'offer' },
    funnel_builder: { label: 'Funnel Builder', icon: '🔀', color: '#ea580c', page: 'funnel' },
    copy_suite: { label: 'Copy Suite', icon: '✍️', color: '#db2777', page: 'copy_suite' },
  };

  const CALL_TYPE_LABELS: Record<string, string> = {
    deep_research: '🔬 Deep Research',
    generate_ideas: '💡 30 Product Ideas',
    full_offer: '🎁 Full Offer',
    funnel_map: '🔀 Funnel Map',
    copy_output: '✍️ Copy Suite',
    ai_niche_finder: '🤖 AI Niche Research',
  };

  const fmtRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  let lockedIdx = 0;

  return (
    <div>
      {/* Header */}
      <div style={{ animation: 'fadeUp 0.4s ease', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 28, color: '#0f172a', letterSpacing: '-0.02em' }}>{greeting}, {userName.split(' ')[0]} 👋</h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14.5, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>Your digital product universe is ready. Let's build something legendary.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
        <StatCard label="Tools Unlocked" value="5 / 8" iconBg="#ede9fe" iconColor="#7c3aed" icon="⚡" changePill="+5 live now" changeColor="#15803d" delay={0.06} />
        <StatCard label="Product Ideas" value="500+" iconBg="#fff7ed" iconColor="#ea580c" icon="💡" changePill="Explore →" changeColor="#ea580c" delay={0.08} />
        <StatCard label="Niches Mapped" value="594" iconBg="#dcfce7" iconColor="#059669" icon="🎯" changePill="Updated" changeColor="#15803d" delay={0.1} />
        <StatCard label="Time to Launch" value="72 hrs" iconBg="#fce7f3" iconColor="#be185d" icon="🚀" changePill="⚡ Fast track" changeColor="#be185d" delay={0.12} />
      </div>

      {/* Recent Work Widget */}
      {recentWork.length > 0 && (
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.4s ease 0.08s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 17, color: '#0f172a' }}>🕐 Recent Work</h2>
              <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Your last 7 days — click any card to continue</p>
            </div>
            <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 50, padding: '4px 12px' }}>Auto-saved · expires in 7 days</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {recentWork.map(item => {
              const meta = TOOL_META[item.tool] || TOOL_META.product_navigator;
              const daysLeft = Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000);
              return (
                <div key={item.id} onClick={() => onNavigate(meta.page)}
                  style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 10 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: meta.color }}>{meta.label}</span>
                    </div>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>{fmtRelative(item.created_at)}</span>
                  </div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  {item.subtitle && <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 50, padding: '2px 10px' }}>{CALL_TYPE_LABELS[item.call_type] || item.call_type}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {daysLeft <= 2 && <span style={{ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, color: '#b45309', background: 'rgba(245,158,11,0.1)', borderRadius: 50, padding: '2px 8px' }}>{daysLeft}d left</span>}
                      <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: meta.color }}>Continue →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool Suite heading */}
      <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease 0.1s both' }}>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a' }}>Your Tool Suite</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginTop: 2 }}>8 tools to take you from idea to income</p>
      </div>

      {/* Tool cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {TOOL_CARDS.map((card, i) => {
          const TRIAL_LOCKED_CARD_IDS = ['offer', 'funnel', 'copy_suite'];
          const trialLocked = isTrialUser && TRIAL_LOCKED_CARD_IDS.includes(card.id);
          const currentLockedIdx = (card.locked || trialLocked) ? lockedIdx++ : undefined;
          return (
            <ToolCard key={card.id} card={card} delay={0.14 + i * 0.04}
              lockedIndex={currentLockedIdx}
              trialLocked={trialLocked}
              onClick={() => {
                if (trialLocked) { onNavigate(card.id as PageId); return; } // navigateTo opens TrialLockModal
                if (card.locked) { setPopupCard(card); return; }
                onNavigate(card.id as PageId);
              }} />
          );
        })}
      </div>

      {/* Locked card popup */}
      {popupCard && (
        <LockedCardPopup
          cardId={popupCard.id}
          gradient={popupCard.gradient}
          accent={popupCard.accent}
          onClose={() => setPopupCard(null)}
        />
      )}

      {/* Quick Start */}
      <div style={{ marginTop: 32, animation: 'fadeUp 0.4s ease 0.2s both' }}>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 17, color: '#0f172a', marginBottom: 4 }}>🚀 Start Here — Your 72-Hour Launch Path</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 16 }}>Follow these steps to go from zero to your first digital product sale.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { step: '1', emoji: '🎯', title: 'Find Your Niche', desc: 'Use Niche Clarity to find a proven, low-competition niche with strong buyer demand.', cta: 'Start Niche Clarity →', color: '#7c3aed', bg: '#ede9fe', onClick: () => onNavigate('niche') },
            { step: '2', emoji: '📦', title: 'Pick Your Product', desc: 'Use Product Navigator to choose a fast-launch product idea with a built-in ascension path.', cta: 'Open Product Navigator →', color: '#ea580c', bg: '#fff7ed', onClick: () => onNavigate('product') },
            { step: '3', emoji: '🚀', title: 'Build & Launch', desc: 'Use Copywriting Suite to write high-converting sales pages, emails & more. More creator tools dropping soon!', cta: 'Open Copywriting Suite →', color: '#059669', bg: '#dcfce7', onClick: () => onNavigate('copy_suite') },
          ].map(s => (
            <div key={s.step} style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 13 }}>{s.step}</div>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
              </div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 12 }}>{s.desc}</div>
              <button onClick={s.onClick} style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: s.color, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{s.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Category Accordion (shared for niches & products) ───────── */
function CategoryAccordion<T extends { id: string; name: string; iconBg: string; accent: string }>({
  categories, renderItem, getItems, searchTerm, growthFilter, compFilter,
}: {
  categories: T[];
  renderItem: (item: string, cat: T, idx: number) => JSX.Element;
  getItems: (cat: T) => string[];
  searchTerm: string;
  growthFilter: string;
  compFilter: string;
}) {
  const [openCat, setOpenCat] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {categories.map(cat => {
        const items = getItems(cat).filter(n => {
          if (searchTerm && !n.toLowerCase().includes(searchTerm.toLowerCase())) return false;
          if (growthFilter && growthFilter !== 'All') {
            const r = seedRng(n + 'growth');
            const g = r > 0.6 ? 'High' : r > 0.3 ? 'Medium' : 'Low';
            if (g !== growthFilter) return false;
          }
          if (compFilter && compFilter !== 'All') {
            const r = seedRng(n + 'comp');
            const c = r > 0.6 ? 'High' : r > 0.3 ? 'Medium' : 'Low';
            if (c !== compFilter) return false;
          }
          return true;
        });
        if (items.length === 0) return null;
        const open = openCat === cat.id;
        return (
          <div key={cat.id} style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div onClick={() => setOpenCat(open ? null : cat.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {cat.id === 'health' ? '💚' : cat.id === 'dance' ? '💃' : cat.id === 'mental' ? '🧠' : cat.id === 'relationships' ? '❤️' : cat.id === 'money' ? '💰' : cat.id === 'career' ? '💼' : cat.id === 'business' ? '📈' : cat.id === 'ai' ? '🤖' : cat.id === 'leadership' ? '👑' : cat.id === 'lifestyle' ? '🌿' : cat.id === 'creativity' ? '🎨' :
                 cat.id === 'ebooks' ? '📚' : cat.id === 'templates' ? '📋' : cat.id === 'prompts' ? '💬' : cat.id === 'courses' ? '🎓' : cat.id === 'canva' ? '🎨' : cat.id === 'spreadsheets' ? '📊' : cat.id === 'swipes' ? '📝' : cat.id === 'aitools' ? '🤖' : cat.id === 'nocode' ? '⚙️' : cat.id === 'memberships' ? '🏛️' : cat.id === 'dfykits' ? '📦' : '📁'}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{cat.name}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{items.length} items</span>
              </div>
              <ChevronDown size={16} color="#94a3b8" />
            </div>
            {open && (
              <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, animation: 'fadeUp 0.2s ease' }}>
                {items.map((item, idx) => renderItem(item, cat, idx))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Niche Card ───────── */
function NicheCard({ name, accent, onClick }: { name: string; accent: string; onClick: () => void }) {
  const growth = seedRng(name + 'growth');
  const comp = seedRng(name + 'comp');
  const growthLabel = growth > 0.6 ? 'High Growth' : growth > 0.3 ? 'Medium' : 'Emerging';
  const compLabel = comp > 0.6 ? 'High' : comp > 0.3 ? 'Medium' : 'Low';

  return (
    <div onClick={onClick} style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${accent}15`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 8, lineHeight: 1.4 }}>{name}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 20 }}>{growthLabel}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '1px 6px', borderRadius: 20 }}>Comp: {compLabel}</span>
      </div>
    </div>
  );
}

/* ───────── Product Card ───────── */
function ProductCardItem({ name, accent, onClick }: { name: string; accent: string; onClick: () => void }) {
  const speed = seedRng(name + 'speed');
  const price = seedRng(name + 'price');
  const speedLabel = speed > 0.6 ? '⚡ Quick' : speed > 0.3 ? '🔧 Medium' : '🏗️ Deep';
  const priceLabel = price > 0.6 ? '$97–$297' : price > 0.3 ? '$27–$97' : '$7–$27';

  return (
    <div onClick={onClick} style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${accent}15`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 8, lineHeight: 1.4 }}>{name}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '1px 6px', borderRadius: 20 }}>{speedLabel}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 20 }}>{priceLabel}</span>
      </div>
    </div>
  );
}

/* ───────── Niche Modal ───────── */
function NicheModal({ niche, category, onClose }: { niche: string; category: NicheCategory; onClose: () => void }) {
  const r = seedRng(niche);
  const r2 = seedRng(niche + 'data');
  const r3 = seedRng(niche + 'size');
  const personas = ['Priya, 34, Corporate Manager', 'Amit, 28, Freelancer', 'Sarah, 41, Working Mom', 'Raj, 25, College Student', 'Meera, 38, Entrepreneur'];
  const persona = personas[Math.floor(r * personas.length)];
  const growth = r > 0.6 ? 'High' : r > 0.3 ? 'Medium' : 'Emerging';
  const comp = r2 > 0.6 ? 'High' : r2 > 0.3 ? 'Medium' : 'Low';
  const marketSize = `$${(r3 * 50 + 5).toFixed(0)}B`;
  const pains = [
    `Struggles to find reliable guidance on ${niche.toLowerCase()}`,
    `Overwhelmed by conflicting information online`,
    `Needs a structured path to results in ${niche.toLowerCase().split(' ')[0]} area`,
    `Looking for expert-curated content they can trust`,
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 20, overflow: 'hidden', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header band */}
        <div style={{ height: 80, background: `linear-gradient(135deg, ${category.accent}, ${category.iconColor})`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          <div style={{ fontSize: 28 }}>🎯</div>
          <div>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: 'white' }}>{niche}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{category.name}</div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 20 }}>📈 Growth: {growth}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 20 }}>🏆 Competition: {comp}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 20 }}>💰 Market: {marketSize}</span>
          </div>
          {/* Ideal Buyer */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 6 }}>👤 Ideal Buyer Persona</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#475569', background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>{persona}</div>
          </div>
          {/* Pain Points */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 6 }}>🔥 Key Pain Points</div>
            {pains.map((p, i) => (
              <div key={i} style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', lineHeight: 1.6, padding: '4px 0', display: 'flex', gap: 6 }}>
                <span style={{ color: category.accent }}>•</span> {p}
              </div>
            ))}
          </div>
          {/* CTA */}
          <button onClick={onClose} style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${category.accent}, ${category.iconColor})`, color: 'white', border: 'none', borderRadius: 12, fontFamily: 'Sora', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
            View Strategy →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Product Modal ───────── */
function ProductModal({ product, category, onClose }: { product: string; category: ProductCategory; onClose: () => void }) {
  const r = seedRng(product);
  const speed = r > 0.6 ? 'Quick Launch (1–3 days)' : r > 0.3 ? 'Medium Build (1–2 weeks)' : 'Deep Build (2–4 weeks)';
  const price = seedRng(product + 'price');
  const priceLabel = price > 0.6 ? '$97–$297' : price > 0.3 ? '$27–$97' : '$7–$27';
  const ascension = [
    { step: 'Lead Magnet', desc: `Free ${product.split(' ')[0]} checklist to build email list`, price: 'Free' },
    { step: 'Core Product', desc: product, price: priceLabel },
    { step: 'Premium Upsell', desc: `${product} — Premium Bundle with coaching access`, price: '$297–$997' },
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 20, overflow: 'hidden', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ height: 80, background: `linear-gradient(135deg, ${category.accent}, ${category.iconColor})`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          <div style={{ fontSize: 28 }}>🚀</div>
          <div>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: 'white' }}>{product}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{category.name}</div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 20 }}>⚡ {speed}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#059669', padding: '3px 10px', borderRadius: 20 }}>💰 {priceLabel}</span>
          </div>
          {/* Ascension Path */}
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>🚀 Ascension Path</div>
          {ascension.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: category.iconBg, color: category.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{a.step} — <span style={{ color: category.accent }}>{a.price}</span></div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>{a.desc}</div>
              </div>
            </div>
          ))}
          <button onClick={onClose} style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${category.accent}, ${category.iconColor})`, color: 'white', border: 'none', borderRadius: 12, fontFamily: 'Sora', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
            Start Building →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Filter Bar ───────── */
function FilterBar({ search, onSearch, filters, accentColor }: {
  search: string; onSearch: (s: string) => void;
  filters: { label: string; options: string[]; value: string; onChange: (v: string) => void }[];
  accentColor: string;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1.5px solid #e2e8f0' }}>
        <SearchIcon />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search..." style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', border: 'none', background: 'transparent', outline: 'none', flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
        {filters.map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{f.label}:</span>
            {f.options.map(o => (
              <button key={o} onClick={() => f.onChange(o)} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: f.value === o ? accentColor : '#f1f5f9',
                color: f.value === o ? 'white' : '#64748b',
              }}>{o}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Niche Page ───────── */
function NichePage({ onBack, onAction, onNavigate }: { onBack: () => void; onAction?: () => void; onNavigate?: (p: PageId) => void }) {
  const [search, setSearch] = useState('');
  const [growth, setGrowth] = useState('All');
  const [comp, setComp] = useState('All');
  const [modal, setModal] = useState<{ niche: string; cat: NicheCategory } | null>(null);

  // Tab state
  const [ncTab, setNcTab] = useState<'ai_finder' | 'browse'>('ai_finder');
  useEffect(() => { const el = document.getElementById('main-content-area'); if (el) el.scrollTop = 0; }, [ncTab]);

  // AI Niche Finder state
  const [ncBackground, setNcBackground] = useState('');
  const [ncSkills, setNcSkills] = useState('');
  const [ncPassions, setNcPassions] = useState('');
  const [ncExperience, setNcExperience] = useState('');
  const [ncGoals, setNcGoals] = useState('');
  const [ncLoading, setNcLoading] = useState(false);
  const [ncResults, setNcResults] = useState<any[]>([]);
  const [ncError, setNcError] = useState('');
  const [ncExpandedId, setNcExpandedId] = useState<number | null>(null);
  const [ncRestoreBanner, setNcRestoreBanner] = useState(false);
  const [ncRecentData, setNcRecentData] = useState<any>(null);

  useEffect(() => {
    const checkRecent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { loadRecentWork } = await import('@/utils/recentWork');
      const recent = await loadRecentWork(user.id, 'niche_clarity', 'ai_niche_finder');
      if (recent?.outputData?.niches?.length > 0) {
        setNcRecentData(recent);
        setNcRestoreBanner(true);
      }
    };
    checkRecent();
  }, []);

  const handleNcRestore = () => {
    setNcResults(ncRecentData.outputData.niches);
    if (ncRecentData.inputData) {
      setNcBackground(ncRecentData.inputData.background || '');
      setNcSkills(ncRecentData.inputData.skills || '');
      setNcPassions(ncRecentData.inputData.passions || '');
      setNcExperience(ncRecentData.inputData.experience || '');
      setNcGoals(ncRecentData.inputData.goals || '');
    }
    setNcRestoreBanner(false);
    setNcTab('ai_finder');
    setNcExpandedId(0);
  };

  const handleNicheFinder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hasContent = [ncBackground, ncSkills, ncPassions, ncExperience, ncGoals]
      .some(f => f.trim().length >= 10);
    if (!hasContent) {
      setNcError('Fill in at least one field with 10+ characters to continue.');
      return;
    }

    const getFunctionErrorMessage = async (fnError: any): Promise<string> => {
      const context = fnError?.context;
      if (!context) return fnError?.message || '';

      try {
        const payload = await context.clone().json();
        return payload?.error || payload?.message || fnError?.message || '';
      } catch {
        try {
          const text = await context.text();
          return text || fnError?.message || '';
        } catch {
          return fnError?.message || '';
        }
      }
    };

    setNcLoading(true); setNcError(''); setNcResults([]);

    try {
      const { invokeWithRetry } = await import('@/utils/retryFetch');
      const { data, error: fnError } = await invokeWithRetry('find-my-niche', {
        body: {
          background: ncBackground,
          skills: ncSkills,
          passions: ncPassions,
          experience: ncExperience,
          goals: ncGoals,
          country: 'India',
        },
      });

      if (fnError) {
        const functionMessage = await getFunctionErrorMessage(fnError);
        throw new Error(functionMessage || 'Niche generation failed. Please try again.');
      }
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.niches) || data.niches.length === 0) {
        throw new Error('No niche suggestions were returned. Please try again.');
      }

      setNcResults(data.niches);
      setNcExpandedId(0);

      const { autoSaveWork } = await import('@/utils/recentWork');
      autoSaveWork({
        userId: user.id,
        tool: 'niche_clarity',
        callType: 'ai_niche_finder',
        title: `AI Niche Research — ${(data.niches?.[0]?.nicheName || 'Your Niche').slice(0, 40)}`,
        subtitle: `${data.niches?.length || 0} personalised niche recommendations`,
        inputData: { background: ncBackground, skills: ncSkills, passions: ncPassions, experience: ncExperience, goals: ncGoals },
        outputData: { niches: data.niches },
      });

      const { deductCredits } = await import('@/utils/creditGate');
      const idemKey = crypto.randomUUID();
      await deductCredits(user.id, 'niche_clarity', 'ai_niche_finder', undefined, false, idemKey);

    } catch (err: any) {
      setNcError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setNcLoading(false);
    }
  };

  const NC_QUESTIONS = [
    { label: 'Your Background', placeholder: 'Work experience, education, life story — what have you been through?', value: ncBackground, setter: setNcBackground, icon: '📖', hint: "e.g. 10 years as an HR manager at a startup, single parent of two, recovered from burnout" },
    { label: 'Your Skills', placeholder: "What are you naturally good at? What do people ask your help for?", value: ncSkills, setter: setNcSkills, icon: '⚡', hint: "e.g. I'm great at simplifying complex topics, writing, financial planning" },
    { label: 'Your Passions', placeholder: 'What topics energise you? What could you talk about for hours?', value: ncPassions, setter: setNcPassions, icon: '🔥', hint: "e.g. I love talking about women's financial independence, mindful eating" },
    { label: 'Your Experience & Results', placeholder: "Specific achievements, transformations you've been through", value: ncExperience, setter: setNcExperience, icon: '🏆', hint: 'e.g. Lost 20kg in 6 months, helped 50 colleagues get promoted' },
    { label: 'Your Goals', placeholder: 'What do you want from your niche — income, impact, freedom?', value: ncGoals, setter: setNcGoals, icon: '🎯', hint: 'e.g. I want Rs.1 lakh/month working 4 hours a day' },
  ];

  const filledCount = [ncBackground, ncSkills, ncPassions, ncExperience, ncGoals].filter(f => f.trim().length >= 10).length;
  const isReady = filledCount >= 1;

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>
            <span onClick={onBack} style={{ cursor: 'pointer', fontWeight: 500 }}>Dashboard</span>
            <span> / </span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Niche Clarity</span>
          </div>
          <h1 style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 }}>Niche Clarity</h1>
          <p style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 }}>Find your perfect coaching or product niche from 594+ research-backed options.</p>
        </div>
        <span style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 50, padding: '5px 14px', fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>✦ 594 Niches</span>
      </div>


      {/* Tab switcher — compact pill style */}
      <div style={{
        display:'flex',
        background:'rgba(255,255,255,0.85)',
        backdropFilter:'blur(12px)',
        borderRadius:'50px',
        padding:'5px',
        border:'1px solid rgba(255,255,255,0.95)',
        boxShadow:'0 2px 16px rgba(0,0,0,0.07)',
        width:'fit-content',
        margin:'0 auto 24px',
      }}>
        {([
          { id:'ai_finder' as const, icon:'🤖', label:'AI Niche Finder' },
          { id:'browse' as const, icon:'📚', label:'Browse 594 Niches' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setNcTab(tab.id)} style={{
            display:'flex', alignItems:'center', gap:'7px',
            padding:'9px 20px', borderRadius:'50px', border:'none', cursor:'pointer',
            fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'14px',
            whiteSpace:'nowrap' as const, transition:'all 0.18s',
            background: ncTab===tab.id ? 'linear-gradient(135deg,#0284c7,#0891b2)' : 'transparent',
            color: ncTab===tab.id ? 'white' : '#64748b',
            boxShadow: ncTab===tab.id ? '0 2px 12px rgba(2,132,199,0.3)' : 'none',
          }}>
            <span style={{ fontSize:'16px', lineHeight:1 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: AI NICHE FINDER */}
      {ncTab === 'ai_finder' && (
        <div style={{ maxWidth:'680px', margin:'0 auto' }}>

          {/* Restore banner — inside ai_finder tab */}
          {ncRestoreBanner && ncRecentData && (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              gap:'12px', flexWrap:'wrap' as const,
              background:'rgba(2,132,199,0.06)', border:'1px solid rgba(2,132,199,0.2)',
              borderRadius:'14px', padding:'12px 18px', marginBottom:'20px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(2,132,199,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>🕐</div>
                <div>
                  <p style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'13px', color:'#0f172a', margin:0 }}>Continue your niche research?</p>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#64748b', margin:0 }}>{ncRecentData.title}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                <button onClick={() => setNcRestoreBanner(false)} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'transparent', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'12px', color:'#64748b' }}>Dismiss</button>
                <button onClick={handleNcRestore} style={{ padding:'7px 16px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#0284c7,#0891b2)', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px', color:'white', display:'flex', alignItems:'center', gap:'5px' }}>↩ Restore</button>
              </div>
            </div>
          )}

          {/* Results */}
          {ncResults.length > 0 && !ncLoading && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' as const, gap:'10px' }}>
                <div>
                  <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'18px', color:'#0f172a', margin:'0 0 4px' }}>Your 5 Perfect Niches</h3>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', margin:0 }}>Ranked by how well they match your background</p>
                </div>
                <button onClick={() => { setNcResults([]); setNcExpandedId(null); }} style={{ background:'rgba(2,132,199,0.08)', border:'1px solid rgba(2,132,199,0.2)', color:'#0284c7', padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px' }}>↩ New Search</button>
              </div>

              {ncResults.map((niche: any, i: number) => {
                const isExpanded = ncExpandedId === i;
                const demandColor = niche.marketDemand === 'High' ? '#059669' : niche.marketDemand === 'Growing' ? '#0284c7' : '#b45309';
                const compColor = niche.competition === 'Low' ? '#059669' : niche.competition === 'Medium' ? '#b45309' : '#dc2626';

                return (
                  <div key={i} style={{
                    background:'rgba(255,255,255,0.88)', backdropFilter:'blur(20px)',
                    borderRadius:'18px', marginBottom:'12px',
                    border: isExpanded ? '1.5px solid rgba(2,132,199,0.3)' : '1px solid rgba(255,255,255,0.95)',
                    boxShadow: isExpanded ? '0 6px 24px rgba(2,132,199,0.1)' : '0 4px 16px rgba(0,0,0,0.05)',
                    overflow:'hidden', transition:'all 0.2s',
                  }}>
                    <div onClick={() => setNcExpandedId(isExpanded ? null : i)} style={{ display:'flex', alignItems:'flex-start', gap:'14px', padding:'18px', cursor:'pointer' }}>
                      <div style={{
                        width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                        background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#ea580c)' : 'linear-gradient(135deg,#0284c7,#0891b2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'15px', color:'white',
                      }}>{i + 1}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'4px', flexWrap:'wrap' as const }}>
                          <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'15px', color:'#0f172a', margin:0, flex:1 }}>{niche.nicheName}</h3>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                            <span style={{ fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'10px', color:'#059669', background:'rgba(5,150,105,0.1)', borderRadius:'50px', padding:'2px 10px' }}>{niche.fitScore || 7}/10 Fit</span>
                            <span style={{ fontSize:'14px' }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#64748b', margin:'0 0 8px', fontStyle:'italic' }}>"{niche.tagline}"</p>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' as const }}>
                          <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'10px', fontWeight:700, color:'#7c3aed', background:'rgba(124,58,237,0.08)', borderRadius:'50px', padding:'2px 10px' }}>{niche.nicheCategory}</span>
                          <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'10px', fontWeight:700, color:demandColor, background:`${demandColor}18`, borderRadius:'50px', padding:'2px 10px' }}>{niche.marketDemand} Demand</span>
                          <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'10px', fontWeight:700, color:compColor, background:`${compColor}18`, borderRadius:'50px', padding:'2px 10px' }}>{niche.competition} Competition</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding:'0 18px 18px', borderTop:'1px solid #f8fafc' }}>
                        <div style={{ background:'rgba(2,132,199,0.06)', border:'1px solid rgba(2,132,199,0.15)', borderRadius:'12px', padding:'14px', margin:'14px 0' }}>
                          <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'11px', color:'#0284c7', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 6px' }}>Why This Fits YOU</p>
                          <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#374151', lineHeight:1.7, margin:0 }}>{niche.whyYouFit}</p>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                          {[
                            { label:'Target Buyer', value: niche.targetBuyer, icon:'👤' },
                            { label:'Core Problem', value: niche.coreProblem, icon:'😤' },
                            { label:'Earning Potential', value: niche.earningPotential, icon:'💰' },
                            { label:'First Product to Build', value: niche.productIdea, icon:'🎁' },
                          ].map(item => (
                            <div key={item.label} style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px' }}>
                              <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'10px', color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 4px', display:'flex', alignItems:'center', gap:'4px' }}>
                                <span>{item.icon}</span> {item.label}
                              </p>
                              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12.5px', color:'#374151', margin:0, lineHeight:1.5 }}>{item.value || '—'}</p>
                            </div>
                          ))}
                        </div>
                        {niche.firstStep && (
                          <div style={{ background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.15)', borderRadius:'10px', padding:'12px', marginBottom:'14px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                            <span style={{ fontSize:'16px', flexShrink:0 }}>✅</span>
                            <div>
                              <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'11px', color:'#059669', textTransform:'uppercase' as const, letterSpacing:'0.08em', margin:'0 0 3px' }}>Your Next 7-Day Action</p>
                              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#374151', margin:0, lineHeight:1.6 }}>{niche.firstStep}</p>
                            </div>
                          </div>
                        )}
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' as const }}>
                          <button onClick={() => { if (onNavigate) { sessionStorage.setItem('prefillNiche', niche.nicheName); if (ncBackground || ncSkills || ncPassions || ncExperience || ncGoals) { sessionStorage.setItem('creatorContext', JSON.stringify({ background: ncBackground || '', skills: ncSkills || '', passions: ncPassions || '', experience: ncExperience || '', goals: ncGoals || '' })); } onNavigate('product'); } }}
                            style={{ flex:2, padding:'11px 16px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                            🧭 Research Products in This Niche →
                          </button>
                          <button onClick={() => { setNcTab('browse'); setTimeout(() => { const si = document.querySelector('[data-niche-search]') as HTMLInputElement; if (si) { si.value = niche.nicheName.split(' ').slice(0,2).join(' '); si.dispatchEvent(new Event('input', { bubbles: true })); } }, 100); }}
                            style={{ flex:1, padding:'11px 14px', borderRadius:'12px', border:'1.5px solid rgba(2,132,199,0.3)', background:'rgba(2,132,199,0.06)', color:'#0284c7', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px' }}>
                            📚 Explore Niche
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Form — unified single card */}
          {ncResults.length === 0 && !ncLoading && (
            <>
              <div style={{ textAlign:'center' as const, marginBottom:'28px', animation:'fadeUp 0.4s ease' }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(2,132,199,0.08)', border:'1px solid rgba(2,132,199,0.2)', borderRadius:'50px', padding:'5px 16px', marginBottom:'14px' }}>
                  <span style={{ fontSize:'12px' }}>✦</span>
                  <span style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'10px', color:'#0284c7', textTransform:'uppercase' as const, letterSpacing:'0.1em' }}>AI-Powered Niche Discovery</span>
                </div>
                <h2 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'clamp(22px,4vw,30px)', color:'#0f172a', letterSpacing:'-0.03em', margin:'0 0 10px', lineHeight:1.2 }}>Not sure which niche is right for you?</h2>
                <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#64748b', lineHeight:1.7, maxWidth:'460px', margin:'0 auto' }}>Tell us about yourself and we'll recommend 5 perfect niches that only YOU could dominate</p>
              </div>

              <div style={{ background:'rgba(255,255,255,0.9)', backdropFilter:'blur(20px)', borderRadius:'24px', padding:'32px', border:'1px solid rgba(255,255,255,0.95)', boxShadow:'0 8px 32px rgba(0,0,0,0.07)', animation:'fadeUp 0.4s ease 0.08s both' }}>

                {/* Field 1: Background */}
                {(() => {
                  const chipAppend = (setter: (fn: (prev: string) => string) => void, text: string) => {
                    setter((prev: string) => prev ? `${prev}, ${text}` : text);
                  };
                  const chipStyle = { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'50px', padding:'4px 12px', fontFamily:'DM Sans,sans-serif', fontSize:'12px', fontWeight:600, color:'#64748b', cursor:'pointer', transition:'all 0.15s' };
                  const chipHoverIn = (e: React.MouseEvent) => { const t = e.currentTarget as HTMLElement; t.style.background='rgba(2,132,199,0.06)'; t.style.borderColor='rgba(2,132,199,0.3)'; t.style.color='#0284c7'; };
                  const chipHoverOut = (e: React.MouseEvent) => { const t = e.currentTarget as HTMLElement; t.style.background='#f8fafc'; t.style.borderColor='#e2e8f0'; t.style.color='#64748b'; };
                  const fieldFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor='#0284c7'; e.target.style.background='white'; e.target.style.boxShadow='0 0 0 3px rgba(2,132,199,0.08)'; };
                  const fieldBlur = (val: string) => (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = val.length > 0 ? 'rgba(2,132,199,0.4)' : '#e2e8f0'; e.target.style.boxShadow='none'; };
                  const fieldStyle = (val: string) => ({ width:'100%', padding:'13px 16px', borderRadius:'12px', border: val.length > 0 ? '1.5px solid rgba(2,132,199,0.4)' : '1.5px solid #e2e8f0', fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#0f172a', background: val.length >= 10 ? 'white' : '#f8fafc', outline:'none', resize:'vertical' as const, lineHeight:1.6, boxSizing:'border-box' as const, transition:'border-color 0.15s, background 0.15s, box-shadow 0.15s' });
                  const validNote = (val: string) => val.length > 0 ? (
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'10px', color: val.length >= 10 ? '#059669' : '#94a3b8', marginTop:'4px', textAlign:'right' as const }}>{val.length >= 10 ? '✓ Great detail' : `${10 - val.length} more characters needed`}</p>
                  ) : null;

                  const FIELDS = [
                    { num:'01', label:'Your Background', opt:'(optional)', hint:'e.g. 10 years as an HR manager, single parent, recovered from burnout', placeholder:'Work experience, education, life story — what have you been through?', value:ncBackground, setter:setNcBackground, chips:['👩‍💼 Corporate professional','👨‍🏫 Teacher / Trainer','🏥 Healthcare worker','🎨 Creative / Designer','💻 Tech professional','🏠 Stay-at-home parent'] },
                    { num:'02', label:'Your Skills', opt:'(optional)', hint:'e.g. simplifying complex topics, writing, financial planning', placeholder:'What are you naturally good at? What do people ask your help for?', value:ncSkills, setter:setNcSkills, chips:['✍️ Writing & Content','🎤 Public Speaking','💰 Finance & Budgeting','📊 Data & Analytics','🎓 Teaching & Training','🤝 Coaching & Mentoring'] },
                    { num:'03', label:'Your Passions', opt:'(optional)', hint:'What topics energise you? What could you talk about for hours?', placeholder:'Topics, hobbies, causes, or areas you genuinely love...', value:ncPassions, setter:setNcPassions, chips:['🧘 Health & Wellness','💸 Personal Finance','🌱 Sustainability','📚 Learning & Books','🎯 Entrepreneurship','🤝 Helping Others','🎨 Art & Creativity','🏃 Fitness & Sports'] },
                    { num:'04', label:'Experience & Results', opt:'(optional)', hint:'Achievements, transformations, or clients you\'ve helped', placeholder:'e.g. Lost 20kg in 6 months, helped 50 colleagues get promoted, grew my Instagram to 10k...', value:ncExperience, setter:setNcExperience, chips:['📈 Grew a business','🎓 Certified professional','🏆 Award or recognition','👥 Managed a team','🔄 Career transition','💪 Personal transformation'] },
                    { num:'05', label:'Your Goals', opt:'(optional)', hint:'Income, impact, freedom — what do you want from this?', placeholder:'e.g. I want Rs.1 lakh/month working 4 hours a day, helping women build financial confidence...', value:ncGoals, setter:setNcGoals, chips:['💰 Rs.1L/month income','⏰ Work 4 hrs/day','🌍 Build global audience','🇮🇳 Serve Indian market','📣 Establish authority','🕊️ Time & location freedom'] },
                  ];

                  return FIELDS.map((f, idx) => (
                    <div key={f.num}>
                      {idx > 0 && <div style={{ height:'1px', background:'#f1f5f9', margin:'22px 0' }} />}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px', flexWrap:'wrap' as const, gap:'4px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'11px', color:'#0284c7' }}>{f.num}</span>
                          <span style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'15px', color:'#0f172a' }}>{f.label}</span>
                          <span style={{ fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:'12px', color:'#94a3b8' }}>{f.opt}</span>
                        </div>
                        <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11.5px', color:'#94a3b8' }}>{f.hint}</span>
                      </div>
                      <textarea value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} rows={2} style={fieldStyle(f.value)} onFocus={fieldFocus} onBlur={fieldBlur(f.value)} />
                      <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'6px', marginTop:'8px' }}>
                        {f.chips.map(chip => (
                          <button key={chip} onClick={() => chipAppend(f.setter, chip.split(' ').slice(1).join(' '))} style={chipStyle} onMouseEnter={chipHoverIn} onMouseLeave={chipHoverOut}>{chip}</button>
                        ))}
                      </div>
                      {validNote(f.value)}
                    </div>
                  ));
                })()}

                {/* Generate button with separator */}
                {(() => {
                  const fc = [ncBackground, ncSkills, ncPassions, ncExperience, ncGoals].filter(f => f.trim().length >= 10).length;
                  const ready = fc >= 1;
                  return (
                    <div style={{ marginTop:'28px', paddingTop:'24px', borderTop:'1px solid #f1f5f9' }}>
                      {ncError && (
                        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'12px', padding:'12px 16px', marginBottom:'14px', fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#dc2626', fontWeight:600 }}>❌ {ncError}</div>
                      )}
                      <button onClick={handleNicheFinder} disabled={!ready} style={{
                        width:'100%', padding:'15px', borderRadius:'14px', border:'none',
                        background: ready ? 'linear-gradient(135deg,#0284c7,#0891b2)' : 'rgba(2,132,199,0.25)',
                        color:'white', cursor: ready ? 'pointer' : 'not-allowed',
                        fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'16px',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                        boxShadow: ready ? '0 4px 20px rgba(2,132,199,0.35)' : 'none', transition:'all 0.2s',
                      }}>✦ Discover My Perfect Niches</button>
                      <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', textAlign:'center' as const, marginTop:'10px' }}>
                        {fc === 0 ? 'Fill in at least one field with 10+ characters to continue' : `${fc} field${fc !== 1 ? 's' : ''} filled · Uses 10 credits · ~15 seconds`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {/* Loading */}
          {ncLoading && (
            <div style={{ textAlign:'center' as const, padding:'60px 24px', animation:'fadeUp 0.3s ease' }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'18px', background:'linear-gradient(135deg,#0284c7,#0891b2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'28px', boxShadow:'0 8px 24px rgba(2,132,199,0.3)' }}>🎯</div>
              <h3 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'20px', color:'#0f172a', margin:'0 0 8px' }}>Analysing your background...</h3>
              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#64748b', margin:'0 0 28px' }}>Finding niches that fit your unique story and strengths</p>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:'10px', maxWidth:'360px', margin:'0 auto', textAlign:'left' as const }}>
                {['Reading your background and experiences','Matching your skills to market demand in India','Identifying your unique positioning angle','Scoring niches by personal fit','Building your personalised recommendations'].map(step => (
                  <div key={step} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid #0284c7', borderTopColor:'transparent', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                    <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BROWSE 594 NICHES */}
      {ncTab === 'browse' && (
        <div>
          <FilterBar search={search} onSearch={setSearch} accentColor="#7c3aed"
            filters={[
              { label: 'Growth', options: ['All', 'High', 'Medium', 'Low'], value: growth, onChange: setGrowth },
              { label: 'Competition', options: ['All', 'High', 'Medium', 'Low'], value: comp, onChange: setComp },
            ]}
          />
          <CategoryAccordion
            categories={nicheCategories}
            getItems={cat => cat.niches}
            searchTerm={search}
            growthFilter={growth}
            compFilter={comp}
            renderItem={(item, cat) => (
              <NicheCard key={item} name={item} accent={cat.accent} onClick={() => setModal({ niche: item, cat })} />
            )}
          />
          {modal && <NicheModal niche={modal.niche} category={modal.cat} onClose={() => setModal(null)} />}
        </div>
      )}
    </div>
  );
}

/* ───────── Product Page ───────── */
function ProductPage({ onBack, onAction, onBuildOffer }: { onBack: () => void; onAction?: () => void; onBuildOffer?: (data: any) => void }) {
  const navigate = useNavigate();
  const [researchMode, setResearchMode] = useState<'ai' | 'browse' | 'expertise'>('ai');
  const [search, setSearch] = useState('');
  const [speed, setSpeed] = useState('All');
  const [price, setPrice] = useState('All');
  const [modal, setModal] = useState<{ product: string; cat: ProductCategory } | null>(null);

  /* ── Expertise tab state ── */
  const [expertiseFile, setExpertiseFile] = useState<File | null>(null);
  const [expertiseDragOver, setExpertiseDragOver] = useState(false);
  const [expertiseLoading, setExpertiseLoading] = useState(false);
  const [expertiseStage, setExpertiseStage] = useState('');
  const [expertiseProfile, setExpertiseProfile] = useState<any>(null);
  const [expertiseIdeas, setExpertiseIdeas] = useState<any[]>([]);
  const [expertiseError, setExpertiseError] = useState('');
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [selectedSavedDoc, setSelectedSavedDoc] = useState<any>(null);
  const [showSavedDocs, setShowSavedDocs] = useState(false);

  useEffect(() => {
    const loadSavedDocs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_knowledge_docs')
        .select('id, filename, expertise_tags, detected_niche, summary, extracted_text, use_count, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      setSavedDocs(data || []);
    };
    loadSavedDocs();
  }, []);

  const handleExpertiseGenerate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setExpertiseLoading(true);
    setExpertiseError('');
    setExpertiseProfile(null);
    setExpertiseIdeas([]);

    try {
      let payload: any = { userId: user.id, userEmail: user.email, country: 'India' };

      if (selectedSavedDoc) {
        setExpertiseStage('Loading your knowledge base...');
        payload.docId = selectedSavedDoc.id;
        payload.extractedText = selectedSavedDoc.extracted_text || '';
        if (!payload.extractedText) {
          const { data: fullDoc } = await supabase
            .from('user_knowledge_docs')
            .select('extracted_text')
            .eq('id', selectedSavedDoc.id)
            .single();
          payload.extractedText = fullDoc?.extracted_text || '';
        }
      } else if (expertiseFile) {
        const fileType = getFileType(expertiseFile.name);
        if (!fileType) { setExpertiseError('Unsupported file type.'); setExpertiseLoading(false); return; }
        setExpertiseStage('Reading your document...');
        if (fileType === 'pdf') {
          payload.fileBase64 = await fileToBase64(expertiseFile);
          payload.fileType = 'pdf';
        } else if (fileType === 'docx') {
          setExpertiseStage('Extracting text from document...');
          const text = await extractTextFromDocx(expertiseFile);
          payload.fileBase64 = btoa(unescape(encodeURIComponent(text)));
          payload.fileType = 'txt';
          payload.extractedText = text;
        } else {
          const text = await extractTextFromTxt(expertiseFile);
          payload.fileBase64 = btoa(unescape(encodeURIComponent(text)));
          payload.fileType = 'txt';
          payload.extractedText = text;
        }
        payload.filename = expertiseFile.name;
      } else {
        setExpertiseError('Please upload a document or select one from your Knowledge Base.');
        setExpertiseLoading(false);
        return;
      }

      const stages = [
        'Analysing your expertise...',
        'Identifying your unique knowledge signals...',
        'Finding product opportunities only you can create...',
        'Generating personalised ideas...',
      ];
      let stageIdx = 0;
      const stageInterval = setInterval(() => { stageIdx = (stageIdx + 1) % stages.length; setExpertiseStage(stages[stageIdx]); }, 4000);

      const { data, error: fnError } = await supabase.functions.invoke('analyze-document-expertise', { body: payload });
      clearInterval(stageInterval);
      if (fnError || data?.error) throw new Error(data?.error || fnError?.message || 'Analysis failed');

      setExpertiseProfile(data.expertiseProfile);
      setExpertiseIdeas(data.ideas || []);

      autoSaveWork({
        userId: user.id, tool: 'product_navigator', callType: 'analyze_expertise',
        title: `Expertise Analysis — ${data.expertiseProfile?.detectedNiche || 'Your Knowledge'}`,
        subtitle: `${data.ideas?.length || 0} personalised product ideas`,
        inputData: { filename: expertiseFile?.name || selectedSavedDoc?.filename, docId: selectedSavedDoc?.id },
        outputData: { expertiseProfile: data.expertiseProfile, ideas: data.ideas },
      });

      const idemKey = crypto.randomUUID();
      await supabase.functions.invoke('deduct-credits', {
        body: { userId: user.id, toolModule: 'product_navigator', callType: 'analyze_expertise', idempotencyKey: idemKey },
      });
    } catch (err: any) {
      setExpertiseError(err.message || 'Something went wrong. Please try again.');
    }
    setExpertiseStage('');
    setExpertiseLoading(false);
  };

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>
            <span onClick={onBack} style={{ cursor: 'pointer', fontWeight: 500 }}>Dashboard</span>
            <span> / </span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Product Navigator</span>
          </div>
          <h1 style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 }}>Product Navigator</h1>
          <p style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 }}>500+ digital product ideas with launch speed, price points & full ascension paths.</p>
        </div>
        <span style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.18)', borderRadius: 50, padding: '5px 14px', fontSize: 10, fontWeight: 700, color: '#ea580c', letterSpacing: '0.06em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>⚡ 500+ Products</span>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderRadius: 50, padding: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.9)' }}>
          {[
            { key: 'ai' as const, label: '🤖 AI Research' },
            { key: 'browse' as const, label: '📦 Browse 500+ Ideas' },
            { key: 'expertise' as const, label: '🧠 From My Expertise' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setResearchMode(tab.key)}
              style={{
                fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, borderRadius: 50, padding: '8px 22px',
                border: 'none', cursor: 'pointer', transition: 'all 0.22s',
                background: researchMode === tab.key ? 'linear-gradient(135deg,#ea580c,#f59e0b)' : 'transparent',
                color: researchMode === tab.key ? 'white' : '#64748b',
                boxShadow: researchMode === tab.key ? '0 4px 14px rgba(234,88,12,0.4)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {researchMode === 'ai' && (
        <AIResearchEngine onBuildOffer={onBuildOffer} />
      )}

      {researchMode === 'browse' && (
        <>
          <FilterBar search={search} onSearch={setSearch} accentColor="#ea580c"
            filters={[
              { label: 'Speed', options: ['All', 'High', 'Medium', 'Low'], value: speed, onChange: setSpeed },
              { label: 'Price', options: ['All', 'High', 'Medium', 'Low'], value: price, onChange: setPrice },
            ]}
          />

          <CategoryAccordion
            categories={productCategories}
            getItems={cat => cat.products.filter(p => {
              if (speed !== 'All') {
                const r = seedRng(p + 'speed');
                const s = r > 0.6 ? 'High' : r > 0.3 ? 'Medium' : 'Low';
                if (s !== speed) return false;
              }
              if (price !== 'All') {
                const r = seedRng(p + 'price');
                const pr = r > 0.6 ? 'High' : r > 0.3 ? 'Medium' : 'Low';
                if (pr !== price) return false;
              }
              return true;
            })}
            searchTerm={search}
            growthFilter=""
            compFilter=""
            renderItem={(item, cat) => (
              <ProductCardItem key={item} name={item} accent={cat.accent} onClick={() => setModal({ product: item, cat })} />
            )}
          />

          {modal && <ProductModal product={modal.product} category={modal.cat} onClose={() => setModal(null)} />}
        </>
      )}

      {researchMode === 'expertise' && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Build from Your Own Knowledge
            </h2>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              Upload your notes, resume, or any document that captures what you know.
              The AI reads what makes you different and generates product ideas only you could build.
            </p>
          </div>

          {/* Results */}
          {expertiseProfile && !expertiseLoading && (
            <>
              {/* Expertise Profile Card */}
              <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 4px 20px rgba(124,58,237,0.08)', padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Your Expertise Profile</div>
                    <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 6 }}>{expertiseProfile.detectedNiche || 'Your Knowledge Area'}</div>
                    <p style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', lineHeight: 1.65, margin: 0 }}>{expertiseProfile.summary}</p>
                  </div>
                  <button onClick={() => { setExpertiseProfile(null); setExpertiseIdeas([]); setExpertiseFile(null); setSelectedSavedDoc(null); }}
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#7c3aed', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    ↩ New Analysis
                  </button>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 }}>
                  {(expertiseProfile.tags || []).map((tag: string) => (
                    <span key={tag} style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: '#7c3aed', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans' }}>{tag}</span>
                  ))}
                </div>

                {/* Strengths */}
                {expertiseProfile.strengths?.length > 0 && (
                  <div style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Your Strengths</div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {expertiseProfile.strengths.map((s: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>✓</span>
                          <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ideas header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
                  {expertiseIdeas.length} Product Ideas From Your Expertise
                </div>
                <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Built specifically for you</span>
              </div>

              {/* Idea cards */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {expertiseIdeas.map((idea: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', padding: 20, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{idea.productName}</div>
                        <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{idea.tagline}</div>
                        {idea.whyUnique && <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>{idea.whyUnique}</div>}
                      </div>
                      {idea.impulseTag && (
                        <span style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.18)', borderRadius: 50, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#ea580c', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{idea.impulseTag}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 10 }}>
                      {idea.targetAudience && <span style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans' }}>🎯 {idea.targetAudience}</span>}
                      {idea.priceRange && <span style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans' }}>💰 {idea.priceRange}</span>}
                      {idea.buildTime && <span style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans' }}>⏱ {idea.buildTime}</span>}
                      {idea.competitionLevel && <span style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans' }}>📊 {idea.competitionLevel} competition</span>}
                      {idea.productCategory && <span style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans' }}>📦 {idea.productCategory}</span>}
                    </div>

                    {idea.primaryPain && <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', marginBottom: 6 }}>🔥 <strong>Pain:</strong> {idea.primaryPain}</div>}

                    {/* whyThisPersonCanBuildIt strip */}
                    {idea.whyThisPersonCanBuildIt && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>🎯</span>
                        <span style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#059669', lineHeight: 1.55, fontWeight: 600 }}>
                          {idea.whyThisPersonCanBuildIt}
                        </span>
                      </div>
                    )}

                    {/* Build This Product CTA → Product Creator */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                      <button
                        onClick={() => {
                          sessionStorage.setItem('pc_prefill', JSON.stringify({
                            product_name: idea.productName || '',
                            country: '',
                            niche: expertiseProfile?.detectedNiche || expertiseProfile?.niche || '',
                            source: 'product_navigator',
                          }));
                          navigate('/product-creator');
                        }}
                        style={{ background: 'linear-gradient(135deg,#0ea5e9,#0d9488)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: 'Sora', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}
                      >
                        🛠 Build This Product →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Upload / Select — shown when no results */}
          {!expertiseProfile && !expertiseLoading && (
            <>
              {/* Upload zone */}
              <div
                onDragOver={e => { e.preventDefault(); setExpertiseDragOver(true); }}
                onDragLeave={() => setExpertiseDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setExpertiseDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (!file) return;
                  const validation = validateFile(file);
                  if (!validation.valid) { setExpertiseError(validation.error || ''); return; }
                  setExpertiseFile(file); setExpertiseError(''); setSelectedSavedDoc(null);
                }}
                style={{
                  border: `2px dashed ${expertiseDragOver ? '#7c3aed' : expertiseFile ? '#059669' : '#e2e8f0'}`,
                  borderRadius: 20, padding: '40px 24px', textAlign: 'center' as const,
                  cursor: 'pointer',
                  background: expertiseDragOver ? 'rgba(124,58,237,0.04)' : expertiseFile ? 'rgba(5,150,105,0.04)' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s', marginBottom: 16,
                }}
                onClick={() => document.getElementById('expertise-file-input')?.click()}
              >
                <input id="expertise-file-input" type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const validation = validateFile(file);
                    if (!validation.valid) { setExpertiseError(validation.error || ''); return; }
                    setExpertiseFile(file); setExpertiseError(''); setSelectedSavedDoc(null);
                    e.target.value = '';
                  }}
                />

                {expertiseFile ? (
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{expertiseFile.name.endsWith('.pdf') ? '📄' : expertiseFile.name.endsWith('.docx') ? '📝' : '📃'}</div>
                    <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{expertiseFile.name}</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{(expertiseFile.size / 1024).toFixed(0)} KB · Ready to analyse</div>
                    <button onClick={(e) => { e.stopPropagation(); setExpertiseFile(null); }}
                      style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 8 }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📤</div>
                    <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>Drop your document here</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 6 }}>Resume, course notes, training material, research — anything that shows what you know</div>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>PDF, DOCX, or TXT · Max 5MB</span>
                  </div>
                )}
              </div>

              {/* Saved docs */}
              {savedDocs.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <button onClick={() => setShowSavedDocs(!showSavedDocs)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    📚 Use a saved document from my Knowledge Base ({savedDocs.length})
                    <span>{showSavedDocs ? '▲' : '▼'}</span>
                  </button>

                  {showSavedDocs && (
                    <div style={{ border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                      {savedDocs.map((doc: any, i: number) => (
                        <div key={doc.id} onClick={() => { setSelectedSavedDoc(doc); setExpertiseFile(null); setExpertiseError(''); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                            borderBottom: i < savedDocs.length - 1 ? '1px solid #f8fafc' : 'none',
                            cursor: 'pointer',
                            background: selectedSavedDoc?.id === doc.id ? 'rgba(124,58,237,0.06)' : 'white',
                            transition: 'background 0.1s',
                          }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📄</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.filename}</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 2 }}>
                              {(doc.expertise_tags || []).slice(0, 3).map((tag: string) => (
                                <span key={tag} style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: 4 }}>{tag}</span>
                              ))}
                            </div>
                          </div>
                          {selectedSavedDoc?.id === doc.id && (
                            <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 16 }}>✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {expertiseError && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontFamily: 'DM Sans', fontSize: 13, color: '#dc2626' }}>
                  ❌ {expertiseError}
                </div>
              )}

              {/* Generate button */}
              <button onClick={handleExpertiseGenerate} disabled={!expertiseFile && !selectedSavedDoc}
                style={{
                  width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none', cursor: (!expertiseFile && !selectedSavedDoc) ? 'not-allowed' : 'pointer',
                  fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white',
                  background: (!expertiseFile && !selectedSavedDoc) ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  boxShadow: (!expertiseFile && !selectedSavedDoc) ? 'none' : '0 8px 24px rgba(124,58,237,0.3)',
                  transition: 'all 0.2s', marginBottom: 8,
                }}>
                🧠 Analyse My Expertise & Generate Ideas
              </button>
              <p style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', textAlign: 'center' as const, margin: 0 }}>
                Uses 20 credits · Powered by Claude Sonnet · Takes ~15–20 seconds
              </p>
            </>
          )}

          {/* Loading state */}
          {expertiseLoading && (
            <div style={{ textAlign: 'center' as const, padding: '48px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 28px rgba(124,58,237,0.28)', animation: 'floatBounce 2s ease-in-out infinite' }}>
                <span style={{ fontSize: 28 }}>🧠</span>
              </div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 6 }}>Reading your expertise...</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginBottom: 24 }}>{expertiseStage || 'Analysing your document...'}</div>
              <div style={{ maxWidth: 360, margin: '0 auto' }}>
                {['Reading your document content', 'Identifying your unique knowledge signals', 'Finding product gaps only you can fill', 'Generating personalised ideas for you'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#7c3aed', animation: 'spinSlow 0.8s linear infinite', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#475569' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Usage Value Messages ───────── */
const USAGE_MESSAGES = [
  {
    emoji: '🤯', tag: 'RESEARCH VALUE',
    gradient: 'linear-gradient(135deg, #7c3aed, #c026d3)', accentColor: '#7c3aed',
    lightBg: 'rgba(124,58,237,0.06)',
    headline: (value: string) => `You just ran ${value} worth of research. In one session.`,
    body: "A market research agency would've charged you that — easily. We did it in minutes. That's the power here. Now slow down and actually USE what was generated. 🎯",
    cta: 'Reading it now 📖', secondaryCta: 'Okay okay, I\'m going deep',
    ctaTool: 'product' as PageId,
  },
  {
    emoji: '💰', tag: 'VALUE GENERATED',
    gradient: 'linear-gradient(135deg, #ea580c, #f59e0b)', accentColor: '#ea580c',
    lightBg: 'rgba(234,88,12,0.06)',
    headline: (value: string) => `${value} of professional research. Done. By you. Today.`,
    body: "That's what a consultant would invoice for this. You're getting it for basically free in beta. We love the hustle — just make sure you're building, not just generating. 🙏",
    cta: 'Building mode: ON 🏗️', secondaryCta: 'Just one more research...',
    ctaTool: 'product' as PageId,
  },
  {
    emoji: '🚀', tag: 'POWER USER',
    gradient: 'linear-gradient(135deg, #059669, #06b6d4)', accentColor: '#059669',
    lightBg: 'rgba(5,150,105,0.06)',
    headline: (value: string) => `Bro. ${value} of AI work in a single session?`,
    body: "You're not using a tool. You're wielding a research department. That's actually insane. Take 10 minutes, review what you've got, and pick your ONE product to go all in on. 💎",
    cta: 'Picking my ONE product', secondaryCta: 'I need more data first',
    ctaTool: 'product' as PageId,
  },
  {
    emoji: '🧠', tag: 'SESSION INSIGHT',
    gradient: 'linear-gradient(135deg, #7c3aed, #3b82f6)', accentColor: '#7c3aed',
    lightBg: 'rgba(124,58,237,0.06)',
    headline: (value: string) => `This session = ${value} of market research.`,
    body: "A startup would've spent weeks getting this data. You got it in one sitting. Genuinely impressive. Now the real work begins — executing on it. Ready? 👊",
    cta: "Let's execute 🔥", secondaryCta: 'Almost ready, few more clicks',
    ctaTool: 'offer' as PageId,
  },
  {
    emoji: '⚡', tag: 'BUILT DIFFERENT',
    gradient: 'linear-gradient(135deg, #0891b2, #7c3aed)', accentColor: '#0891b2',
    lightBg: 'rgba(8,145,178,0.06)',
    headline: (value: string) => `${value} worth of insights generated. You're built different.`,
    body: "No, seriously. Most people open this tool, generate 5 ideas, and close the tab. You're going deep. We respect it. Just make sure depth = action, not just more research. 😅",
    cta: "Action time. Let's go.", secondaryCta: 'Depth IS my action',
    ctaTool: 'offer' as PageId,
  },
  {
    emoji: '🎯', tag: 'TIME TO ACT',
    gradient: 'linear-gradient(135deg, #b45309, #ea580c)', accentColor: '#b45309',
    lightBg: 'rgba(180,83,9,0.06)',
    headline: (value: string) => `Your session value: ${value}. Your action so far: ?`,
    body: "We're rooting for you. The AI has done its job. Now it's your turn. Pick one product, build one offer, map one funnel. That's how ₹0 becomes ₹1. 💸",
    cta: 'Starting with one thing', secondaryCta: 'Need to research more first',
    ctaTool: 'product' as PageId,
  },
  {
    emoji: '🏆', tag: 'BETA POWER',
    gradient: 'linear-gradient(135deg, #6366f1, #ec4899)', accentColor: '#6366f1',
    lightBg: 'rgba(99,102,241,0.06)',
    headline: (value: string) => `You've unlocked ${value} worth of beta access today.`,
    body: "Most tools charge per report. You got all of this in beta. That's the deal — we give you the tools, you give us focused, strategic usage. Deal still on? 🤝",
    cta: 'Deal. Being strategic now.', secondaryCta: 'Deal. After one more idea.',
    ctaTool: 'product' as PageId,
  },
  {
    emoji: '😤', tag: 'GO BUILD',
    gradient: 'linear-gradient(135deg, #ec4899, #f97316)', accentColor: '#ec4899',
    lightBg: 'rgba(236,72,153,0.06)',
    headline: (value: string) => `${value} of AI work. The question is — what are you building?`,
    body: "We're not mad. We're actually hyped. But here's the truth: 100 ideas < 1 executed product. You have everything you need. Stop researching. Start building. GO. 🚀",
    cta: 'GOING. Right now. 🏃', secondaryCta: '5 more minutes, I promise',
    ctaTool: 'offer' as PageId,
  },
];

function getTimeOfDayBadge() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return '🌅 Good Morning';
  if (h >= 12 && h < 17) return '☀️ Good Afternoon';
  return '🌙 Good Evening';
}

function getJourneyDay(createdAt?: string | null) {
  if (!createdAt) return 1;
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  return Math.max(1, Math.min(90, diff + 1));
}

/* ───────── Usage Value Popup ───────── */
function UsageValuePopup({ message, onClose, onNavigate, displayValue }: {
  message: typeof USAGE_MESSAGES[0];
  onClose: () => void;
  onNavigate: (p: PageId) => void;
  displayValue: string;
}) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setFadingOut(true);
      setTimeout(onClose, 300);
    }, 15000);
    return () => clearTimeout(t);
  }, [onClose]);

  const dismiss = () => { setFadingOut(true); setTimeout(onClose, 300); };
  const handleCta = () => { dismiss(); setTimeout(() => onNavigate(message.ctaTool), 350); };

  return (
    <div onClick={dismiss} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(14px) saturate(150%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: fadingOut ? 'fadeOut 0.3s ease forwards' : 'fadeIn 0.3s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 480, width: '92%', borderRadius: 28, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
        animation: fadingOut ? 'popupFadeOut 0.3s ease forwards' : 'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Hero Band */}
        <div style={{ height: 180, position: 'relative', overflow: 'hidden', background: message.gradient }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', animation: 'float 6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'float 8s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', gap: 4 }}>
            {[0, 0.3, 0.6].map((d, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: `pulse 2s ease-in-out ${d}s infinite` }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '4px 14px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.1em' }}>
            {getTimeOfDayBadge()}
          </div>
          <button onClick={(e) => { e.stopPropagation(); dismiss(); }} type="button" style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'auto' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}>✕</button>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite' }}>{message.emoji}</span>
            <div style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '4px 14px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              {message.tag}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', padding: '28px 28px 24px' }}>
          <h2 style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 'clamp(18px, 4vw, 22px)', color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 12 }}>
            {message.headline(displayValue)}
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: 14.5, color: '#475569', lineHeight: 1.75, marginBottom: 20 }}>
            {message.body}
          </p>
          {/* Value meter */}
          <div style={{ background: message.lightBg, borderLeft: `3px solid ${message.accentColor}`, borderRadius: '0 10px 10px 0', padding: '12px 16px', marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Session research value</span>
              <span style={{ fontFamily: 'Sora', fontSize: 14, fontWeight: 800, color: '#ea580c' }}>{displayValue} generated</span>
            </div>
            <div style={{ background: '#e2e8f0', height: 6, borderRadius: 50, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: message.gradient, borderRadius: 50, animation: 'shrinkBar 15s linear reverse' }} />
            </div>
          </div>
          {/* Action row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleCta} style={{
              flex: 1, background: message.gradient, color: 'white', border: 'none', borderRadius: 14, padding: '13px 20px',
              fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              boxShadow: `0 4px 20px ${message.accentColor}40`, transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${message.accentColor}50`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${message.accentColor}40`; }}>
              {message.cta}
            </button>
            <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#94a3b8', fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
              {message.secondaryCta}
            </button>
          </div>
          {/* Bottom strip */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 20, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>🔥 Powered by Shikshantaram AI</span>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 50, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>4 tools ready to use →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Main Index ───────── */
const Index = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showUsagePopup, setShowUsagePopup] = useState(false);
  const [offerPrefill, setOfferPrefill] = useState<any>(null);
  const [funnelPrefill, setFunnelPrefill] = useState<any>(null);
  const [usageMsg, setUsageMsg] = useState<typeof USAGE_MESSAGES[0] | null>(null);
  const [sessionCostUsd, setSessionCostUsd] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [avatarColor, setAvatarColor] = useState('#7c3aed');
  const [showMotivationPopup, setShowMotivationPopup] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState<any>(null);
  const tracking = useTracking(user?.id);
  const sessionStarted = useRef(false);
  const usagePopupShown = useRef(false);

  const scrollToTop = useCallback(() => {
    const el = document.getElementById('main-content-area');
    if (el) el.scrollTop = 0;
  }, []);

  const tier = profile?.access_tier || 'basic';
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const journeyDay = getJourneyDay(profile?.created_at);

  // Load avatar color from profile
  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles').select('avatar_color').eq('id', user.id).single()
      .then(({ data }) => {
        if ((data as any)?.avatar_color) {
          const col = AVATAR_COLORS.find((c: any) => c.id === (data as any).avatar_color);
          setAvatarColor(col?.color || '#7c3aed');
        }
      });
  }, [user]);

  // Listen for live avatar color changes from profile page
  useEffect(() => {
    const handler = (e: any) => setAvatarColor(e.detail.color || '#7c3aed');
    window.addEventListener('avatarColorChanged', handler);
    return () => window.removeEventListener('avatarColorChanged', handler);
  }, []);

  // Listen for navigation to profile (e.g. "View all transactions" from TopUpModal)
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.tab) sessionStorage.setItem('profile_initial_tab', e.detail.tab);
      setActivePage('profile');
    };
    window.addEventListener('navigateToProfile', handler);
    return () => window.removeEventListener('navigateToProfile', handler);
  }, []);

  // Low-balance toast: triggers when credits drop below 20.
  useLowBalanceToast(user?.id, () => {
    sessionStorage.setItem('profile_initial_tab', 'credits');
    setActivePage('profile');
    window.dispatchEvent(new CustomEvent('navigateToProfile', { detail: { tab: 'credits' } }));
  });

  // Fetch saved items count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      setSavedCount(count || 0);
    };
    fetchCount();
  }, [user, activePage]);

  // Scroll to top on page navigation
  useEffect(() => { scrollToTop(); }, [activePage, scrollToTop]);

  // Clear prefill when navigating away from offer
  useEffect(() => {
    if (activePage !== 'offer') {
      setOfferPrefill(null);
    }
  }, [activePage]);

  // Clear funnel prefill when navigating away from funnel
  useEffect(() => {
    if (activePage !== 'funnel') {
      setFunnelPrefill(null);
    }
  }, [activePage]);

  // Usage value popup — triggers once per session after user spends ≥$0.005 in AI costs
  useEffect(() => {
    if (!user) return;
    if (usagePopupShown.current) return;
    if (sessionStorage.getItem('usagePopupShown')) { 
      usagePopupShown.current = true; 
      return; 
    }

    const sessionStart = sessionStorage.getItem('session_start') || new Date().toISOString();

    const checkCost = async () => {
      if (usagePopupShown.current) return;
      const { data } = await supabase
        .from('ai_usage_logs')
        .select('estimated_cost_usd')
        .eq('user_id', user.id)
        .gte('created_at', sessionStart);

      const totalCost = (data || []).reduce((sum: number, row: any) => sum + parseFloat(row.estimated_cost_usd || '0'), 0);
      setSessionCostUsd(totalCost);

      if (totalCost >= 0.25 && !usagePopupShown.current) {
        usagePopupShown.current = true;
        setUsageMsg(USAGE_MESSAGES[Math.floor(Math.random() * USAGE_MESSAGES.length)]);
        setShowUsagePopup(true);
        sessionStorage.setItem('usagePopupShown', 'true');
      }
    };

    const interval = setInterval(checkCost, 15000);
    const initialCheck = setTimeout(checkCost, 3000);
    return () => { clearInterval(interval); clearTimeout(initialCheck); };
  }, [user]);

  // Start session tracking
  useEffect(() => {
    if (user && !sessionStarted.current) {
      sessionStarted.current = true;
      tracking.startSession();
    }
  }, [user]);

  // Presence heartbeat — every 60s (auth-validated, silent failures, no error flood)
  useEffect(() => {
    if (!user) return;

    let isCancelled = false;
    let sessionStart = sessionStorage.getItem('session_start');
    if (!sessionStart) {
      sessionStart = new Date().toISOString();
      sessionStorage.setItem('session_start', sessionStart);
    }

    const updatePresence = async () => {
      try {
        if (isCancelled) return;

        const { error } = await supabase.functions.invoke('upsert-presence', {
          body: {
            current_page: activePage || 'dashboard',
            user_name: profile?.full_name || user.email?.split('@')[0],
            session_start: sessionStart,
          },
        });

        if (error) {
          console.warn('[Presence] Heartbeat failed silently:', error.message);
        }
      } catch (_) {
        // Complete silence — background presence should never break UX
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [user, profile?.full_name, activePage]);

  // Track page visits
  useEffect(() => {
    tracking.trackPageVisit(activePage);
  }, [activePage]);

  const showLockedToast = (toolName: string) => {
    if (tier === 'basic') {
      setToast({ toolName, type: 'premium' });
    } else {
      setToast({ toolName, type: 'locked' });
    }
  };

  const navigateTo = (page: PageId) => {
    // Product Creator lives on its own route
    if (page === 'creator' as any) {
      navigate('/product-creator');
      return;
    }
    // Trial-user gating: block locked tools
    if (isTrialUser && LOCKED_FOR_TRIAL.includes(page as LockedTool)) {
      setTrialLockTool(page as LockedTool);
      return;
    }
    tracking.closeToolTracking();
    setActivePage(page);
    trackPageView(page);
    if (page !== 'dashboard') {
      tracking.trackToolOpen(page);
    }
  };

  const handleToolAction = () => {
    tracking.trackToolAction();
  };

  // ── Trial state ──
  const isTrialUser = profile?.access_tier === 'trial';
  const trialEndsAt = profile?.trial_ends_at || null;
  const trialExpired = isTrialUser && trialEndsAt ? new Date(trialEndsAt).getTime() <= Date.now() : false;
  const LOCKED_FOR_TRIAL: LockedTool[] = ['offer', 'funnel', 'copy_suite', 'knowledge_base'];
  const [trialLockTool, setTrialLockTool] = useState<LockedTool | null>(null);
  const [showTrialUpgrade, setShowTrialUpgrade] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when page changes
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [activePage, isMobile]);

  // ── Motivation popup ──
  const MOTIVATION_MESSAGES = [
    { emoji:"🎯", tag:"YOUR NICHE IS WAITING", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"The niche you keep postponing? Someone just claimed it.", body:"Every day you spend 'thinking about it' is a day another creator builds an audience in your space, publishes the ebook you had in your head, and takes the income that was supposed to be yours. The window is open — but it won't stay open forever.", hardTruth:"\"You don't need more information. You need to make a decision and start.\"", cta:"🎯 Find My Niche Right Now →", ctaTool:"niche" },
    { emoji:"📦", tag:"BUILD IT TODAY", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"Your first digital product could be live by tonight.", body:"Not next month. Not after you 'figure everything out.' Tonight. A simple ₹499 ebook, a Notion template, a prompt pack — something real, something sellable, something that makes your phone buzz with a payment notification while you sleep.", hardTruth:"\"Done and imperfect beats perfect and unpublished — every single time.\"", cta:"📦 Find My First Product →", ctaTool:"product" },
    { emoji:"⚡", tag:"NO MORE WAITING", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"Waiting for the 'right time' is the most expensive mistake you'll make.", body:"The creators earning ₹50,000 a month from digital products didn't wait until they felt ready. They picked a niche, built something scrappy, put it online, and improved from there. The only difference between them and you right now is that they started.", hardTruth:"\"Every morning you wake up without a product for sale is a morning you worked for free.\"", cta:"⚡ Start Building Now →", ctaTool:"product" },
    { emoji:"🚀", tag:"72 HOURS. THAT'S ALL.", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"72 hours from now, you could have your first digital product live.", body:"That's the exact time it takes to go from zero to a published product. Find your niche today. Pick your product format tomorrow. Build it the day after. This platform was built for exactly this — your 72-hour launch is not a dream, it's a plan.", hardTruth:"\"In 72 hours, you'll either have a product live or another set of excuses. Choose wisely.\"", cta:"🚀 Start My 72-Hour Launch →", ctaTool:"niche" },
    { emoji:"💰", tag:"THE INCOME IS REAL", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"Someone bought a digital product in the last 3 seconds. It wasn't yours.", body:"The global digital product market doesn't pause while you think. Thousands of buyers are right now looking for exactly what you know — your niche knowledge, your system, your shortcut — packaged into something they can pay for instantly.", hardTruth:"\"You are one product launch away from changing your monthly income forever.\"", cta:"💰 Find My Profitable Niche →", ctaTool:"niche" },
    { emoji:"🧠", tag:"YOU ALREADY KNOW ENOUGH", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"You already know more than 10,000 people who would pay to learn from you.", body:"You don't need a degree. You don't need 10 years of experience. You just need to know more than a beginner on ONE specific topic — and turn that into a ₹299 guide, a template, a mini-course. That's it. That's the whole business model.", hardTruth:"\"Stop waiting to be an expert. Beginners with ₹50,000/month incomes started exactly where you are.\"", cta:"🧠 Explore My Niche Options →", ctaTool:"niche" },
    { emoji:"🔥", tag:"YOUR COMPETITION IS SLEEPING", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"Most people in your niche are consuming. You could be selling.", body:"Right now, 99% of people in your space are watching videos and saving posts about digital products. They're building a perfect plan they'll never execute. You have the tools. You have the platform. You just need to stop consuming and start creating.", hardTruth:"\"Your future buyers are already online. They're just buying from someone else right now.\"", cta:"🔥 Start Creating Today →", ctaTool:"product" },
    { emoji:"📱", tag:"ONE SALE CHANGES EVERYTHING", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"Your first sale will feel like nothing else you've ever experienced.", body:"The first time your phone buzzes with a payment notification — ₹399 from a complete stranger who found your product and decided your knowledge was worth paying for — that feeling will rewrite what you believe is possible. You're one product away from that moment.", hardTruth:"\"The first sale is proof. Proof that you have value, that people will pay, that this is real.\"", cta:"📱 Find My First Product Idea →", ctaTool:"product" },
    { emoji:"⏰", tag:"TODAY IS THE DAY", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"A year from now, you'll wish you had started today.", body:"That's not a cliché — it's a mathematical fact. If you start your first digital product today, one year from now you'll have 12 months of learning, iterations, sales, and growth behind you. If you don't start today, you'll have one more year of 'almost started.'", hardTruth:"\"The best time to launch your first product was last year. The second best time is right now.\"", cta:"⏰ Start Right Now →", ctaTool:"niche" },
    { emoji:"🌏", tag:"INDIA'S CREATOR MOMENT", gradient:"linear-gradient(135deg, #ea580c, #f59e0b)", accentColor:"#ea580c", lightBg:"rgba(234,88,12,0.06)", headline:"India's digital product economy is exploding — and most people are missing it.", body:"Right now, Indian creators are selling Notion templates, Hindi-language guides, finance trackers, and AI prompt packs to buyers across India and the world. The infrastructure is ready. The buyers are ready. Shikshantaram OS is ready. The only missing piece is your first product.", hardTruth:"\"The Indian creator economy is ₹2,500 Cr and growing. Your slice is sitting there unclaimed.\"", cta:"🌏 Claim My Space Now →", ctaTool:"niche" },
  ];

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "🌅 Good Morning";
    if (hour >= 12 && hour < 17) return "☀️ Good Afternoon";
    return "🌙 Good Evening";
  };

  useEffect(() => {
    if (user && !sessionStorage.getItem('motivationShown')) {
      const msg = MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)];
      const timer = setTimeout(() => {
        setMotivationMessage(msg);
        setShowMotivationPopup(true);
        sessionStorage.setItem('motivationShown', 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const closeMotivationPopup = () => setShowMotivationPopup(false);
  const handleMotivationCTA = (ctaTool: string) => {
    setShowMotivationPopup(false);
    if (ctaTool === 'niche') navigateTo('niche');
    if (ctaTool === 'product') navigateTo('product');
  };

  return (
    <>
      <GlobalStyles />
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
        background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
      }}>
        <Navbar userName={userName} userTier={tier} isAdmin={isAdmin} onSignOut={signOut} onProfileClick={() => setActivePage('profile')} avatarColor={avatarColor} userId={user?.id} trialEndsAt={trialEndsAt} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Mobile hamburger */}
          {isMobile && !sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} style={{
              position: 'fixed', top: 14, left: 14, zIndex: 60,
              width: 40, height: 40, borderRadius: 10,
              background: 'white', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Menu size={22} color="#374151" />
            </button>
          )}
          {/* Mobile overlay */}
          {isMobile && sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49,
            }} />
          )}
          {/* Sidebar wrapper */}
          <div style={{
            ...(isMobile ? {
              position: 'fixed' as const, top: 0, left: sidebarOpen ? 0 : -240,
              transition: 'left 0.3s ease', zIndex: 50, height: '100vh',
            } : {}),
          }}>
            {/* Mobile close button */}
            {isMobile && sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} style={{
                position: 'absolute', top: 16, right: 12, zIndex: 51,
                width: 28, height: 28, borderRadius: 8,
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="#64748b" />
              </button>
            )}
            <Sidebar activePage={activePage} onNavigate={navigateTo} onLockedClick={showLockedToast} accessTier={tier} savedCount={savedCount} />
          </div>
          <main id="main-content-area" style={{
            flex: 1,
            overflowY: activePage === 'dashboard' ? 'hidden' : 'auto',
            padding: activePage === 'dashboard' ? 0 : (isMobile ? '32px 16px' : '32px 36px'),
            marginLeft: 0,
            position: 'relative',
          }}>
            {activePage === 'dashboard' && user && (
              <AskAbhinavAI userId={user.id} userEmail={user.email || ''} userName={userName} />
            )}
            {activePage === 'niche' && <NichePage onBack={() => navigateTo('dashboard')} onAction={handleToolAction} onNavigate={navigateTo} />}
            {activePage === 'product' && <ProductPage onBack={() => navigateTo('dashboard')} onAction={handleToolAction} onBuildOffer={(data) => {
              setOfferPrefill(data);
              navigateTo('offer');
            }} />}
            {activePage === 'offer' && <OfferCreation onBack={() => navigateTo('dashboard')} prefill={offerPrefill} onPrefillConsumed={() => setOfferPrefill(null)} onBuildFunnel={(data: any) => { setFunnelPrefill(data); navigateTo('funnel'); }} />}
            {activePage === 'funnel' && <FunnelBuilder onBack={() => navigateTo('dashboard')} funnelPrefill={funnelPrefill} />}
            {activePage === 'copy_suite' && <CopySuite onBack={() => navigateTo('dashboard')} />}
            {activePage === 'saved' && user && <MySavedPage userId={user.id} onNavigate={navigateTo} onSavedCountChange={setSavedCount} onBuildFunnel={(data: any) => { setFunnelPrefill(data); navigateTo('funnel'); }} />}
            {activePage === 'profile' && user && <ProfilePage user={user} profile={profile} onProfileUpdate={refreshProfile} onNavigateDashboard={() => setActivePage('dashboard')} />}
            {activePage === 'knowledge_base' && <KnowledgeBasePage onNavigate={navigateTo} />}
          </main>
        </div>
      </div>
      {toast && <Toast data={toast} onClose={() => setToast(null)} />}
      {profile?.is_beta_user && user && <BetaFeedback userId={user.id} />}
      {trialLockTool && (
        <TrialLockModal
          tool={trialLockTool}
          onClose={() => setTrialLockTool(null)}
          onUpgrade={() => setShowTrialUpgrade(true)}
        />
      )}
      {(trialExpired || showTrialUpgrade) && <TrialExpiryPopup fullName={profile?.full_name} email={user?.email} />}
      {showUsagePopup && usageMsg && (
        <UsageValuePopup
          message={usageMsg}
          onClose={() => setShowUsagePopup(false)}
          onNavigate={navigateTo}
          displayValue={getRetailValue(sessionCostUsd)}
        />
      )}
      {showMotivationPopup && motivationMessage && (
        <div onClick={closeMotivationPopup} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(5,10,20,0.72)', backdropFilter:'blur(14px) saturate(150%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', animation:'fadeIn 0.3s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth:'480px', width:'100%', borderRadius:'28px', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)', animation:'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1)' }}>
            {/* Hero band */}
            <div style={{ height:'180px', background:motivationMessage.gradient, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', width:'220px', height:'220px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', top:'-40px', right:'-40px', animation:'float 6s ease-in-out infinite' }} />
              <div style={{ position:'absolute', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(255,255,255,0.06)', bottom:'-30px', left:'-20px', animation:'float 8s ease-in-out infinite reverse' }} />
              <div style={{ position:'absolute', top:'14px', left:'14px', background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'50px', padding:'4px 12px', fontSize:'10px', fontWeight:800, color:'white', letterSpacing:'0.06em', fontFamily:'DM Sans,sans-serif' }}>{getTimeGreeting()}</div>
              <button onClick={closeMotivationPopup} style={{ position:'absolute', top:'14px', right:'14px', width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.25)', color:'white', fontSize:'13px', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px' }}>
                <span style={{ fontSize:'52px', animation:'float 3s ease-in-out infinite', lineHeight:1 }}>{motivationMessage.emoji}</span>
                <div style={{ background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'50px', padding:'4px 14px', fontSize:'10px', fontWeight:800, color:'white', letterSpacing:'0.1em', fontFamily:'DM Sans,sans-serif' }}>{motivationMessage.tag}</div>
              </div>
            </div>
            {/* Content */}
            <div style={{ background:'rgba(255,255,255,0.97)', backdropFilter:'blur(20px)', padding:'28px 28px 24px' }}>
              <h2 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'clamp(17px,4vw,21px)', color:'#0f172a', lineHeight:1.2, letterSpacing:'-0.03em', margin:'0 0 12px' }}>{motivationMessage.headline}</h2>
              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', color:'#475569', lineHeight:1.75, margin:'0 0 18px' }}>{motivationMessage.body}</p>
              <div style={{ background:motivationMessage.lightBg, borderLeft:`3px solid ${motivationMessage.accentColor}`, borderRadius:'0 10px 10px 0', padding:'12px 16px', marginBottom:'22px' }}>
                <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#334155', lineHeight:1.65, fontStyle:'italic', margin:0 }}>{motivationMessage.hardTruth}</p>
              </div>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <button onClick={() => handleMotivationCTA(motivationMessage.ctaTool)} style={{ flex:1, background:motivationMessage.gradient, color:'white', border:'none', borderRadius:'14px', padding:'13px 20px', fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:'14px', cursor:'pointer', boxShadow:`0 4px 20px ${motivationMessage.accentColor}40`, transition:'all 0.18s cubic-bezier(0.34,1.56,0.64,1)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow=`0 8px 28px ${motivationMessage.accentColor}50`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow=`0 4px 20px ${motivationMessage.accentColor}40`; }}
                >{motivationMessage.cta}</button>
                <button onClick={closeMotivationPopup} style={{ background:'none', border:'none', color:'#94a3b8', fontFamily:'DM Sans,sans-serif', fontSize:'12.5px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>Maybe later</button>
              </div>
              <div style={{ borderTop:'1px solid #f1f5f9', marginTop:'20px', paddingTop:'14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', fontWeight:700, color:'#94a3b8' }}>🔥 Day {journeyDay} of your journey</span>
                <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', fontWeight:700, color:'#64748b', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'50px', padding:'4px 12px' }}>4 tools ready to use →</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Index;
