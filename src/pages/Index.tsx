import { useState, useEffect, useRef, CSSProperties } from 'react';
import AIResearchEngine from '@/components/AIResearchEngine';
import OfferCreation from '@/components/OfferCreation';
import { useNavigate } from 'react-router-dom';
import { nicheCategories, NicheCategory } from '@/data/niches';
import { productCategories, ProductCategory } from '@/data/products';
import { useAuth } from '@/hooks/useAuth';
import { useTracking } from '@/hooks/useTracking';
import BetaFeedback from '@/components/BetaFeedback';
import ProfilePage from '@/components/ProfilePage';

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

/* Nav icons */
const GridIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
);
const TargetIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const CompassIcon = ({ color = '#64748b' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={color} opacity="0.3"/></svg>
);
const GiftIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8"/><path d="M16.5 8a2.5 2.5 0 0 0 0-5C15 3 12 8 12 8"/></svg>
);
const FunnelIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
);
const WandIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="m15 4-9 9 3 3 9-9-3-3Z"/><path d="m18 7 3-3-3-3-3 3"/><path d="m5 16-3 3 3 3 3-3"/></svg>
);
const PenIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
);
const MegaphoneIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
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
type PageId = 'dashboard' | 'niche' | 'product' | 'offer' | 'settings' | 'help' | 'profile';
interface ToastData { toolName: string; type?: 'locked' | 'premium'; }

const UNLOCKED: PageId[] = ['dashboard', 'niche', 'product', 'offer'];

const TOOL_ACCESS: Record<string, string[]> = {
  dashboard: ['basic','premium','beta'],
  niche: ['basic','premium','beta'],
  product: ['basic','premium','beta'],
  offer: ['basic','premium','beta'],
  funnel: ['premium','beta'],
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
  { id: 'funnel', label: 'Funnel Builder', icon: () => <FunnelIcon />, badge: 'SOON', locked: true },
  { id: 'creator', label: 'Product Creator', icon: () => <WandIcon />, badge: 'SOON', locked: true },
  { id: 'copy', label: 'Copy Suite', icon: () => <PenIcon />, badge: 'SOON', locked: true },
  { id: 'ads', label: 'AI Ad Suite', icon: () => <MegaphoneIcon />, badge: 'SOON', locked: true },
];

const TOOL_CARDS = [
  { id: 'niche', num: '01', name: 'Niche Clarity', desc: 'Discover 594+ profitable niches with market data, growth signals & ideal buyer personas.', tags: ['594 Niches', 'Market Data'], gradient: 'linear-gradient(135deg, #7c3aed, #c026d3)', accent: '#7c3aed', accentLight: 'rgba(124,58,237,0.08)', locked: false },
  { id: 'product', num: '02', name: 'Product Navigator', desc: '500+ digital product ideas with launch timelines, price points & full ascension paths.', tags: ['500+ Ideas', 'Launch Fast'], gradient: 'linear-gradient(135deg, #ea580c, #f59e0b)', accent: '#ea580c', accentLight: 'rgba(234,88,12,0.08)', locked: false },
  { id: 'offer', num: '03', name: 'Offer Creation', desc: 'Build irresistible offers with pricing psychology, bonuses & positioning frameworks.', tags: ['Offers', 'Pricing'], gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', accent: '#f59e0b', accentLight: 'rgba(245,158,11,0.08)', locked: false },
  { id: 'funnel', num: '04', name: 'Funnel Builder', desc: 'Design your complete sales funnel — from lead magnet to high-ticket back-end.', tags: ['Funnels', 'Automation'], gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', accent: '#06b6d4', accentLight: 'rgba(6,182,212,0.08)', locked: true },
  { id: 'creator', num: '05', name: 'Product Creator', desc: 'AI-powered suite to create ebooks, templates, prompt packs & micro-courses inside the app.', tags: ['AI Creator', 'Auto-build'], gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', accent: '#10b981', accentLight: 'rgba(16,185,129,0.08)', locked: true },
  { id: 'copy', num: '06', name: 'Copy Suite', desc: 'Write sales pages, email sequences, ad copy & hooks in minutes with AI-powered copywriting.', tags: ['Copywriting', 'AI Writing'], gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)', accent: '#8b5cf6', accentLight: 'rgba(139,92,246,0.08)', locked: true },
  { id: 'ads', num: '07', name: 'AI Ad Suite', desc: 'Generate Meta, Google & YouTube ads with AI — creatives, copy, targeting & budgets.', tags: ['Paid Ads', 'Ad Creatives'], gradient: 'linear-gradient(135deg, #f97316, #ec4899)', accent: '#f97316', accentLight: 'rgba(249,115,22,0.08)', locked: true },
  { id: 'landing', num: '08', name: 'Landing Page Designer', desc: 'Drag-and-drop page builder with conversion-optimized templates for every product type.', tags: ['Pages', 'Conversion'], gradient: 'linear-gradient(135deg, #6366f1, #7c3aed)', accent: '#6366f1', accentLight: 'rgba(99,102,241,0.08)', locked: true },
];

/* ───────── Navbar ───────── */
function Navbar({ userName, userTier, isAdmin, onSignOut, onProfileClick }: { userName: string; userTier: string; isAdmin: boolean; onSignOut: () => void; onProfileClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

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
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <BellIcon />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6, borderRadius: '50%', background: '#ea580c' }} />
        </div>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <div onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 4px', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', borderRadius: 50, cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
function Sidebar({ activePage, onNavigate, onLockedClick, accessTier = 'basic' }: { activePage: PageId; onNavigate: (p: PageId) => void; onLockedClick: (name: string) => void; accessTier?: string }) {
  return (
    <div style={{
      width: 240, flexShrink: 0, height: '100%', overflowY: 'auto', background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.85)', padding: '20px 12px',
      boxShadow: '2px 0 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '0 8px', marginBottom: 6 }}>MY WORKSPACE</div>
      {NAV_ITEMS.map(item => {
        const active = activePage === item.id;
        const iconColor = item.locked ? '#94a3b8' : active ? '#7c3aed' : '#64748b';
        return (
          <div key={item.id} onClick={() => item.locked ? onLockedClick(item.label) : onNavigate(item.id as PageId)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
              marginBottom: 2, transition: 'all 0.15s',
              background: active ? 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.08))' : 'transparent',
              border: active ? '1px solid rgba(124,58,237,0.18)' : '1px solid transparent',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget.style.background = 'rgba(0,0,0,0.04)'); }}
            onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: active ? 'rgba(124,58,237,0.12)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.icon(iconColor)}
            </div>
            <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: active ? 700 : 500, color: item.locked ? '#94a3b8' : active ? '#7c3aed' : '#475569', flex: 1 }}>{item.label}</span>
            {item.badge === 'LIVE' && <span style={{ fontSize: 8, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 20 }}>LIVE</span>}
            {item.badge === 'SOON' && accessTier === 'basic' && <span style={{ fontSize: 8, fontWeight: 800, background: '#fef9c3', color: '#92400e', padding: '1px 6px', borderRadius: 20 }}>PREMIUM</span>}
            {item.badge === 'SOON' && accessTier !== 'basic' && <span style={{ fontSize: 8, fontWeight: 800, background: '#f1f5f9', color: '#94a3b8', padding: '1px 6px', borderRadius: 20 }}>SOON</span>}
          </div>
        );
      })}

      <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0' }} />
      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' as const, padding: '0 8px', marginBottom: 6 }}>ACCOUNT</div>
      {[{ icon: GearIcon, label: 'Settings' }, { icon: HelpIcon, label: 'Help & Docs' }].map(a => (
        <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 2 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><a.icon /></div>
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, color: '#64748b' }}>{a.label}</span>
        </div>
      ))}

      {/* Progress card */}
      <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(168,85,247,0.06))', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: 12 }}>
        <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#7c3aed', marginBottom: 4 }}>🚀 72-Hour Launch</div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 8 }}>3 of 8 tools unlocked</div>
        <div style={{ width: '100%', height: 5, background: '#f1f5f9', borderRadius: 50 }}>
          <div style={{ width: '37.5%', height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 50 }} />
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
  offer: { emoji: '🔥', title: 'Offer Creation is On Fire!', message: 'Our team is literally burning the midnight oil building this. Your irresistible offers are almost ready.', percent: 65, percentLabel: '65% built', funDetail: 'flames' },
  funnel: { emoji: '🚧', title: 'Funnels Under Construction!', message: 'Your conversion machine is being engineered. Every funnel step is being stress-tested for maximum sales.', percent: 45, percentLabel: '45% built', funDetail: 'building' },
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
function ToolCard({ card, onClick, delay, lockedIndex }: { card: typeof TOOL_CARDS[0]; onClick: () => void; delay: number; lockedIndex?: number }) {
  const [hovered, setHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const locked = card.locked;
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
                <span style={{ position: 'relative' as const }}>⚡ BUILDING NOW</span>
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
                }}>⚡ Coming Soon</span>
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

function DashboardHome({ onNavigate, onLockedClick, userName = 'Shiksha' }: { onNavigate: (p: PageId) => void; onLockedClick: (name: string) => void; userName?: string }) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [popupCard, setPopupCard] = useState<typeof TOOL_CARDS[0] | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  let lockedIdx = 0;

  return (
    <div>
      {/* Header */}
      <div style={{ animation: 'fadeUp 0.4s ease', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 28, color: '#0f172a', letterSpacing: '-0.02em' }}>{greeting}, {userName.split(' ')[0]} 👋</h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14.5, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>Your digital product universe is ready. Let's build something legendary.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard label="Tools Unlocked" value="2 / 8" iconBg="#ede9fe" iconColor="#7c3aed" icon="⚡" changePill="+2 live now" changeColor="#15803d" delay={0.06} />
        <StatCard label="Product Ideas" value="500+" iconBg="#fff7ed" iconColor="#ea580c" icon="💡" changePill="Explore →" changeColor="#ea580c" delay={0.08} />
        <StatCard label="Niches Mapped" value="594" iconBg="#dcfce7" iconColor="#059669" icon="🎯" changePill="Updated" changeColor="#15803d" delay={0.1} />
        <StatCard label="Time to Launch" value="72 hrs" iconBg="#fce7f3" iconColor="#be185d" icon="🚀" changePill="⚡ Fast track" changeColor="#be185d" delay={0.12} />
      </div>

      {/* Tool Suite heading */}
      <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease 0.1s both' }}>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a' }}>Your Tool Suite</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginTop: 2 }}>8 tools to take you from idea to income</p>
      </div>

      {/* Tool cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {TOOL_CARDS.map((card, i) => {
          const currentLockedIdx = card.locked ? lockedIdx++ : undefined;
          return (
            <ToolCard key={card.id} card={card} delay={0.14 + i * 0.04}
              lockedIndex={currentLockedIdx}
              onClick={() => card.locked ? setPopupCard(card) : onNavigate(card.id as PageId)} />
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
            { step: '3', emoji: '🚀', title: 'Build & Launch', desc: 'More creator tools drop soon. Subscribe to get notified when Product Creator & Copy Suite go live.', cta: 'Get Notified →', color: '#059669', bg: '#dcfce7', onClick: () => onLockedClick('Product Creator') },
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
function NichePage({ onBack, onAction }: { onBack: () => void; onAction?: () => void }) {
  const [search, setSearch] = useState('');
  const [growth, setGrowth] = useState('All');
  const [comp, setComp] = useState('All');
  const [modal, setModal] = useState<{ niche: string; cat: NicheCategory } | null>(null);

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
  );
}

/* ───────── Product Page ───────── */
function ProductPage({ onBack, onAction }: { onBack: () => void; onAction?: () => void }) {
  const [researchMode, setResearchMode] = useState<'ai' | 'browse'>('ai');
  const [search, setSearch] = useState('');
  const [speed, setSpeed] = useState('All');
  const [price, setPrice] = useState('All');
  const [modal, setModal] = useState<{ product: string; cat: ProductCategory } | null>(null);

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

      {researchMode === 'ai' ? (
        <AIResearchEngine />
      ) : (
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
    </div>
  );
}

/* ───────── Motivation Messages ───────── */
const MOTIVATION_MESSAGES = [
  {
    emoji: "🎯", tag: "YOUR NICHE IS WAITING",
    gradient: "linear-gradient(135deg, #7c3aed, #c026d3)", accentColor: "#7c3aed",
    lightBg: "rgba(124,58,237,0.06)",
    headline: "The niche you keep postponing? Someone just claimed it.",
    body: "Every day you spend 'thinking about it' is a day another creator builds an audience in your space, publishes the ebook you had in your head, and takes the income that was supposed to be yours. The window is open — but it won't stay open forever.",
    hardTruth: "\"You don't need more information. You need to make a decision and start.\"",
    cta: "🎯 Find My Niche Right Now →", ctaTool: "niche" as PageId,
  },
  {
    emoji: "📦", tag: "BUILD IT TODAY",
    gradient: "linear-gradient(135deg, #ea580c, #f59e0b)", accentColor: "#ea580c",
    lightBg: "rgba(234,88,12,0.06)",
    headline: "Your first digital product could be live by tonight.",
    body: "Not next month. Not after you 'figure everything out.' Tonight. A simple ₹499 ebook, a Notion template, a prompt pack — something real, something sellable, something that makes your phone buzz with a payment notification while you sleep.",
    hardTruth: "\"Done and imperfect beats perfect and unpublished — every single time.\"",
    cta: "📦 Find My First Product →", ctaTool: "product" as PageId,
  },
  {
    emoji: "⚡", tag: "NO MORE WAITING",
    gradient: "linear-gradient(135deg, #0891b2, #7c3aed)", accentColor: "#0891b2",
    lightBg: "rgba(8,145,178,0.06)",
    headline: "Waiting for the 'right time' is the most expensive mistake you'll make.",
    body: "The creators earning ₹50,000 a month from digital products didn't wait until they felt ready. They picked a niche, built something scrappy, put it online, and improved from there. The only difference between them and you right now is that they started.",
    hardTruth: "\"Every morning you wake up without a product for sale is a morning you worked for free.\"",
    cta: "⚡ Start Building Now →", ctaTool: "product" as PageId,
  },
  {
    emoji: "🚀", tag: "72 HOURS. THAT'S ALL.",
    gradient: "linear-gradient(135deg, #059669, #06b6d4)", accentColor: "#059669",
    lightBg: "rgba(5,150,105,0.06)",
    headline: "72 hours from now, you could have your first digital product live.",
    body: "That's the exact time it takes to go from zero to a published product on Gumroad. Find your niche today. Pick your product format tomorrow. Build it the day after. This platform was built for exactly this — your 72-hour launch is not a dream, it's a plan.",
    hardTruth: "\"In 72 hours, you'll either have a product live or another set of excuses. Choose wisely.\"",
    cta: "🚀 Start My 72-Hour Launch →", ctaTool: "niche" as PageId,
  },
  {
    emoji: "💰", tag: "THE INCOME IS REAL",
    gradient: "linear-gradient(135deg, #b45309, #ea580c)", accentColor: "#b45309",
    lightBg: "rgba(180,83,9,0.06)",
    headline: "Someone bought a digital product in the last 3 seconds. It wasn't yours.",
    body: "The global digital product market doesn't pause while you think. Thousands of buyers are right now on Gumroad, Instagram, and WhatsApp groups looking for exactly what you know — your niche knowledge, your system, your shortcut — packaged into something they can pay for instantly.",
    hardTruth: "\"You are one product launch away from changing your monthly income forever.\"",
    cta: "💰 Find My Profitable Niche →", ctaTool: "niche" as PageId,
  },
  {
    emoji: "🧠", tag: "YOU ALREADY KNOW ENOUGH",
    gradient: "linear-gradient(135deg, #7c3aed, #3b82f6)", accentColor: "#7c3aed",
    lightBg: "rgba(124,58,237,0.06)",
    headline: "You already know more than 10,000 people who would pay to learn from you.",
    body: "You don't need a degree. You don't need 10 years of experience. You don't need to be the world's best. You just need to know more than a beginner on ONE specific topic — and turn that into a ₹299 guide, a template, a mini-course. That's it. That's the whole business model.",
    hardTruth: "\"Stop waiting to be an expert. Beginners with ₹50,000/month incomes started exactly where you are.\"",
    cta: "🧠 Explore My Niche Options →", ctaTool: "niche" as PageId,
  },
  {
    emoji: "🔥", tag: "YOUR COMPETITION IS SLEEPING",
    gradient: "linear-gradient(135deg, #ec4899, #f97316)", accentColor: "#ec4899",
    lightBg: "rgba(236,72,153,0.06)",
    headline: "Most people in your niche are consuming. You could be selling.",
    body: "Right now, 99% of people in your space are watching YouTube videos, reading tweets, and saving Instagram posts about digital products. They're building a perfect plan they'll never execute. You have the tools. You have the platform. You just need to stop consuming and start creating.",
    hardTruth: "\"Your future buyers are already online. They're just buying from someone else right now.\"",
    cta: "🔥 Start Creating Today →", ctaTool: "product" as PageId,
  },
  {
    emoji: "📱", tag: "ONE SALE CHANGES EVERYTHING",
    gradient: "linear-gradient(135deg, #6366f1, #ec4899)", accentColor: "#6366f1",
    lightBg: "rgba(99,102,241,0.06)",
    headline: "Your first sale will feel like nothing else you've ever experienced.",
    body: "The first time your phone buzzes with a Gumroad payment notification — ₹399 from a complete stranger who found your product, read your page, and decided your knowledge was worth paying for — that feeling will rewrite what you believe is possible for you. You're one product away from that moment.",
    hardTruth: "\"The first sale is proof. Proof that you have value, that people will pay, that this is real.\"",
    cta: "📱 Find My First Product Idea →", ctaTool: "product" as PageId,
  },
  {
    emoji: "⏰", tag: "TODAY IS THE DAY",
    gradient: "linear-gradient(135deg, #0f172a, #334155)", accentColor: "#334155",
    lightBg: "rgba(15,23,42,0.05)",
    headline: "A year from now, you'll wish you had started today.",
    body: "That's not a cliché — it's a mathematical fact. If you start your first digital product today, one year from now you'll have 12 months of learning, iterations, sales, and growth behind you. If you don't start today, you'll just have one more year of 'almost started.'",
    hardTruth: "\"The best time to launch your first product was last year. The second best time is right now.\"",
    cta: "⏰ Start Right Now →", ctaTool: "niche" as PageId,
  },
  {
    emoji: "🌏", tag: "INDIA'S CREATOR MOMENT",
    gradient: "linear-gradient(135deg, #059669, #7c3aed)", accentColor: "#059669",
    lightBg: "rgba(5,150,105,0.06)",
    headline: "India's digital product economy is exploding — and most people are missing it.",
    body: "This is not a future trend. Right now, Indian creators are selling Notion templates, Hindi-language guides, finance trackers, and AI prompt packs to buyers across India and the world. The infrastructure is ready. The buyers are ready. Shikshantaram OS is ready. The only missing piece is your first product.",
    hardTruth: "\"The Indian creator economy is ₹2,500 Cr and growing. Your slice is sitting there unclaimed.\"",
    cta: "🌏 Claim My Space Now →", ctaTool: "niche" as PageId,
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

/* ───────── Motivation Popup ───────── */
function MotivationPopup({ message, onClose, onNavigate, journeyDay }: {
  message: typeof MOTIVATION_MESSAGES[0];
  onClose: () => void;
  onNavigate: (p: PageId) => void;
  journeyDay: number;
}) {
  const [notified, setNotified] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setBarWidth(1));
  }, []);

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
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', animation: 'float 6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'float 8s ease-in-out infinite reverse' }} />
          {/* Dot cluster */}
          <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', gap: 4 }}>
            {[0, 0.3, 0.6].map((d, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: `pulse 2s ease-in-out ${d}s infinite` }} />
            ))}
          </div>
          {/* Time badge */}
          <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 50, padding: '4px 14px', fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.1em' }}>
            {getTimeOfDayBadge()}
          </div>
          {/* Close */}
          <div onClick={dismiss} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}>✕</div>
          {/* Center emoji + tag */}
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
            {message.headline}
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: 14.5, color: '#475569', lineHeight: 1.75, marginBottom: 20 }}>
            {message.body}
          </p>
          {/* Hard truth callout */}
          <div style={{ background: message.lightBg, borderLeft: `3px solid ${message.accentColor}`, borderRadius: '0 10px 10px 0', padding: '12px 16px', marginBottom: 22 }}>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.65, fontStyle: 'italic' }}>
              {message.hardTruth}
            </p>
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
              Maybe later
            </button>
          </div>
          {/* Bottom strip */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 20, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>🔥 Day {journeyDay} of your journey</span>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 50, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#64748b' }}>2 tools ready to use →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Main Index ───────── */
const Index = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);
  const [motivationMsg, setMotivationMsg] = useState<typeof MOTIVATION_MESSAGES[0] | null>(null);
  const tracking = useTracking(user?.id);
  const sessionStarted = useRef(false);

  const tier = profile?.access_tier || 'basic';
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const journeyDay = getJourneyDay(profile?.created_at);

  // Motivation popup — only on fresh login
  useEffect(() => {
    if (user && !sessionStorage.getItem('motivationShown')) {
      const timer = setTimeout(() => {
        setMotivationMsg(MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)]);
        setShowMotivation(true);
        sessionStorage.setItem('motivationShown', 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Start session tracking
  useEffect(() => {
    if (user && !sessionStarted.current) {
      sessionStarted.current = true;
      tracking.startSession();
    }
  }, [user]);

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
    tracking.closeToolTracking();
    setActivePage(page);
    if (page !== 'dashboard') {
      tracking.trackToolOpen(page);
    }
  };

  const handleToolAction = () => {
    tracking.trackToolAction();
  };

  return (
    <>
      <GlobalStyles />
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
        background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
      }}>
        <Navbar userName={userName} userTier={tier} isAdmin={isAdmin} onSignOut={signOut} onProfileClick={() => setActivePage('profile')} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar activePage={activePage} onNavigate={navigateTo} onLockedClick={showLockedToast} accessTier={tier} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
            {activePage === 'dashboard' && <DashboardHome onNavigate={navigateTo} onLockedClick={showLockedToast} userName={userName} />}
            {activePage === 'niche' && <NichePage onBack={() => navigateTo('dashboard')} onAction={handleToolAction} />}
            {activePage === 'product' && <ProductPage onBack={() => navigateTo('dashboard')} onAction={handleToolAction} />}
            {activePage === 'offer' && <OfferCreation onBack={() => navigateTo('dashboard')} />}
            {activePage === 'profile' && user && <ProfilePage user={user} profile={profile} onProfileUpdate={refreshProfile} onNavigateDashboard={() => setActivePage('dashboard')} />}
          </main>
        </div>
      </div>
      {toast && <Toast data={toast} onClose={() => setToast(null)} />}
      {profile?.is_beta_user && user && <BetaFeedback userId={user.id} />}
      {showMotivation && motivationMsg && (
        <MotivationPopup
          message={motivationMsg}
          onClose={() => setShowMotivation(false)}
          onNavigate={navigateTo}
          journeyDay={journeyDay}
        />
      )}
    </>
  );
};

export default Index;
