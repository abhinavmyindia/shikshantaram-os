import { useState, useEffect, CSSProperties } from 'react';
import { autoSaveWork, loadRecentWork } from '@/utils/recentWork';
import RestoreBanner from '@/components/RestoreBanner';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithRetry } from '@/utils/retryFetch';
import { useSaveItem } from '@/hooks/useSaveItem';
import { useCreditGate } from '@/hooks/useCreditGate';
import { exportFunnelPDF } from '@/utils/exportFunnel';

/* ───────── Prefill Types ───────── */
interface FunnelPrefillData {
  productName: string;
  offerDescription: string;
  targetBuyer: string;
  priceRange?: string;
  sourceProduct?: string;
}
interface FunnelBrief {
  productName: string;
  offer: string;
  audience: string;
  goal: string;
  trafficSources: string[];
}

interface FunnelType {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  stepCount: number;
  description: string;
  stepPills: string[];
  bestFor: string;
  recommended?: boolean;
}

interface FunnelStep {
  stepId: string;
  stepNumber: number;
  stepType: string;
  stepName: string;
  stepIcon: string;
  accentColor: string;
  goal: string;
  pageTitle?: string;
  whatHappensHere: string;
  keyMessage: string;
  primaryCTA: string;
  conversionBenchmark: string;
  timeOnStep: string;
  emailTriggered: boolean;
  emailSubject?: string;
  platformRecommendation: string;
  copyFramework: string;
  mistakesToAvoid: string[];
  successMetric: string;
}

interface FunnelData {
  funnelName: string;
  funnelTagline: string;
  estimatedConversionRate: string;
  estimatedTimeToLaunch: string;
  estimatedMonthlyRevenue: string;
  steps: FunnelStep[];
  quickWins: string[];
  toolStack: { purpose: string; recommended: string; alternative: string; cost: string }[];
}

interface StepCopy {
  headline: string;
  subheadline: string;
  openingHook: string;
  bodyParagraphs: string[];
  bulletPoints: string[];
  ctaText: string;
  ctaSupportingLine: string;
  closingStatement: string;
  emailCopy?: { subject: string; previewText: string; body: string };
  platformNotes: string;
}

interface EmailItem {
  seriesName: string;
  emailNumber: number;
  day: number;
  triggerEvent: string;
  subject: string;
  previewText: string;
  fromName: string;
  headline: string;
  body: string;
  cta: string;
  ctaUrl: string;
  ps: string;
  toneNotes: string;
}

interface EmailSequence {
  welcomeSeries: EmailItem[];
  salesSeries: EmailItem[];
  postPurchaseSeries: EmailItem[];
  sequenceSummary: string;
}

type FunnelStepId = 'brief' | 'generating' | 'visualizer' | 'copy-panel' | 'emails';

/* ───────── Constants ───────── */
const FUNNEL_TYPES: FunnelType[] = [
  { id: 'simple', name: 'Simple Sales Funnel', emoji: '🎯', accent: '#f59e0b', stepCount: 3, description: 'Perfect for first-time launchers. Straight line from interest to purchase.', stepPills: ['Sales Page', 'Order', 'Thank You'], bestFor: '₹199–₹999 products, impulse purchases' },
  { id: 'email', name: 'Email List Funnel', emoji: '📧', accent: '#7c3aed', stepCount: 5, description: 'Build your list AND sell. Most sustainable funnel for long-term income.', stepPills: ['Lead Magnet', 'Opt-in', 'Welcome Email', 'Sales Email', 'Upsell'], bestFor: 'Any price point, relationship-based selling', recommended: true },
  { id: 'whatsapp', name: 'WhatsApp / DM Funnel', emoji: '💬', accent: '#22c55e', stepCount: 4, description: "India's most effective selling channel. Content → conversation → close.", stepPills: ['Hook Content', 'DM Trigger', 'Conversation', 'Payment Link'], bestFor: '₹499–₹4,999 products, personal selling' },
  { id: 'webinar', name: 'Webinar Funnel', emoji: '🎥', accent: '#ec4899', stepCount: 6, description: 'Teach-to-sell format. Best for high-ticket offers and building trust fast.', stepPills: ['Registration', 'Reminder', 'Live Webinar', 'Replay', 'Sales Close', 'Follow-up'], bestFor: '₹2,999+ products, complex topics' },
  { id: 'launch', name: 'Full Launch Funnel', emoji: '🚀', accent: '#06b6d4', stepCount: 7, description: 'Complete pre-launch + launch + post-launch system. Maximum revenue.', stepPills: ['Pre-launch Content', 'Waitlist', 'Early Bird', 'Open Cart', 'Close Cart', 'Upsell', 'Onboard'], bestFor: 'Course launches, memberships, big offers' },
];

const TRAFFIC_SOURCES = [
  { id: 'meta_ads', icon: '📘', name: 'Meta Ads', description: 'Facebook & Instagram paid ads', color: '#1877f2', lightBg: 'rgba(24,119,242,0.06)', lightBorder: 'rgba(24,119,242,0.2)' },
  { id: 'google_ads', icon: '🔍', name: 'Google Ads', description: 'Search & display advertising', color: '#ea4335', lightBg: 'rgba(234,67,53,0.06)', lightBorder: 'rgba(234,67,53,0.2)' },
  { id: 'linkedin_ads', icon: '💼', name: 'LinkedIn Ads', description: 'B2B & professional targeting', color: '#0a66c2', lightBg: 'rgba(10,102,194,0.06)', lightBorder: 'rgba(10,102,194,0.2)' },
  { id: 'youtube', icon: '📺', name: 'YouTube', description: 'Video content & pre-roll ads', color: '#ff0000', lightBg: 'rgba(255,0,0,0.05)', lightBorder: 'rgba(255,0,0,0.15)' },
  { id: 'organic_social', icon: '🌱', name: 'Organic Social', description: 'Free posts, reels & stories', color: '#0d7a5f', lightBg: 'rgba(13,122,95,0.06)', lightBorder: 'rgba(13,122,95,0.2)' },
  { id: 'email_list', icon: '📧', name: 'Email List', description: 'Existing subscribers & nurture', color: '#7c3aed', lightBg: 'rgba(124,58,237,0.06)', lightBorder: 'rgba(124,58,237,0.2)' },
  { id: 'google_seo', icon: '🔎', name: 'Google SEO', description: 'Organic search traffic', color: '#0891b2', lightBg: 'rgba(8,145,178,0.06)', lightBorder: 'rgba(8,145,178,0.2)' },
  { id: 'referrals', icon: '🤝', name: 'Referrals', description: 'Word of mouth & partnerships', color: '#d97706', lightBg: 'rgba(217,119,6,0.06)', lightBorder: 'rgba(217,119,6,0.2)' },
];

const GOAL_OPTIONS = [
  { label: '💰 Maximize Sales', value: 'Maximize Sales', accent: '#f59e0b' },
  { label: '📧 Build Email List', value: 'Build Email List', accent: '#7c3aed' },
  { label: '🤝 Build Relationships', value: 'Build Relationships', accent: '#15803d' },
  { label: '🚀 Launch Fast', value: 'Launch Fast', accent: '#06b6d4' },
];

const STEP_TYPES_FOR_ADD = [
  { emoji: '📝', name: 'Sales Page', type: 'sales-page' },
  { emoji: '📧', name: 'Email', type: 'email' },
  { emoji: '🎁', name: 'Upsell', type: 'upsell' },
  { emoji: '⬇️', name: 'Downsell', type: 'downsell' },
  { emoji: '🙏', name: 'Thank You', type: 'thank-you' },
  { emoji: '🔗', name: 'Bridge Page', type: 'bridge' },
  { emoji: '🔔', name: 'Opt-in', type: 'opt-in' },
  { emoji: '🎥', name: 'Video Page', type: 'video' },
];

/* ───────── Helpers ───────── */
const s = (styles: CSSProperties): CSSProperties => styles;

/** Remap low-visibility greens to deeper, accessible alternatives */
const LOW_VIS_GREENS: Record<string, string> = {
  '#10b981': '#0d7a5f', '#059669': '#0d7a5f', '#22c55e': '#15803d',
  '#34d399': '#0d7a5f', '#6ee7b7': '#15803d', '#4ade80': '#15803d',
};
const safeAccent = (c: string): string => LOW_VIS_GREENS[c?.toLowerCase()] || c;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: copied ? '#0d7a5f' : '#06b6d4', background: copied ? '#e6f4ed' : 'rgba(6,182,212,0.08)', border: `1px solid ${copied ? '#a7d7c5' : 'rgba(6,182,212,0.2)'}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s' })}>
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

/* ───────── Progress Bar ───────── */
function StepProgressBar({ currentStep }: { currentStep: number }) {
  const steps = ['Brief', 'Funnel Map', 'Copy & Emails'];
  return (
    <div style={s({ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 })}>
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={label} style={s({ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined })}>
            <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 })}>
              <div style={s({
                width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Sora', fontWeight: 900, fontSize: 15, color: 'white',
                background: isCompleted ? '#e6f4ed' : isActive ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : '#f1f5f9',
                ...(isCompleted ? { color: '#0d7a5f' } : isActive ? { boxShadow: '0 0 0 5px rgba(6,182,212,0.2)' } : { color: '#94a3b8' }),
              })}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <span style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: isCompleted ? '#0d7a5f' : isActive ? '#06b6d4' : '#94a3b8' })}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={s({ flex: 1, height: 3, marginLeft: 8, marginRight: 8, marginBottom: 18, background: isCompleted ? '#0d7a5f' : isActive ? 'linear-gradient(90deg,#0d7a5f,#f1f5f9)' : '#f1f5f9' })} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function FunnelBuilder({ onBack, funnelPrefill }: { onBack: () => void; funnelPrefill?: FunnelPrefillData | null }) {
  const { saveItem, isSaved, isSaving } = useSaveItem();
  const credits = useCreditGate();
  const [funnelStep, setFunnelStep] = useState<FunnelStepId>('brief');
  useEffect(() => { const el = document.getElementById('main-content-area'); if (el) el.scrollTop = 0; }, [funnelStep]);
  const [funnelBrief, setFunnelBrief] = useState<FunnelBrief>({ productName: '', offer: '', audience: '', goal: '', trafficSources: [] });
  const [funnelType, setFunnelType] = useState<string | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [stepCopy, setStepCopy] = useState<Record<string, StepCopy>>({});
  const [emailSequence, setEmailSequence] = useState<EmailSequence | null>(null);
  const [generatingCopy, setGeneratingCopy] = useState<string | null>(null);
  const [generatingEmails, setGeneratingEmails] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepType, setNewStepType] = useState('');
  const [emailTab, setEmailTab] = useState<'welcome' | 'sales' | 'postPurchase'>('welcome');
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});
  const [copyViewStep, setCopyViewStep] = useState<FunnelStep | null>(null);
  const [showPrefillBanner, setShowPrefillBanner] = useState(false);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [recentWorkData, setRecentWorkData] = useState<any>(null);

  // Check for recent work on mount
  useEffect(() => {
    const checkRecent = async () => {
      if (!credits.currentUser?.id) return;
      const recent = await loadRecentWork(credits.currentUser.id, 'funnel_builder', 'funnel_map');
      if (recent?.outputData?.funnelData) {
        setRecentWorkData(recent);
        setShowRestoreBanner(true);
      }
    };
    checkRecent();
  }, [credits.currentUser?.id]);

  const handleRestoreFunnel = () => {
    if (!recentWorkData) return;
    setFunnelData(recentWorkData.outputData.funnelData);
    setStepCopy(recentWorkData.outputData.stepCopy || {});
    setEmailSequence(recentWorkData.outputData.emailSequence || null);
    setFunnelBrief(recentWorkData.inputData?.funnelBrief || funnelBrief);
    setFunnelStep('visualizer');
    setShowRestoreBanner(false);
  };

  // Consume prefill on mount
  useEffect(() => {
    if (funnelPrefill) {
      setFunnelBrief(prev => ({
        ...prev,
        productName: funnelPrefill.productName || '',
        offer: funnelPrefill.offerDescription || '',
        audience: funnelPrefill.targetBuyer || '',
      }));
      setPrefilledFields(new Set(['productName', 'offer', 'audience']));
      setShowPrefillBanner(true);
      setTimeout(() => {
        document.getElementById('funnel-type-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, []);

  const currentProgressStep = funnelStep === 'brief' || funnelStep === 'generating' ? 0 : funnelStep === 'visualizer' ? 1 : 2;
  const chosenType = FUNNEL_TYPES.find(t => t.id === funnelType);
  const canGenerate = funnelType && funnelBrief.productName.trim() && funnelBrief.offer.trim();

  // Loading animation steps
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  useEffect(() => {
    if (funnelStep !== 'generating') return;
    const iv = setInterval(() => setLoadingTextIdx(i => (i + 1) % 4), 2200);
    return () => clearInterval(iv);
  }, [funnelStep]);

  const loadingTexts = [
    'Analyzing your offer and audience...',
    `Designing ${chosenType?.stepCount || ''}-step funnel architecture...`,
    'Setting conversion benchmarks for each step...',
    'Preparing copy frameworks...',
  ];

  /* ───── API Calls ───── */
  const generateFunnel = async () => {
    setFunnelStep('generating');
    setError(null);
    try {
      const { data, error: fnErr } = await invokeWithRetry('funnel-builder', {
        body: { action: 'generate-funnel', brief: funnelBrief, funnelType: { name: chosenType!.name, stepCount: chosenType!.stepCount }, userId: credits.currentUser?.id, userEmail: credits.currentUser?.email }
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setFunnelData(data.result);
      setFunnelStep('visualizer');
      credits.deductAfterSuccess('funnel_builder', 'generate_funnel_architecture', data?.byok, data?.provider);
      // Auto-save (fire and forget)
      if (credits.currentUser?.id) {
        autoSaveWork({
          userId: credits.currentUser.id,
          tool: 'funnel_builder',
          callType: 'funnel_map',
          title: data.result?.funnelName || 'Funnel Map',
          subtitle: data.result?.funnelTagline?.slice(0, 70),
          inputData: { funnelBrief, funnelType },
          outputData: { funnelData: data.result },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Could not generate funnel. Please try again.');
      setFunnelStep('brief');
    }
  };

  const generateStepCopy = async (step: FunnelStep) => {
    setGeneratingCopy(step.stepId);
    try {
      const { data, error: fnErr } = await invokeWithRetry('funnel-builder', {
        body: { action: 'generate-step-copy', step, brief: funnelBrief, userId: credits.currentUser?.id, userEmail: credits.currentUser?.email }
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setStepCopy(prev => ({ ...prev, [step.stepId]: data.result }));
      credits.deductAfterSuccess('funnel_builder', 'generate_step_copy', data?.byok, data?.provider);
    } catch (err: any) {
      setError(err.message || 'Could not generate copy.');
    } finally {
      setGeneratingCopy(null);
    }
  };

  const generateEmails = async () => {
    setGeneratingEmails(true);
    setError(null);
    try {
      const { data, error: fnErr } = await invokeWithRetry('funnel-builder', {
        body: { action: 'generate-emails', brief: funnelBrief, funnelData, userId: credits.currentUser?.id, userEmail: credits.currentUser?.email }
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setEmailSequence(data.result);
      credits.deductAfterSuccess('funnel_builder', 'generate_email_sequence', data?.byok, data?.provider);
    } catch (err: any) {
      setError(err.message || 'Could not generate emails.');
    } finally {
      setGeneratingEmails(false);
    }
  };

  const addStep = () => {
    if (!funnelData || !newStepType || !newStepName.trim()) return;
    const stepInfo = STEP_TYPES_FOR_ADD.find(s => s.type === newStepType);
    const newStep: FunnelStep = {
      stepId: `step_${funnelData.steps.length + 1}`,
      stepNumber: funnelData.steps.length + 1,
      stepType: newStepType,
      stepName: newStepName.trim(),
      stepIcon: stepInfo?.emoji || '📄',
      accentColor: '#06b6d4',
      goal: 'Define the goal for this step',
      whatHappensHere: 'Describe what happens at this step',
      keyMessage: '',
      primaryCTA: 'Take Action',
      conversionBenchmark: 'TBD',
      timeOnStep: 'TBD',
      emailTriggered: false,
      platformRecommendation: 'Your Website',
      copyFramework: 'AIDA',
      mistakesToAvoid: [],
      successMetric: 'TBD',
    };
    setFunnelData({ ...funnelData, steps: [...funnelData.steps, newStep] });
    setShowAddStep(false);
    setNewStepName('');
    setNewStepType('');
  };

  const toggleTrafficSource = (name: string) => {
    setFunnelBrief(prev => {
      const sources = prev.trafficSources.includes(name) ? prev.trafficSources.filter(s => s !== name) : prev.trafficSources.length < 3 ? [...prev.trafficSources, name] : prev.trafficSources;
      return { ...prev, trafficSources: sources };
    });
  };

  const markFieldEdited = (field: string) => {
    setEditedFields(prev => { const n = new Set(prev); n.add(field); return n; });
    setPrefilledFields(prev => { const n = new Set(prev); n.delete(field); return n; });
  };

  const isPrefilled = (field: string) => prefilledFields.has(field) && !editedFields.has(field);

  // Smart goal hint based on price range
  const getGoalHint = () => {
    if (!funnelPrefill?.priceRange) return null;
    const pr = funnelPrefill.priceRange.toLowerCase();
    if (pr.includes('199') || pr.includes('impulse') || pr.includes('$7')) return "💡 For impulse-priced offers, 'Maximize Sales Volume' often works best";
    if (pr.includes('499') || pr.includes('low') || pr.includes('$27')) return "💡 Low-ticket offers do well with 'Get Direct Sales'";
    if (pr.includes('1,999') || pr.includes('mid') || pr.includes('$97')) return "💡 Mid-ticket? Consider 'Build Email List First' to warm up leads";
    if (pr.includes('9,999') || pr.includes('high') || pr.includes('$497')) return "💡 High-ticket offers convert better with 'Build Email List + Nurture'";
    return null;
  };

  // Progress-aware validation message for prefill mode
  const getValidationMessage = () => {
    if (!funnelPrefill) {
      return canGenerate ? '✓ Ready to map your funnel' : 'Fill in product name & offer to continue';
    }
    if (!funnelType) return '👆 Choose your funnel type to continue';
    if (!funnelBrief.goal) return '✓ Funnel type selected · 👆 Now choose your primary goal';
    if (funnelBrief.trafficSources.length === 0) return '✓ Funnel type + goal ready · 👆 Just pick your traffic source';
    return "✅ Everything's set · Hit Map My Funnel to build your funnel!";
  };

  const allManualFieldsFilled = funnelType && funnelBrief.goal && funnelBrief.trafficSources.length > 0;
  const shouldPulse = !!funnelPrefill && allManualFieldsFilled && canGenerate;

  /* ───────── RENDER: BRIEF ───────── */
  if (funnelStep === 'brief') {
    return (
      <div style={s({ animation: 'fadeUp 0.4s ease' })}>
        {showRestoreBanner && recentWorkData && (
          <RestoreBanner title={recentWorkData.title} createdAt={recentWorkData.createdAt} onRestore={handleRestoreFunnel} onDismiss={() => setShowRestoreBanner(false)} />
        )}
        {/* Header */}
        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 })}>
          <div>
            <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
              <span onClick={onBack} style={s({ cursor: 'pointer', fontWeight: 500 })}>Dashboard</span> / <span style={s({ fontWeight: 700, color: '#0f172a' })}>Funnel Builder</span>
            </div>
            <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 })}>Funnel Builder</h1>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 })}>Design your complete sales system — from first touch to final sale.</p>
          </div>
        </div>
        <StepProgressBar currentStep={0} />

        {error && (
          <div style={s({ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontFamily: 'DM Sans', fontSize: 13, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span>⚠️ {error}</span>
            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <button onClick={() => { setError(null); generateFunnel(); }} style={s({ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' })}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🔄 Try Again</button>
              <button onClick={() => setError(null)} style={s({ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 })}>✕</button>
            </div>
          </div>
        )}

        <div style={s({ maxWidth: 720, margin: '0 auto' })}>
          {/* Prefill Banner */}
          {showPrefillBanner && funnelPrefill && (
            <div style={s({ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.05))', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 18, padding: '18px 22px', marginBottom: 24, animation: 'fadeUp 0.4s ease' })}>
              <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                <span style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0891b2' })}>✨ 3 things auto-filled from your offer</span>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' })}>← from {(funnelPrefill.sourceProduct || '').slice(0, 30)}</span>
              </div>
              <div style={s({ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
                {['Product Name', 'Offer Description', 'Target Buyer'].map(f => (
                  <span key={f} style={s({ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 50, padding: '4px 12px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#0891b2' })}>✓ {f}</span>
                ))}
              </div>
              <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', marginTop: 10, lineHeight: 1.6 })}>Just pick your funnel type, goal, and traffic source — then hit Map My Funnel 🚀</div>
            </div>
          )}

          {/* Hero */}
          <div style={s({ textAlign: 'center', marginBottom: 28 })}>
            <span style={s({ fontSize: 11, fontWeight: 800, background: 'rgba(6,182,212,0.1)', color: '#0891b2', padding: '3px 12px', borderRadius: 50 })}>Step 1 of 3</span>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 28, color: '#0f172a', marginTop: 12 })}>Design Your Sales Funnel</h2>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 6 })}>Tell us what you're selling and where. AI maps the complete buyer journey.</p>
          </div>

          {/* Funnel Type Selection */}
          <div id="funnel-type-section" style={s({ marginBottom: 28 })}>
            <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 })}>Choose Your Funnel Type</h3>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginBottom: funnelPrefill ? 4 : 16 })}>Pick the funnel that matches how you sell</p>
            {funnelPrefill && <p style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', fontStyle: 'italic', marginBottom: 12 })}>👆 Pick the funnel type that best matches how you'll sell this offer</p>}
            <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 })}>
              {FUNNEL_TYPES.map(ft => {
                const sel = funnelType === ft.id;
                return (
                  <div key={ft.id} onClick={() => setFunnelType(ft.id)}
                    style={s({ borderRadius: 16, padding: '18px 16px', cursor: 'pointer', border: `2px solid ${sel ? ft.accent : '#e2e8f0'}`, background: sel ? `${ft.accent}0a` : '#f8fafc', boxShadow: sel ? `0 0 0 3px ${ft.accent}18` : 'none', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', position: 'relative' })}
                    onMouseEnter={e => { if (!sel) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${ft.accent}50`; } }}
                    onMouseLeave={e => { if (!sel) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}>
                    {ft.recommended && <span style={s({ position: 'absolute', top: 8, right: 8, fontSize: 8, fontWeight: 800, background: `${ft.accent}15`, color: ft.accent, padding: '2px 8px', borderRadius: 50, border: `1px solid ${ft.accent}25` })}>⭐ Most Popular</span>}
                    <span style={s({ fontSize: 28, display: 'block', marginBottom: 8 })}>{ft.emoji}</span>
                    <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a' })}>{ft.name}</div>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, background: `${ft.accent}15`, color: ft.accent, padding: '2px 8px', borderRadius: 50, marginTop: 4, display: 'inline-block', marginBottom: 8 })}>{ft.stepCount} steps</span>
                    <p style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', lineHeight: 1.6 })}>{ft.description}</p>
                    <div style={s({ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 })}>
                      {ft.stepPills.map((p, i) => (
                        <span key={i}>
                          <span style={s({ fontSize: 9, fontWeight: 600, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 20 })}>{p}</span>
                          {i < ft.stepPills.length - 1 && <span style={s({ fontSize: 9, color: '#cbd5e1', margin: '0 1px' })}>→</span>}
                        </span>
                      ))}
                    </div>
                    <p style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', marginTop: 6 })}>Best for: {ft.bestFor}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brief Form (shows after type selected) */}
          {funnelType && (
            <div style={s({ animation: 'fadeUp 0.3s ease' })}>
              <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 16 })}>Tell us about your offer</h3>
              <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' })}>
                {/* Field 1 */}
                <div style={s({ marginBottom: 20 })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                    <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#06b6d4', letterSpacing: '0.04em' })}>01 · WHAT ARE YOU SELLING?</label>
                    {isPrefilled('productName') && <span style={s({ background: 'rgba(6,182,212,0.1)', color: '#0891b2', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 50, padding: '1px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700 })}>✓ From Offer Creation</span>}
                    {editedFields.has('productName') && <span style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' })}>✏️ Edited</span>}
                  </div>
                  <input value={funnelBrief.productName} onChange={e => { setFunnelBrief(p => ({ ...p, productName: e.target.value })); markFieldEdited('productName'); }}
                    placeholder="e.g. 'LinkedIn Client Acquisition Guide for Indian Developers'"
                    style={s({ width: '100%', fontFamily: 'DM Sans', fontSize: 13.5, color: '#0f172a', background: isPrefilled('productName') ? 'rgba(6,182,212,0.03)' : '#f8fafc', border: isPrefilled('productName') ? '1.5px solid rgba(6,182,212,0.4)' : '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', outline: 'none', marginTop: 6 })} />
                </div>
                {/* Field 2 */}
                <div style={s({ marginBottom: 20 })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                    <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#06b6d4', letterSpacing: '0.04em' })}>02 · DESCRIBE YOUR OFFER</label>
                    {isPrefilled('offer') && <span style={s({ background: 'rgba(6,182,212,0.1)', color: '#0891b2', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 50, padding: '1px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700 })}>✓ From Offer Creation</span>}
                    {editedFields.has('offer') && <span style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' })}>✏️ Edited</span>}
                  </div>
                  <textarea value={funnelBrief.offer} onChange={e => { setFunnelBrief(p => ({ ...p, offer: e.target.value })); markFieldEdited('offer'); }}
                    placeholder="e.g. 'A ₹997 guide + 3 templates + 30-day money back guarantee...'"
                    style={s({ width: '100%', minHeight: 80, fontFamily: 'DM Sans', fontSize: 13.5, color: '#0f172a', background: isPrefilled('offer') ? 'rgba(6,182,212,0.03)' : '#f8fafc', border: isPrefilled('offer') ? '1.5px solid rgba(6,182,212,0.4)' : '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', outline: 'none', marginTop: 6, resize: 'vertical' as any })} />
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 4 })}>Paste from your Offer Creation output, or describe it here</p>
                </div>
                {/* Field 3 */}
                <div style={s({ marginBottom: 20 })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                    <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#06b6d4', letterSpacing: '0.04em' })}>03 · WHO IS YOUR BUYER?</label>
                    {isPrefilled('audience') && <span style={s({ background: 'rgba(6,182,212,0.1)', color: '#0891b2', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 50, padding: '1px 8px', fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700 })}>✓ From Offer Creation</span>}
                    {editedFields.has('audience') && <span style={s({ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' })}>✏️ Edited</span>}
                  </div>
                  <input value={funnelBrief.audience} onChange={e => { setFunnelBrief(p => ({ ...p, audience: e.target.value })); markFieldEdited('audience'); }}
                    placeholder="e.g. 'Indian software developers with 2-5 years experience wanting to freelance'"
                    style={s({ width: '100%', fontFamily: 'DM Sans', fontSize: 13.5, color: '#0f172a', background: isPrefilled('audience') ? 'rgba(6,182,212,0.03)' : '#f8fafc', border: isPrefilled('audience') ? '1.5px solid rgba(6,182,212,0.4)' : '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', outline: 'none', marginTop: 6 })} />
                </div>
                {/* Field 4 — Goal */}
                <div style={s({ marginBottom: 20 })}>
                  <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#06b6d4', letterSpacing: '0.04em' })}>04 · WHAT'S YOUR PRIMARY GOAL?</label>
                  <div style={s({ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
                    {GOAL_OPTIONS.map(g => (
                      <button key={g.value} onClick={() => setFunnelBrief(p => ({ ...p, goal: g.value }))}
                        style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, padding: '8px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: funnelBrief.goal === g.value ? g.accent : '#f1f5f9', color: funnelBrief.goal === g.value ? 'white' : '#64748b' })}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                  {/* Smart goal hint */}
                  {getGoalHint() && (
                    <div style={s({ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginTop: 10, fontFamily: 'DM Sans', fontSize: 12, color: '#92400e', animation: 'fadeIn 0.3s ease' })}>
                      {getGoalHint()}
                    </div>
                  )}
                </div>
                {/* Field 5 — Traffic Sources (new design) */}
                <div style={s({ marginBottom: 20 })}>
                  <label style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: '#06b6d4', letterSpacing: '0.04em', textTransform: 'uppercase' })}>05 · WHERE WILL YOUR TRAFFIC COME FROM?</label>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 10 })}>Pick up to 3 traffic sources</p>
                  <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 })}>
                    {TRAFFIC_SOURCES.map(ts => {
                      const sel = funnelBrief.trafficSources.includes(ts.name);
                      return (
                        <div key={ts.id} onClick={() => toggleTrafficSource(ts.name)}
                          style={s({
                            borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                            border: `1.5px solid ${sel ? ts.color : '#f1f5f9'}`,
                            background: sel ? ts.lightBg : 'white',
                            boxShadow: sel ? `0 4px 16px ${ts.color}25` : 'none',
                            transition: 'all 0.18s', position: 'relative',
                            display: 'flex', gap: 12, alignItems: 'center',
                          })}
                          onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = `${ts.color}66`; e.currentTarget.style.background = ts.lightBg; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; } }}>
                          <div style={s({ width: 38, height: 38, borderRadius: '50%', background: sel ? ts.color : ts.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, transition: 'all 0.18s' })}>
                            {ts.icon}
                          </div>
                          <div>
                            <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: sel ? ts.color : '#0f172a' })}>{ts.name}</div>
                            <div style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 })}>{ts.description}</div>
                          </div>
                          {sel && (
                            <div style={s({ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: ts.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 800 })}>✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <style>{`@keyframes ctaPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(6,182,212,0.3); } 50% { box-shadow: 0 4px 32px rgba(6,182,212,0.55), 0 0 0 4px rgba(6,182,212,0.1); } }`}</style>
              <div style={s({ marginTop: 28, borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 })}>
                <span style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: canGenerate ? '#0d7a5f' : '#64748b', textAlign: 'center', transition: 'all 0.3s' })}>
                  {getValidationMessage()}
                </span>
                <button onClick={generateFunnel} disabled={!canGenerate}
                  style={s({ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: canGenerate ? 'pointer' : 'not-allowed', opacity: canGenerate ? 1 : 0.45, boxShadow: '0 4px 20px rgba(6,182,212,0.35)', transition: 'all 0.15s', ...(shouldPulse ? { animation: 'ctaPulse 2s ease-in-out infinite' } : {}) })}>
                  🗺 Map My Funnel →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───────── RENDER: GENERATING ───────── */
  if (funnelStep === 'generating') {
    return (
      <div style={s({ animation: 'fadeUp 0.4s ease' })}>
        <StepProgressBar currentStep={0} />
        <div style={s({ textAlign: 'center', padding: '60px 20px' })}>
          <span style={s({ fontSize: 56, display: 'block', animation: 'float 2s ease-in-out infinite' })}>🗺</span>
          <h2 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginTop: 20 })}>Mapping your funnel...</h2>
          <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 8 })}>Designing the buyer journey for {chosenType?.name}...</p>
          <div style={s({ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340, margin: '28px auto 0' })}>
            {loadingTexts.map((t, i) => (
              <div key={i} style={s({ fontFamily: 'DM Sans', fontSize: 13, color: i <= loadingTextIdx ? '#0f172a' : '#cbd5e1', fontWeight: i === loadingTextIdx ? 700 : 400, transition: 'all 0.3s', display: 'flex', gap: 8, alignItems: 'center' })}>
                <span style={s({ width: 18, height: 18, borderRadius: '50%', background: i < loadingTextIdx ? '#e6f4ed' : i === loadingTextIdx ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: i < loadingTextIdx ? '#0d7a5f' : 'white', flexShrink: 0 })}>
                  {i < loadingTextIdx ? '✓' : i === loadingTextIdx ? '⟳' : ''}
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ───────── RENDER: COPY PANEL (full view) ───────── */
  if (funnelStep === 'copy-panel' && copyViewStep) {
    const copy = stepCopy[copyViewStep.stepId];
    if (!copy) { setFunnelStep('visualizer'); return null; }
    const allText = [copy.headline, copy.subheadline, copy.openingHook, ...copy.bodyParagraphs, ...copy.bulletPoints.map(b => `→ ${b}`), `CTA: ${copy.ctaText}`, copy.ctaSupportingLine, copy.closingStatement, copy.emailCopy?.body || '', copy.platformNotes].filter(Boolean).join('\n\n');

    return (
      <div style={s({ animation: 'fadeUp 0.4s ease' })}>
        <StepProgressBar currentStep={2} />
        <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
          <span onClick={() => setFunnelStep('visualizer')} style={s({ cursor: 'pointer', fontWeight: 500 })}>Funnel Builder</span> / <span>Funnel Map</span> / <span style={s({ fontWeight: 700, color: '#0f172a' })}>{copyViewStep.stepName} Copy</span>
        </div>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 })}>
          <span onClick={() => setFunnelStep('visualizer')} style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#06b6d4', cursor: 'pointer' })}>← Back to Funnel Map</span>
        </div>
        <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', marginBottom: 24 })}>{copyViewStep.stepIcon} {copyViewStep.stepName} — Copy</h1>

        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 })}>
          {/* Headlines */}
          <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.95)' })}>
            <div style={s({ height: 6, background: safeAccent(copyViewStep.accentColor) })} />
            <div style={s({ padding: 20 })}>
              <h3 style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: '#0f172a', marginBottom: 8 })}>{copy.headline}</h3>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 15, color: '#64748b', marginBottom: 12 })}>{copy.subheadline}</p>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.75 })}>{copy.openingHook}</p>
              <div style={s({ marginTop: 12 })}><CopyButton text={`${copy.headline}\n${copy.subheadline}\n\n${copy.openingHook}`} /></div>
            </div>
          </div>
          {/* Body */}
          <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)' })}>
            <h4 style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 })}>Body Copy</h4>
            {copy.bodyParagraphs.map((p, i) => <p key={i} style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.8, marginBottom: 12 })}>{p}</p>)}
            {copy.bulletPoints.map((b, i) => <div key={i} style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', marginBottom: 6 })}>→ {b}</div>)}
            <div style={s({ marginTop: 12 })}><CopyButton text={[...copy.bodyParagraphs, '', ...copy.bulletPoints.map(b => `→ ${b}`)].join('\n\n')} /></div>
          </div>
          {/* CTA */}
          <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)' })}>
            <h4 style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 })}>Call to Action</h4>
            <button style={s({ width: '100%', background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 14, padding: 16, fontFamily: 'Sora', fontWeight: 800, fontSize: 16, textAlign: 'center', cursor: 'default', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' })}>{copy.ctaText}</button>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', textAlign: 'center', marginTop: 8 })}>{copy.ctaSupportingLine}</p>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#334155', marginTop: 12 })}>{copy.closingStatement}</p>
            <div style={s({ marginTop: 12 })}><CopyButton text={`${copy.ctaText}\n${copy.ctaSupportingLine}\n\n${copy.closingStatement}`} /></div>
          </div>
          {/* Email (if applicable) */}
          {copy.emailCopy?.body && (
            <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)' })}>
              <h4 style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 })}>📧 Email Copy</h4>
              <div style={s({ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 })}>
                <span style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: '#92400e' })}>Subject: {copy.emailCopy.subject}</span>
              </div>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 8 })}>Preview: {copy.emailCopy.previewText}</p>
              <div style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' })}>{copy.emailCopy.body}</div>
              <div style={s({ marginTop: 12 })}><CopyButton text={`Subject: ${copy.emailCopy.subject}\n\n${copy.emailCopy.body}`} /></div>
            </div>
          )}
          {/* Platform Notes */}
          <div style={s({ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 16, padding: 20 })}>
            <h4 style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0891b2', marginBottom: 8 })}>🛠 Platform Tips</h4>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.7 })}>{copy.platformNotes}</p>
          </div>
        </div>

        <div style={s({ marginTop: 24 })}>
          <CopyButton text={allText} />
        </div>
      </div>
    );
  }

  /* ───────── RENDER: EMAILS ───────── */
  if (funnelStep === 'emails') {
    const emailSeries = emailTab === 'welcome' ? emailSequence?.welcomeSeries : emailTab === 'sales' ? emailSequence?.salesSeries : emailSequence?.postPurchaseSeries;
    const seriesLabel = emailTab === 'welcome' ? 'Welcome' : emailTab === 'sales' ? 'Sales' : 'Post-Purchase';

    return (
      <div style={s({ animation: 'fadeUp 0.4s ease' })}>
        <StepProgressBar currentStep={2} />
        <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
          <span onClick={() => setFunnelStep('visualizer')} style={s({ cursor: 'pointer', fontWeight: 500 })}>Funnel Builder</span> / <span style={s({ fontWeight: 700, color: '#0f172a' })}>Email Sequence</span>
        </div>
        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 })}>
          <div>
            <span onClick={() => setFunnelStep('visualizer')} style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#06b6d4', cursor: 'pointer' })}>← Back to Funnel Map</span>
            <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 8 })}>Email Sequence</h1>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 })}>AI-written email sequence for your complete funnel</p>
          </div>
          {!emailSequence && (
            <button onClick={generateEmails} disabled={generatingEmails}
              style={s({ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 14, padding: '11px 22px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: generatingEmails ? 0.6 : 1, boxShadow: '0 4px 20px rgba(6,182,212,0.35)' })}>
              {generatingEmails ? '⟳ Generating...' : '🤖 Generate Email Sequence →'}
            </button>
          )}
          {emailSequence && (
            <button onClick={generateEmails} disabled={generatingEmails}
              style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 16px', cursor: 'pointer' })}>
              🔄 Regenerate
            </button>
          )}
        </div>

        {error && (
          <div style={s({ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontFamily: 'DM Sans', fontSize: 13, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span>⚠️ {error}</span>
            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <button onClick={() => { setError(null); generateEmails(); }} style={s({ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' })}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🔄 Try Again</button>
              <button onClick={() => setError(null)} style={s({ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 })}>✕</button>
            </div>
          </div>
        )}

        {!emailSequence && !generatingEmails && (
          <div style={s({ textAlign: 'center', padding: '60px 40px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.95)' })}>
            <span style={s({ fontSize: 56, display: 'block', animation: 'float 2s ease-in-out infinite' })}>📧</span>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginTop: 16 })}>Generate Your Email Sequence</h2>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 8, maxWidth: 400, lineHeight: 1.7, margin: '8px auto 0' })}>AI writes every email in your funnel — welcome, nurture, sales, and follow-up sequences.</p>
            <button onClick={generateEmails} style={s({ marginTop: 24, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 14, padding: '13px 28px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' })}>
              🤖 Generate Email Sequence →
            </button>
          </div>
        )}

        {generatingEmails && (
          <div style={s({ textAlign: 'center', padding: '60px 20px' })}>
            <span style={s({ fontSize: 56, display: 'block', animation: 'float 2s ease-in-out infinite' })}>📧</span>
            <h2 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginTop: 20 })}>Writing your emails...</h2>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 8 })}>Crafting 8 conversion-optimized emails...</p>
          </div>
        )}

        {emailSequence && (
          <>
            {/* Summary */}
            <div style={s({ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 })}>
              <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0891b2', textTransform: 'uppercase', marginBottom: 6 })}>📧 Your Sequence Strategy:</div>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.7 })}>{emailSequence.sequenceSummary}</p>
            </div>

            {/* Tabs */}
            <div style={s({ display: 'flex', gap: 4, marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: 4, width: 'fit-content' })}>
              {[
                { key: 'welcome' as const, label: `💌 Welcome (${emailSequence.welcomeSeries?.length || 0})` },
                { key: 'sales' as const, label: `💰 Sales (${emailSequence.salesSeries?.length || 0})` },
                { key: 'postPurchase' as const, label: `✅ Post-Purchase (${emailSequence.postPurchaseSeries?.length || 0})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setEmailTab(tab.key)}
                  style={s({ fontFamily: 'DM Sans', fontWeight: emailTab === tab.key ? 700 : 500, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: emailTab === tab.key ? 'white' : 'transparent', color: emailTab === tab.key ? '#0891b2' : '#64748b', boxShadow: emailTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' })}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Email Cards */}
            {emailSeries?.map((email, i) => {
              const key = `${emailTab}-${i}`;
              const expanded = expandedEmails[key];
              return (
                <div key={i} style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, marginBottom: 12, border: '1px solid rgba(255,255,255,0.95)' })}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 })}>
                    <div>
                      <span style={s({ fontSize: 11, fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#0891b2', padding: '3px 10px', borderRadius: 50, fontFamily: 'Sora' })}>Day {email.day}</span>
                      <p style={s({ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 3 })}>Sends: {email.triggerEvent}</p>
                    </div>
                    <CopyButton text={`Subject: ${email.subject}\n\n${email.body}\n\nP.S. ${email.ps}`} />
                  </div>
                  <div style={s({ marginBottom: 8 })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' })}>SUBJECT</div>
                    <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 15, color: '#0f172a', marginTop: 3 })}>{email.subject}</div>
                  </div>
                  <div style={s({ marginBottom: 14 })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' })}>PREVIEW TEXT</div>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', fontStyle: 'italic' })}>{email.previewText}</div>
                  </div>
                  <div>
                    {!expanded && (
                      <>
                        <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#334155', lineHeight: 1.6 })}>{(email.body || '').slice(0, 200)}...</p>
                        <span onClick={() => setExpandedEmails(p => ({ ...p, [key]: true }))} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#06b6d4', cursor: 'pointer', fontWeight: 600 })}>Read full email ↓</span>
                      </>
                    )}
                    {expanded && (
                      <>
                        <div style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' })}>{email.body}</div>
                        <span onClick={() => setExpandedEmails(p => ({ ...p, [key]: false }))} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#06b6d4', cursor: 'pointer', fontWeight: 600, display: 'block', marginTop: 8 })}>Read less ↑</span>
                      </>
                    )}
                  </div>
                  <div style={s({ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' })}>
                    <button style={s({ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'Sora', fontWeight: 700, fontSize: 12, cursor: 'default' })}>{email.cta}</button>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' })}>P.S. {email.ps}</span>
                  </div>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 11.5, color: '#64748b', fontStyle: 'italic', marginTop: 10 })}>✍️ Tone: {email.toneNotes}</p>
                </div>
              );
            })}

            {/* Copy All Emails */}
            <div style={s({ display: 'flex', gap: 12, marginTop: 16 })}>
              <CopyButton text={(emailSeries || []).map((e, i) => `--- Email ${i + 1}: ${e.subject} ---\n\n${e.body}\n\nP.S. ${e.ps}`).join('\n\n')} />
              <button onClick={() => {
                const all = [...(emailSequence.welcomeSeries || []), ...(emailSequence.salesSeries || []), ...(emailSequence.postPurchaseSeries || [])];
                navigator.clipboard.writeText(all.map((e, i) => `=== ${e.seriesName} - Email ${e.emailNumber} (Day ${e.day}) ===\nSubject: ${e.subject}\n\n${e.body}\n\nCTA: ${e.cta}\nP.S. ${e.ps}`).join('\n\n'));
              }}
                style={s({ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 12, padding: '11px 22px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(6,182,212,0.3)' })}>
                📋 Export Full Sequence
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ───────── RENDER: VISUALIZER ───────── */
  if (funnelStep === 'visualizer' && funnelData) {
    const selStep = funnelData.steps?.find(st => st.stepId === selectedStep);
    const hasCopyGenerated = Object.keys(stepCopy).length > 0;
    const isComplete = hasCopyGenerated && emailSequence;

    return (
      <div style={s({ animation: 'fadeUp 0.4s ease' })}>
        {/* Header */}
        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 })}>
          <div>
            <div style={s({ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 })}>
              <span onClick={onBack} style={s({ cursor: 'pointer', fontWeight: 500 })}>Dashboard</span> / <span style={s({ fontWeight: 700, color: '#0f172a' })}>Funnel Builder</span>
            </div>
            <h1 style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 26, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 4 })}>Funnel Builder</h1>
            <p style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#64748b', marginTop: 3 })}>Design your complete sales system — from first touch to final sale.</p>
            {credits.lastCallByok && credits.lastCallProvider && (
              <div style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(13,122,95,0.08)', border: '1px solid rgba(13,122,95,0.2)', borderRadius: 50, padding: '4px 12px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#0d7a5f', marginTop: 6 })}>
                🔑 Generated with your {credits.lastCallProvider === 'anthropic' ? 'Claude' : credits.lastCallProvider === 'openai' ? 'GPT-4o' : 'Gemini'} key · No credits used
              </div>
            )}
          </div>
          <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
            {chosenType && <span style={s({ fontSize: 11, fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#0891b2', padding: '4px 12px', borderRadius: 50 })}>🔀 {chosenType.name}</span>}
            <button onClick={() => saveItem({ tool: 'funnel_builder', item_type: 'funnel_map', title: funnelData.funnelName, summary: funnelData.funnelTagline, full_data: { brief: funnelBrief, funnel: funnelData } })}
              style={s({ background: isSaved('funnel_builder', 'funnel_map', funnelData.funnelName) ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : 'none', border: isSaved('funnel_builder', 'funnel_map', funnelData.funnelName) ? 'none' : '1px solid #e2e8f0', borderRadius: 50, padding: '5px 14px', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: isSaved('funnel_builder', 'funnel_map', funnelData.funnelName) ? 'white' : '#64748b', cursor: 'pointer', opacity: isSaving('funnel_builder', 'funnel_map', funnelData.funnelName) ? 0.5 : 1, transition: 'all 0.2s' })}>
              {isSaved('funnel_builder', 'funnel_map', funnelData.funnelName) ? '🔖 Saved' : '🔖 Save Funnel'}
            </button>
            <button onClick={() => exportFunnelPDF(funnelData, stepCopy, emailSequence, credits.currentUser?.email || 'User')}
              style={s({ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg,#0284c7,#0891b2)', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, boxShadow: '0 2px 8px rgba(2,132,199,0.25)' })}>
              ⬇ Export PDF
            </button>
            <span onClick={() => setFunnelStep('brief')} style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 12px', borderRadius: 8 })}>← Edit Brief</span>
            <button onClick={() => setFunnelStep('emails')} style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: 'white', background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' })}>📧 Email Sequence</button>
          </div>
        </div>

        <StepProgressBar currentStep={1} />

        {error && (
          <div style={s({ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontFamily: 'DM Sans', fontSize: 13, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span>⚠️ {error}</span>
            <div style={s({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <button onClick={() => setError(null)} style={s({ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' })}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>✕ Dismiss</button>
            </div>
          </div>
        )}

        {/* Two column layout */}
        <div style={s({ display: 'flex', gap: 24, alignItems: 'flex-start' })}>
          {/* LEFT — Funnel Flowchart */}
          <div style={s({ width: 420, flexShrink: 0, position: 'sticky', top: 24, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' })}>
            {/* Funnel header card */}
            <div style={s({ background: 'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(59,130,246,0.06))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 })}>
              <div style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 6 })}>{funnelData.funnelName}</div>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 14 })}>{funnelData.funnelTagline}</p>
              <div style={s({ display: 'flex', gap: 8, flexWrap: 'wrap' })}>
                <span style={s({ fontSize: 11, fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#0891b2', padding: '6px 14px', borderRadius: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' })}>🎯 {funnelData.estimatedConversionRate}</span>
                <span style={s({ fontSize: 11, fontWeight: 700, background: 'rgba(13,122,95,0.1)', color: '#0d7a5f', padding: '6px 14px', borderRadius: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' })}>⏱ {funnelData.estimatedTimeToLaunch}</span>
                <span style={s({ fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#b45309', padding: '6px 14px', borderRadius: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' })}>💰 {funnelData.estimatedMonthlyRevenue}/mo</span>
              </div>
            </div>

            {/* Steps */}
            {funnelData.steps.map((step, i) => (
              <div key={step.stepId} style={s({ marginBottom: i < funnelData.steps.length - 1 ? 0 : 0 })}>
                <div onClick={() => setSelectedStep(selectedStep === step.stepId ? null : step.stepId)}
                  style={s({
                    width: '100%', borderRadius: 14, padding: '20px 20px 18px 20px', cursor: 'pointer',
                    background: selectedStep === step.stepId ? 'white' : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)',
                    border: `2px solid ${selectedStep === step.stepId ? safeAccent(step.accentColor) : '#e2e8f0'}`,
                    boxShadow: selectedStep === step.stepId ? `0 4px 20px ${safeAccent(step.accentColor)}25` : 'none',
                    transition: 'all 0.2s',
                  })}
                  onMouseEnter={e => { if (selectedStep !== step.stepId) e.currentTarget.style.borderColor = `${safeAccent(step.accentColor)}50`; }}
                  onMouseLeave={e => { if (selectedStep !== step.stepId) e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 })}>
                    <div style={s({ display: 'flex', gap: 12, alignItems: 'center' })}>
                      <div style={s({ width: 36, height: 36, borderRadius: '50%', background: safeAccent(step.accentColor), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 900, fontSize: 14, color: 'white', flexShrink: 0, boxShadow: `0 3px 10px ${safeAccent(step.accentColor)}50` })}>{step.stepNumber}</div>
                      <span style={s({ fontSize: 16 })}>{step.stepIcon}</span>
                      <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14.5, color: '#0f172a' })}>{step.stepName}</span>
                    </div>
                    <div style={s({ display: 'flex', gap: 6, alignItems: 'center' })}>
                      {step.emailTriggered && <span style={s({ width: 20, height: 20, borderRadius: '50%', background: '#ede9fe', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>📧</span>}
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: safeAccent(step.accentColor), background: `${safeAccent(step.accentColor)}12`, padding: '2px 7px', borderRadius: 50 })}>{step.conversionBenchmark}</span>
                    </div>
                  </div>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{step.goal}</p>
                  <div style={s({ paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' })}>
                    <p style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 800, color: safeAccent(step.accentColor) })}>CTA: {step.primaryCTA}</p>
                  </div>
                </div>
                {/* Connecting arrow */}
                {i < funnelData.steps.length - 1 && (
                  <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 40, justifyContent: 'center' })}>
                    <svg height="28" width="3"><line x1="1.5" y1="0" x2="1.5" y2="28" stroke={safeAccent(step.accentColor)} strokeWidth="3" strokeDasharray="6 4" opacity="0.4" /></svg>
                    <span style={s({ fontSize: 13, color: funnelData.steps[i + 1]?.accentColor || '#94a3b8', lineHeight: 1, marginTop: -4 })}>▼</span>
                  </div>
                )}
              </div>
            ))}

            {/* Actions */}
            <div style={s({ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 })}>
              <div onClick={() => setShowAddStep(true)} style={s({ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 10, textAlign: 'center', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' })}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.color = '#06b6d4'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; }}>
                + Add Step
              </div>
              <button onClick={() => { setFunnelStep('brief'); }} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' })}>🔄 Regenerate Funnel</button>
            </div>
          </div>

          {/* RIGHT — Detail Panel */}
          <div style={s({ flex: 1, minWidth: 0, padding: 28, background: 'rgba(255,255,255,0.5)', borderRadius: 20, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' })}
            className="funnel-detail-scroll">
            {!selStep ? (
              /* Default — Funnel Summary */
              <div style={s({ animation: 'fadeUp 0.3s ease' })}>
                <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)', marginBottom: 16 })}>
                  <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 12 })}>⚡ Quick Wins</h3>
                  {funnelData.quickWins?.map((w, i) => (
                    <div key={i} style={s({ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' })}>
                      <span style={s({ width: 18, height: 18, borderRadius: '50%', background: '#e6f4ed', color: '#0d7a5f', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>✓</span>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#334155', lineHeight: 1.6 })}>{w}</span>
                    </div>
                  ))}
                </div>

                {/* Tool Stack */}
                <div style={s({ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)', marginBottom: 16 })}>
                  <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 12 })}>🛠 Recommended Tool Stack</h3>
                  <div style={s({ borderRadius: 10, overflow: 'hidden', border: '1px solid #f1f5f9' })}>
                    <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', background: '#f8fafc', padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' })}>
                      <span>Purpose</span><span>Recommended</span><span>Alternative</span><span>Cost</span>
                    </div>
                    {funnelData.toolStack?.map((t, i) => (
                      <div key={i} style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 13, color: '#334155', background: i % 2 ? '#f8fafc' : 'white', borderTop: '1px solid #f1f5f9' })}>
                        <span>{t.purpose}</span><span style={s({ fontWeight: 600 })}>{t.recommended}</span><span>{t.alternative}</span><span>{t.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setFunnelStep('emails')} style={s({ width: '100%', background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 14, padding: '13px 20px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' })}>
                  📧 Generate Email Sequence →
                </button>

                <p style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' })}>Click any funnel step on the left to view details & generate copy</p>
              </div>
            ) : (
              /* Step Detail */
              <div style={s({ animation: 'fadeUp 0.3s ease' })}>
                {/* Panel Header */}
                <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' })}>
                  <div style={s({ display: 'flex', gap: 10, alignItems: 'center' })}>
                    <span style={s({ fontSize: 28 })}>{selStep.stepIcon}</span>
                    <span style={s({ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a' })}>{selStep.stepName}</span>
                    <span style={s({ fontSize: 10, fontWeight: 700, background: `${safeAccent(selStep.accentColor)}15`, color: safeAccent(selStep.accentColor), padding: '3px 10px', borderRadius: 50 })}>{selStep.stepType}</span>
                  </div>
                  <span onClick={() => setSelectedStep(null)} style={s({ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', cursor: 'pointer' })}>✕ Close</span>
                </div>

                {/* 4 info cards */}
                <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 })}>
                  {[
                    { icon: '🎯', label: 'GOAL', value: selStep.goal },
                    { icon: '📊', label: 'CONVERSION', value: selStep.conversionBenchmark },
                    { icon: '⏱', label: 'TIME ON PAGE', value: selStep.timeOnStep },
                    { icon: '✍️', label: 'FRAMEWORK', value: selStep.copyFramework },
                  ].map(card => (
                    <div key={card.label} style={s({ background: `${safeAccent(selStep.accentColor)}08`, border: `1px solid ${safeAccent(selStep.accentColor)}20`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', borderBottom: `3px solid ${safeAccent(selStep.accentColor)}` })}>
                      <div style={s({ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, color: safeAccent(selStep.accentColor), textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 })}>{card.icon} {card.label}</div>
                      <div style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#0f172a', lineHeight: 1.65 })}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* What happens here */}
                <div style={s({ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 16, padding: '18px 20px', marginBottom: 22 })}>
                  <div style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', marginBottom: 10 })}>WHAT HAPPENS AT THIS STEP</div>
                  <p style={s({ fontFamily: 'DM Sans', fontSize: 14, color: '#334155', lineHeight: 1.85 })}>{selStep.whatHappensHere}</p>
                </div>

                {/* Email trigger */}
                {selStep.emailTriggered && (
                  <div style={s({ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.05))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 22, display: 'flex', gap: 12, alignItems: 'center' })}>
                    <span style={s({ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 })}>📧</span>
                    <div style={s({ marginLeft: 0 })}>
                      <span style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, color: '#7c3aed', display: 'block', marginBottom: 4 })}>Automated Email Triggered</span>
                      {selStep.emailSubject && <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#475569', lineHeight: 1.6 })}>{selStep.emailSubject}</p>}
                    </div>
                  </div>
                )}

                {/* Mistakes */}
                {selStep.mistakesToAvoid?.length > 0 && (
                  <div style={s({ marginBottom: 22 })}>
                    <div style={s({ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 })}>⚠ COMMON MISTAKES AT THIS STEP</div>
                    {selStep.mistakesToAvoid.map((m, i) => (
                      <div key={i} style={s({ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' })}>
                        <span style={s({ width: 20, height: 20, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Sora', fontSize: 10, fontWeight: 900, color: '#ef4444' })}>!</span>
                        <span style={s({ fontFamily: 'DM Sans', fontSize: 13.5, color: '#334155', lineHeight: 1.7 })}>{m}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Platform */}
                <div style={s({ background: 'linear-gradient(135deg, rgba(8,145,178,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 22, display: 'flex', gap: 12, alignItems: 'center' })}>
                  <span style={s({ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 })}>🛠</span>
                  <div>
                    <div style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 })}>Build with:</div>
                    <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, color: '#0f172a', lineHeight: 1.6 })}>{selStep.platformRecommendation}</div>
                  </div>
                </div>

                {/* Generate Copy Button */}
                {stepCopy[selStep.stepId] ? (
                  <div>
                    <div style={s({ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 })}>
                      <span style={s({ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: '#0d7a5f' })}>✓ Copy Generated</span>
                      <span onClick={() => generateStepCopy(selStep)} style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#06b6d4', cursor: 'pointer' })}>🔄 Regenerate</span>
                    </div>
                    {/* Preview */}
                    <div style={s({ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginTop: 12 })}>
                      <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#334155', lineHeight: 1.6 })}>
                        {stepCopy[selStep.stepId].headline} — {(stepCopy[selStep.stepId].openingHook || '').slice(0, 200)}...
                      </p>
                      <span onClick={() => { setCopyViewStep(selStep); setFunnelStep('copy-panel'); }} style={s({ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, color: '#06b6d4', cursor: 'pointer', display: 'block', textAlign: 'right', marginTop: 8 })}>View Full Copy →</span>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => generateStepCopy(selStep)} disabled={generatingCopy === selStep.stepId}
                    style={s({ width: '100%', background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'Sora', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: generatingCopy === selStep.stepId ? 0.6 : 1, boxShadow: '0 5px 22px rgba(6,182,212,0.4)', marginTop: 4, transition: 'all 0.15s' })}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(6,182,212,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 5px 22px rgba(6,182,212,0.4)'; }}>
                    {generatingCopy === selStep.stepId ? '⟳ Writing copy...' : '✍️ Generate Copy for This Step →'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion banner */}
        {isComplete && (
          <div style={s({ background: 'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(59,130,246,0.06))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: '18px 24px', marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 })}>
            <div>
              <div style={s({ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' })}>🎉 Funnel complete! Your {chosenType?.name} is mapped and copy is ready.</div>
              <p style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 })}>Take your funnel to the next module and build your product.</p>
            </div>
            <div style={s({ display: 'flex', gap: 10 })}>
              <button onClick={() => { setFunnelStep('brief'); setFunnelData(null); setStepCopy({}); setEmailSequence(null); setSelectedStep(null); }}
                style={s({ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 20px', cursor: 'pointer' })}>
                🔄 Build New Funnel
              </button>
              <button onClick={() => setError('Product Creator is coming soon!')}
                style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: 'white', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: 12, padding: '11px 22px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' })}>
                → Product Creator
              </button>
            </div>
          </div>
        )}

        {/* Add Step Modal */}
        {showAddStep && (
          <div onClick={() => setShowAddStep(false)} style={s({ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.5)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
            <div onClick={e => e.stopPropagation()} style={s({ maxWidth: 360, width: '90%', background: 'white', borderRadius: 20, padding: 24, animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' })}>
              <h3 style={s({ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 16 })}>Add a Funnel Step</h3>
              <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 })}>
                {STEP_TYPES_FOR_ADD.map(st => (
                  <div key={st.type} onClick={() => setNewStepType(st.type)}
                    style={s({ borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'center', border: `2px solid ${newStepType === st.type ? '#06b6d4' : '#e2e8f0'}`, background: newStepType === st.type ? 'rgba(6,182,212,0.06)' : '#f8fafc', transition: 'all 0.15s' })}>
                    <span style={s({ fontSize: 20, display: 'block' })}>{st.emoji}</span>
                    <span style={s({ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, color: '#0f172a', marginTop: 4, display: 'block' })}>{st.name}</span>
                  </div>
                ))}
              </div>
              <input value={newStepName} onChange={e => setNewStepName(e.target.value)} placeholder="Name this step" style={s({ width: '100%', fontFamily: 'DM Sans', fontSize: 13, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none', marginBottom: 16 })} />
              <div style={s({ display: 'flex', gap: 10 })}>
                <button onClick={addStep} disabled={!newStepType || !newStepName.trim()}
                  style={s({ flex: 1, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: newStepType && newStepName.trim() ? 1 : 0.45 })}>
                  Add to Funnel →
                </button>
                <button onClick={() => setShowAddStep(false)} style={s({ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' })}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
