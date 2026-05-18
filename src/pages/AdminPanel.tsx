import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import SecurityTab from '@/components/AdminSecurityTab';
import AdminCreditsTab from '@/components/AdminCreditsTab';
import AdminTrialTab from '@/components/AdminTrialTab';
import AdminActivityLogTab from '@/components/AdminActivityLogTab';
import AdminAISettingsTab from '@/components/AdminAISettingsTab';
import AdminIpLookupModal from '@/components/AdminIpLookupModal';
import { useAdminRole, canDo, roleMeta, type AdminRole } from '@/hooks/useAdminRole';
export interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  access_tier: string;
  payment_status: string;
  payment_amount: number;
  is_beta_user: boolean;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  trial_request_id?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Enriched fields
  creditBalance?: number;
  lastSeen?: string | null;
  lastIp?: string | null;
}

interface SignupRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  payment_type: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  notes: string;
  ip_address: string | null;
  user_agent: string | null;
}

const glassCard = {
  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', outline: 'none', boxSizing: 'border-box',
};

const tierColors: Record<string, { bg: string; color: string }> = {
  trial: { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
  basic: { bg: '#dcfce7', color: '#15803d' },
  premium: { bg: '#ede9fe', color: '#7c3aed' },
  beta: { bg: '#fce7f3', color: '#be185d' },
  revoked: { bg: '#fee2e2', color: '#991b1b' },
};

const tierGradients: Record<string, string> = {
  trial: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  basic: 'linear-gradient(135deg,#059669,#10b981)',
  premium: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  beta: 'linear-gradient(135deg,#ec4899,#c026d3)',
  revoked: 'linear-gradient(135deg,#64748b,#94a3b8)',
};

const popInKeyframes = `
@keyframes popIn { 0% { opacity:0; transform: translate(-50%,-50%) scale(0.9); } 100% { opacity:1; transform: translate(-50%,-50%) scale(1); } }
@keyframes spinSlow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeInToast { 0% { opacity:0; transform: translateX(-50%) translateY(10px); } 100% { opacity:1; transform: translateX(-50%) translateY(0); } }
@keyframes pulseDot { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 70%{box-shadow:0 0 0 8px rgba(16,185,129,0)} }
`;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── ADMIN TOAST ─────────────────────────────────────────────
function AdminToast({ toast, onClose }: { toast: { message: string; type: string } | null; onClose: () => void }) {
  if (!toast) return null;
  const bg = toast.type === 'error' ? '#fee2e2' : toast.type === 'warning' ? '#fef9c3' : '#f0fdf4';
  const border = toast.type === 'error' ? '#fecaca' : toast.type === 'warning' ? '#fde68a' : '#bbf7d0';
  const color = toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#92400e' : '#15803d';
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: bg, border: `1.5px solid ${border}`, borderRadius: 50,
      padding: '10px 20px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13.5, color,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)', minWidth: 280, textAlign: 'center',
      animation: 'fadeInToast 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      {toast.message}
    </div>
  );
}

// ─── DELETE CONFIRMATION MODAL ───────────────────────────────
export function DeleteConfirmModal({ userName, onConfirm, onCancel, deleting }: {
  userName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText === 'DELETE';
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '94%', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
        <div style={{ height: 60, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🗑</span>
          <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>Delete User</span>
        </div>
        <div style={{ background: 'white', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Are you absolutely sure?</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
            This will permanently delete <strong>{userName}</strong>'s account and all their data. This action cannot be undone.
          </div>
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', textAlign: 'left', marginBottom: 20 }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>The following will be permanently removed:</div>
            <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.8 }}>
              ✗ Authentication account (login access revoked)<br/>
              ✗ Profile data, usage history, session records<br/>
              ✗ All tool usage and analytics data
            </div>
          </div>
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Type DELETE to confirm</label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type DELETE here" style={{ ...inputStyle, border: '1.5px solid #fecaca' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '9px 18px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={onConfirm} disabled={!canDelete || deleting} style={{
              background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, padding: '10px 22px',
              fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, cursor: canDelete && !deleting ? 'pointer' : 'not-allowed',
              opacity: canDelete && !deleting ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {deleting && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
              {deleting ? 'Deleting...' : '🗑 Permanently Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT USER MODAL ─────────────────────────────────────────
export function EditUserModal({ user, email, trialStartedAt, onClose, onSave, onDelete, showToast, logActivity }: {
  user: UserRow; email: string; trialStartedAt?: string | null; onClose: () => void; onSave: () => void; onDelete: (id: string, name: string) => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void>;
}) {
  const isTrial = user.access_tier === 'trial';
  // For existing trial users, default duration input to remaining days (min 1, max 90)
  const initialTrialDuration = (() => {
    if (isTrial && user.trial_ends_at) {
      const ms = new Date(user.trial_ends_at).getTime() - Date.now();
      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      return Math.max(1, Math.min(90, days));
    }
    return 7;
  })();
  const [form, setForm] = useState({
    fullName: user.full_name, email, phone: user.phone || '', accessTier: user.access_tier,
    paymentStatus: user.payment_status, paymentAmount: user.payment_amount || 0,
    isBetaUser: user.is_beta_user || false, notes: user.notes || '',
    trialEndsAt: user.trial_ends_at || null,
    trialDurationDays: initialTrialDuration,
  });
  const [originalEmail] = useState(email);
  const [originalTrialEndsAt] = useState<string | null>(user.trial_ends_at || null);
  const [saving, setSaving] = useState(false);
  // sections: [Personal, Trial (if shown), Access, Email]
  const [sections, setSections] = useState<boolean[]>(isTrial ? [true, true, true, false] : [true, true, false]);
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEndEarly, setShowEndEarly] = useState(false);
  const [endingEarly, setEndingEarly] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customDateVal, setCustomDateVal] = useState('');
  const [sendingEmail, setSendingEmail] = useState<Record<string, boolean>>({});

  const dirty = form.fullName !== user.full_name || form.email !== email || form.phone !== (user.phone || '') ||
    form.accessTier !== user.access_tier || form.paymentStatus !== user.payment_status ||
    form.paymentAmount !== (user.payment_amount || 0) || form.isBetaUser !== (user.is_beta_user || false) ||
    form.notes !== (user.notes || '') || form.trialEndsAt !== originalTrialEndsAt;

  const handleClose = () => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return;
    onClose();
  };

  const toggleSection = (i: number) => setSections(s => s.map((v, j) => j === i ? !v : v));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Detect trial state transitions
      const trialExtended = isTrial && form.trialEndsAt !== originalTrialEndsAt;
      const trialUpgraded = isTrial && form.paymentStatus === 'paid' && form.accessTier !== 'trial' && form.accessTier !== 'revoked';
      const switchingToTrial = !isTrial && form.accessTier === 'trial';

      const switchingFromTrial = isTrial && form.accessTier !== 'trial';

      const updatePayload: Record<string, any> = {
        full_name: form.fullName.trim(), phone: form.phone.trim(), access_tier: form.accessTier,
        payment_status: form.paymentStatus, payment_amount: form.paymentAmount || 0,
        is_beta_user: form.isBetaUser, notes: form.notes.trim(), updated_at: new Date().toISOString(),
      };

      let newTrialEndsAt: string | null = null;
      if (switchingToTrial) {
        const days = Math.max(1, Math.min(90, Number(form.trialDurationDays) || 7));
        newTrialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        updatePayload.is_trial = true;
        updatePayload.trial_started_at = new Date().toISOString();
        updatePayload.trial_ends_at = newTrialEndsAt;
      } else if (trialUpgraded) {
        updatePayload.is_trial = false;
        updatePayload.trial_ends_at = new Date().toISOString();
      } else if (switchingFromTrial) {
        // Leaving trial for a non-trial tier (not via the paid-upgrade path) — clear stale trial end
        updatePayload.is_trial = false;
        updatePayload.trial_ends_at = null;
      } else if (trialExtended && form.trialEndsAt) {
        updatePayload.trial_ends_at = form.trialEndsAt;
      }

      await supabase.from('user_profiles').update(updatePayload as any).eq('id', user.id);

      // Mirror to trial_requests so the Trials tab reflects the change instantly
      if (user.trial_request_id && (trialExtended || trialUpgraded || switchingToTrial)) {
        const trUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
        if (trialUpgraded) {
          trUpdate.status = 'upgraded';
          trUpdate.upgraded_at = new Date().toISOString();
          trUpdate.upgraded_to_tier = form.accessTier;
          trUpdate.payment_status = 'paid';
          trUpdate.payment_amount = form.paymentAmount || 0;
        } else if (switchingToTrial && newTrialEndsAt) {
          trUpdate.access_starts_at = new Date().toISOString();
          trUpdate.access_ends_at = newTrialEndsAt;
          trUpdate.status = 'approved';
        } else if (trialExtended && form.trialEndsAt) {
          trUpdate.access_ends_at = form.trialEndsAt;
          trUpdate.status = 'approved';
        }
        await supabase.from('trial_requests').update(trUpdate as any).eq('id', user.trial_request_id);
      }

      // On upgrade, grant 500-credit welcome bonus to the new paid tier
      if (trialUpgraded) {
        try {
          const { data: cur } = await supabase.from('user_credits')
            .select('balance, lifetime_topped').eq('user_id', user.id).maybeSingle();
          const upgradeBonus = 500;
          const newBalance = (cur?.balance || 0) + upgradeBonus;
          const newTopped = (cur?.lifetime_topped || 0) + upgradeBonus;
          await supabase.from('user_credits').update({
            balance: newBalance, lifetime_topped: newTopped, updated_at: new Date().toISOString(),
          }).eq('user_id', user.id);
          await supabase.from('credit_transactions').insert({
            user_id: user.id, user_email: email, type: 'gift',
            amount: upgradeBonus, balance_after: newBalance,
            description: `Upgrade bonus — welcome to ${form.accessTier} tier`,
          } as any);
        } catch (creditErr) {
          console.warn('Upgrade bonus grant failed (non-blocking):', creditErr);
        }
      }

      if (form.email !== originalEmail) {
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
          body: { userId: user.id, newEmail: form.email.toLowerCase().trim() },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
      }

      // Audit logs for trial transitions
      if (trialUpgraded) {
        await logActivity('trial_upgraded', user.id, form.fullName, {
          from_tier: 'trial', to_tier: form.accessTier, amount: form.paymentAmount,
        });
        showToast(`✨ ${form.fullName} upgraded from trial to ${form.accessTier}. Now visible in Users tab.`);
      } else if (trialExtended) {
        await logActivity('trial_extended', user.id, form.fullName, {
          old_end: originalTrialEndsAt, new_end: form.trialEndsAt,
        });
        showToast(`⏱️ Trial extended for ${form.fullName}.`);
      } else {
        await logActivity('user_edited', user.id, form.fullName, {
          tier: form.accessTier, payment: form.paymentStatus,
          ...(form.email !== originalEmail ? { email_changed: form.email } : {}),
        });
        showToast(`✅ ${form.fullName} updated successfully.`);
      }
      onSave();
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEndTrialEarly = async () => {
    setEndingEarly(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('user_profiles').update({
        is_trial: false, trial_ends_at: now, updated_at: now,
      } as any).eq('id', user.id);
      if (user.trial_request_id) {
        await supabase.from('trial_requests').update({
          status: 'expired', access_ends_at: now, updated_at: now,
        } as any).eq('id', user.trial_request_id);
      }
      await logActivity('trial_ended_early', user.id, user.full_name);
      setShowEndEarly(false);
      showToast(`🛑 Trial ended early for ${user.full_name}.`, 'warning');
      onSave();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setEndingEarly(false);
    }
  };

  const extendBy = (days: number) => {
    const base = form.trialEndsAt && new Date(form.trialEndsAt) > new Date() ? new Date(form.trialEndsAt) : new Date();
    const next = new Date(base.getTime() + days * 86400000);
    setForm(f => ({ ...f, trialEndsAt: next.toISOString() }));
  };

  const applyCustomDate = () => {
    if (!customDateVal) return;
    const d = new Date(customDateVal);
    if (isNaN(d.getTime())) { showToast('Invalid date', 'error'); return; }
    if (d.getTime() <= Date.now()) { showToast('Date must be in the future', 'error'); return; }
    setForm(f => ({ ...f, trialEndsAt: d.toISOString() }));
    setCustomDateOpen(false);
  };

  const sendEmail = async (type: string) => {
    setSendingEmail(p => ({ ...p, [type]: true }));
    try {
      if (type === 'access') {
        await supabase.functions.invoke('send-upgrade-email', {
          body: { email: form.email, full_name: form.fullName, access_tier: form.accessTier },
        });
      } else {
        const { data, error } = await supabase.functions.invoke('send-password-reset', {
          body: { user_id: user.id, email: form.email.trim().toLowerCase() },
        });
        if (error) throw new Error(error.message);
        if (data?.sent === false) throw new Error(data?.error || 'Failed to send reset link');
        await logActivity('password_reset_sent', user.id, form.fullName, { context: 'edit_user_modal', sent_at: data?.sent_at || new Date().toISOString() });
      }
      setSendingEmail(p => ({ ...p, [type]: false }));
      setEmailSent(p => ({ ...p, [type]: true }));
      setTimeout(() => setEmailSent(p => ({ ...p, [type]: false })), 4000);
      showToast(type === 'password' ? `🔑 Password reset link sent to ${form.email}` : `✅ Email sent to ${form.email}`);
    } catch (err: any) {
      setSendingEmail(p => ({ ...p, [type]: false }));
      showToast(`❌ Email failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: user.id } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      await logActivity('user_deleted', user.id, user.full_name);
      setShowDelete(false);
      onClose();
      onDelete(user.id, user.full_name);
    } catch (err: any) {
      showToast(`❌ Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const SectionHeader = ({ index, icon, iconBg, iconColor, title, pill }: { index: number; icon: React.ReactNode; iconBg: string; iconColor: string; title: string; pill?: React.ReactNode }) => (
    <div onClick={() => toggleSection(index)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, fontSize: 12 }}>{icon}</div>
        <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{title}</span>
        {pill}
      </div>
      <span style={{ fontSize: 14, color: '#94a3b8', transform: sections[index] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</span>
    </div>
  );

  const paymentStatuses = ['reserved', 'paid', 'beta', 'pending'];
  const paymentLabels: Record<string, string> = { reserved: 'Reserved ₹', paid: 'Full Paid ✓', beta: 'Beta (Free)', pending: 'Pending' };

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '94%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 72, background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: tierGradients[form.accessTier] || tierGradients.basic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: 'white' }}>
                {(form.fullName || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Editing User</div>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>{user.full_name}</div>
              </div>
            </div>
            <button onClick={handleClose} style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ background: 'white', padding: '24px 24px 8px', overflowY: 'auto', flex: 1 }}>
            <SectionHeader index={0} icon="👤" iconBg="#ede9fe" iconColor="#7c3aed" title="Personal Details" />
            {sections[0] && (
              <div style={{ padding: '12px 0' }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Full Name</label>
                  <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                  <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginTop: 6 }}>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#92400e' }}>⚠ Changing email updates authentication.</span>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Admin Notes (Private)</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes — not visible to user" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' } as React.CSSProperties} />
                </div>
              </div>
            )}

            {isTrial && (() => {
              const trialIdx = 1;
              const ms = form.trialEndsAt ? new Date(form.trialEndsAt).getTime() - Date.now() : 0;
              const expired = ms <= 0;
              const pillBg = expired ? '#fee2e2' : ms < 3600000 ? '#fee2e2' : ms < 86400000 ? '#fef3c7' : '#dcfce7';
              const pillColor = expired ? '#991b1b' : ms < 3600000 ? '#991b1b' : ms < 86400000 ? '#92400e' : '#15803d';
              const days = Math.floor(Math.max(0, ms) / 86400000);
              const hours = Math.floor((Math.max(0, ms) % 86400000) / 3600000);
              const timeLabel = expired ? 'EXPIRED' : days > 0 ? `${days} day${days > 1 ? 's' : ''} ${hours}h left` : `${hours}h left`;
              const fmtDT = (s: string | null) => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
              return (
                <>
                  <SectionHeader index={trialIdx} icon="🎁" iconBg="rgba(124,58,237,0.1)" iconColor="#7c3aed" title="Trial Status"
                    pill={<span style={{ background: pillBg, color: pillColor, fontSize: 10, padding: '2px 8px', borderRadius: 20, marginLeft: 6, fontWeight: 800 }}>{timeLabel}</span>} />
                  {sections[trialIdx] && (
                    <div style={{ padding: '12px 0' }}>
                      {/* Read-only metadata */}
                      <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                        {[
                          { label: 'Trial started', value: fmtDT(trialStartedAt || null) },
                          { label: 'Trial ends', value: fmtDT(form.trialEndsAt) },
                          { label: 'Time remaining', value: timeLabel },
                          { label: 'Trialing tier', value: 'Trial (Niche + Product)' },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5 }}>
                            <span style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10.5 }}>{row.label}</span>
                            <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'DM Sans' }}>{row.value}</span>
                          </div>
                        ))}
                      </div>

                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Extend Trial</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {[1, 3, 7].map(d => (
                          <button key={d} type="button" onClick={() => extendBy(d)} style={{
                            padding: '6px 14px', borderRadius: 20, border: '1.5px solid #ddd6fe', cursor: 'pointer',
                            background: 'white', color: '#7c3aed', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12,
                          }}>+{d} {d === 1 ? 'day' : 'days'}</button>
                        ))}
                        <button type="button" onClick={() => setCustomDateOpen(o => !o)} style={{
                          padding: '6px 14px', borderRadius: 20, border: '1.5px solid #ddd6fe', cursor: 'pointer',
                          background: 'white', color: '#7c3aed', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12,
                        }}>Custom date ▾</button>
                      </div>
                      {customDateOpen && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                          <input type="datetime-local" value={customDateVal} onChange={e => setCustomDateVal(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                          <button type="button" onClick={applyCustomDate} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 10, padding: '0 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Set</button>
                        </div>
                      )}

                      {form.trialEndsAt !== originalTrialEndsAt && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11.5, color: '#15803d' }}>
                          ✓ New end date pending save: <strong>{fmtDT(form.trialEndsAt)}</strong>
                        </div>
                      )}

                      <button type="button" onClick={() => setShowEndEarly(true)} style={{
                        background: 'none', border: '1.5px solid #fecaca', color: '#ef4444',
                        borderRadius: 10, padding: '8px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12,
                        cursor: 'pointer', marginBottom: 12,
                      }}>End Trial Early</button>

                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 11.5, color: '#1e40af', lineHeight: 1.55 }}>
                        ℹ️ To upgrade this user from trial to paid, scroll down to <strong>Access & Payment</strong>, set the desired tier, and change Payment Status to <strong>"Full Paid ✓"</strong>. The upgrade is finalized on Save.
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <SectionHeader index={isTrial ? 2 : 1} icon="🛡️" iconBg="#dcfce7" iconColor="#059669" title="Access & Payment" />
            {sections[isTrial ? 2 : 1] && (
              <div style={{ padding: '12px 0' }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Access Tier</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
                  {[
                    { key: 'trial', label: 'Trial', desc: 'Time-limited access', badge: 'Trial 🕐', color: '#0891b2' },
                    { key: 'basic', label: 'Basic', desc: 'Niche + Product', badge: '2 tools', color: '#059669' },
                    { key: 'premium', label: 'Premium', desc: 'All tools', badge: 'Full access ✦', color: '#7c3aed' },
                    { key: 'beta', label: 'Beta', desc: 'All tools + feedback', badge: 'Beta 🧪', color: '#ec4899' },
                  ].map(t => (
                    <div key={t.key} onClick={() => setForm(f => {
                      if (t.key === 'trial') {
                        return { ...f, accessTier: 'trial', paymentStatus: 'pending', paymentAmount: 0 };
                      }
                      return { ...f, accessTier: t.key };
                    })} style={{
                      borderRadius: 10, padding: 12, cursor: 'pointer',
                      border: `2px solid ${form.accessTier === t.key ? t.color : '#e2e8f0'}`,
                      background: form.accessTier === t.key ? (t.key === 'trial' ? 'rgba(8,145,178,0.06)' : `${t.color}0F`) : '#f8fafc',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${form.accessTier === t.key ? t.color : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {form.accessTier === t.key && <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />}
                        </div>
                        <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                      <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: t.color, marginTop: 4 }}>{t.badge}</div>
                    </div>
                  ))}
                </div>
                {/* Trial Duration input only appears when switching a NON-trial user TO trial.
                    For existing trial users, the Trial Status section above is the single
                    source of truth for extending/ending the trial. */}
                {form.accessTier === 'trial' && !isTrial && (
                  <div style={{ marginBottom: 14, marginTop: 4 }}>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Trial Duration (Days)</label>
                    <input type="number" min={1} max={90} value={form.trialDurationDays}
                      onChange={e => setForm(f => ({ ...f, trialDurationDays: parseInt(e.target.value) || 1 }))}
                      style={inputStyle} />
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Access will expire after this many days from today.</div>
                  </div>
                )}
                <div onClick={() => setForm(f => ({ ...f, accessTier: 'revoked' }))} style={{ cursor: 'pointer', marginTop: 4, marginBottom: 14 }}>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#ef4444' }}>🔒 Revoke access</span>
                </div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Payment Status</label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                  {paymentStatuses.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, paymentStatus: s }))} style={{
                      padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: form.paymentStatus === s ? '#7c3aed' : '#f8fafc', color: form.paymentStatus === s ? 'white' : '#64748b',
                    }}>{paymentLabels[s]}</button>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Payment Amount (₹)</label>
                  <input type="number" value={form.paymentAmount} readOnly={form.accessTier === 'trial'}
                    onChange={e => setForm(f => ({ ...f, paymentAmount: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    style={{ ...inputStyle, background: form.accessTier === 'trial' ? '#f1f5f9' : (inputStyle as any).background, color: form.accessTier === 'trial' ? '#94a3b8' : (inputStyle as any).color, cursor: form.accessTier === 'trial' ? 'not-allowed' : 'text' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', fontWeight: 600 }}>Show Beta Feedback Widget</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>Beta users see the feedback button in the app.</div>
                  </div>
                  <div onClick={() => setForm(f => ({ ...f, isBetaUser: !f.isBetaUser }))} style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    background: form.isBetaUser ? '#ec4899' : '#e2e8f0',
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: form.isBetaUser ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  </div>
                </div>
              </div>
            )}
            <SectionHeader index={isTrial ? 3 : 2} icon="🔔" iconBg="#fff7ed" iconColor="#ea580c" title="Send Email Notification"
              pill={<span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 10, padding: '2px 8px', borderRadius: 20, marginLeft: 6 }}>Optional</span>} />
            {sections[isTrial ? 3 : 2] && (
              <div style={{ padding: '12px 0' }}>
                <button onClick={() => sendEmail('access')} disabled={!!sendingEmail.access || !!emailSent.access} style={{
                  width: '100%', background: emailSent.access ? 'rgba(5,150,105,0.1)' : sendingEmail.access ? 'rgba(124,58,237,0.1)' : '#f0fdf4',
                  border: `1px solid ${emailSent.access ? 'rgba(5,150,105,0.2)' : sendingEmail.access ? 'rgba(124,58,237,0.2)' : '#bbf7d0'}`,
                  color: emailSent.access ? '#059669' : sendingEmail.access ? '#7c3aed' : '#15803d',
                  borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                  cursor: sendingEmail.access || emailSent.access ? 'not-allowed' : 'pointer', textAlign: 'left', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {sendingEmail.access ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinSlow 0.6s linear infinite', display: 'inline-block' }} /> Sending...</>
                  ) : emailSent.access ? '✅ Email Sent!' : '📧 Send Access Updated Email'}
                </button>
                <button onClick={() => sendEmail('password')} disabled={!!sendingEmail.password || !!emailSent.password} style={{
                  width: '100%', background: emailSent.password ? 'rgba(5,150,105,0.1)' : sendingEmail.password ? 'rgba(124,58,237,0.1)' : '#f0f9ff',
                  border: `1px solid ${emailSent.password ? 'rgba(5,150,105,0.2)' : sendingEmail.password ? 'rgba(124,58,237,0.2)' : '#bae6fd'}`,
                  color: emailSent.password ? '#059669' : sendingEmail.password ? '#7c3aed' : '#0891b2',
                  borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                  cursor: sendingEmail.password || emailSent.password ? 'not-allowed' : 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {sendingEmail.password ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinSlow 0.6s linear infinite', display: 'inline-block' }} /> Sending...</>
                  ) : emailSent.password ? '✅ Reset Link Sent!' : '🔑 Send Password Reset Link'}
                </button>
              </div>
            )}
          </div>
          <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setShowDelete(true)} style={{ background: 'none', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 10, padding: '9px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🗑 Delete User</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClose} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '9px 18px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10,
                padding: '10px 22px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {saving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
                {saving ? 'Saving...' : 'Save Changes →'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showDelete && <DeleteConfirmModal userName={user.full_name} onConfirm={handleDeleteConfirm} onCancel={() => setShowDelete(false)} deleting={deleting} />}
      {showEndEarly && (
        <div onClick={() => setShowEndEarly(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '94%', background: 'white', borderRadius: 18, padding: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 17, color: '#0f172a', marginBottom: 8 }}>🛑 End trial early?</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
              End trial for <strong>{user.full_name}</strong>? This will set <code style={{ fontSize: 12, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>is_trial = false</code> and stop trial access immediately. The user's tier and payment status remain unchanged.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEndEarly(false)} disabled={endingEarly} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '9px 16px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEndTrialEarly} disabled={endingEarly} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13, cursor: endingEarly ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {endingEarly && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
                {endingEarly ? 'Ending...' : 'End trial now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SECURITY PROFILE MODAL ────────────────────────────────
export function SecurityProfileModal({ userId, userEmail, userName, onClose, adminId, showToast }: {
  userId: string; userEmail: string; userName: string; onClose: () => void; adminId: string; showToast: (msg: string, type?: string) => void;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [secSettings, setSecSettings] = useState<any>(null);
  const [allIps, setAllIps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [sessRes, secRes, ipRes] = await Promise.all([
        supabase.from('login_sessions').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('user_security_settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('login_sessions').select('ip_address').eq('user_id', userId),
      ]);
      setSessions((sessRes.data as any[]) || []);
      setSecSettings(secRes.data);
      setAllIps([...new Set((ipRes.data as any[])?.map((r: any) => r.ip_address).filter(Boolean) || [])]);
      setLoading(false);
    };
    load();
  }, [userId]);

  const forceLogoutAll = async () => {
    await supabase.from('login_sessions').update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'forced_logout' } as any).eq('user_id', userId);
    await supabase.from('security_events').insert({ user_id: userId, user_email: userEmail, event_type: 'force_logout', severity: 'medium', description: 'Admin force-logged out all sessions', metadata: { admin_id: adminId } } as any);
    setSessions([]);
    showToast(`⚡ All sessions ended for ${userName}`);
  };

  const toggleBlock = async () => {
    const isBlocked = secSettings?.is_blocked;
    if (isBlocked) {
      await supabase.from('user_security_settings').update({ is_blocked: false, block_reason: null, blocked_at: null, blocked_by: null } as any).eq('user_id', userId);
      await supabase.from('security_events').insert({ user_id: userId, user_email: userEmail, event_type: 'user_unblocked', severity: 'low', description: 'Admin unblocked user', metadata: { admin_id: adminId } } as any);
      setSecSettings((s: any) => ({ ...s, is_blocked: false }));
      showToast(`✅ ${userName} unblocked`);
    } else {
      const reason = prompt('Block reason:');
      if (!reason) return;
      await supabase.from('user_security_settings').upsert({ user_id: userId, user_email: userEmail, is_blocked: true, block_reason: reason, blocked_at: new Date().toISOString(), blocked_by: adminId } as any, { onConflict: 'user_id' });
      await supabase.from('security_events').insert({ user_id: userId, user_email: userEmail, event_type: 'user_blocked', severity: 'high', description: `Admin blocked user: ${reason}`, metadata: { admin_id: adminId } } as any);
      setSecSettings((s: any) => ({ ...(s || {}), is_blocked: true, block_reason: reason }));
      showToast(`🚫 ${userName} blocked`);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '94%', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 56, background: 'linear-gradient(135deg,#0f172a,#334155)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: 'white' }}>🛡️ Security Profile — {userName}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
        <div style={{ background: 'white', padding: 20, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30 }}><div style={{ width: 20, height: 20, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>
          ) : (
            <>
              {/* Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: sessions.length > 0 ? '#f0fdf4' : '#f8fafc', border: `1px solid ${sessions.length > 0 ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Active Sessions</div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 24, color: sessions.length > 0 ? '#15803d' : '#64748b' }}>{sessions.length}</div>
                </div>
                <div style={{ background: secSettings?.is_blocked ? '#fee2e2' : '#f0fdf4', border: `1px solid ${secSettings?.is_blocked ? '#fecaca' : '#bbf7d0'}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: secSettings?.is_blocked ? '#991b1b' : '#15803d' }}>
                    {secSettings?.is_blocked ? '🚫 Blocked' : '✅ Active'}
                  </div>
                </div>
              </div>
              {secSettings?.is_blocked && secSettings?.block_reason && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
                  Block reason: {secSettings.block_reason}
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Violations</div>
                <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16 }}>{secSettings?.violation_count || 0}</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>All IPs Used ({allIps.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allIps.map(ip => (
                    <span key={ip} style={{ fontSize: 11, fontFamily: 'monospace', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', color: '#64748b' }}>{ip}</span>
                  ))}
                  {allIps.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>No IPs recorded</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleBlock} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                  background: secSettings?.is_blocked ? '#f0fdf4' : '#fee2e2', color: secSettings?.is_blocked ? '#15803d' : '#991b1b',
                }}>{secSettings?.is_blocked ? '✅ Unblock User' : '🚫 Block User'}</button>
                <button onClick={forceLogoutAll} disabled={sessions.length === 0} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: sessions.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                  background: '#fff7ed', color: '#ea580c', opacity: sessions.length > 0 ? 1 : 0.5,
                }}>⚡ Force Logout All</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APPROVE ACCESS MODAL ────────────────────────────────────
function ApproveAccessModal({ request, onClose, onApproved, showToast, logActivity }: {
  request: SignupRow; onClose: () => void; onApproved: () => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void>;
}) {
  const defaultTier = request.payment_type === 'full' ? 'premium' : request.payment_type === 'beta' ? 'beta' : 'basic';
  const [selectedTier, setSelectedTier] = useState(defaultTier);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const confirmApprove = async () => {
    setApproving(true);
    try {
      const tempPassword = 'Shk' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 5);
      const { data, error } = await supabase.functions.invoke('create-user-and-notify', {
        body: {
          email: request.email, full_name: request.full_name, phone: request.phone, temp_password: tempPassword,
          access_tier: selectedTier, payment_status: selectedTier === 'premium' ? 'paid' : selectedTier === 'beta' ? 'beta' : 'reserved',
          payment_amount: paymentAmount || 0, notes: approvalNotes, is_beta_user: selectedTier === 'beta',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error && !data?.already_exists) throw new Error(data.error);
      await supabase.from('signup_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() } as any).eq('id', request.id);
      await logActivity('signup_approved', null, request.full_name, { email: request.email, tier: selectedTier, payment: paymentAmount });
      onClose();
      onApproved();
      showToast(`✅ ${request.full_name} approved as ${selectedTier}! Email sent.`);
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '94%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 64, background: 'linear-gradient(135deg,#059669,#10b981)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>Approve Access</span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ background: 'white', padding: 24, overflowY: 'auto', flex: 1 }}>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: request.payment_type === 'full' ? tierGradients.premium : tierGradients.basic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: 'white' }}>
              {(request.full_name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{request.full_name}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{request.email}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { key: 'basic', icon: '🔓', label: 'Basic', color: '#059669' },
              { key: 'premium', icon: '⚡', label: 'Premium', color: '#7c3aed' },
              { key: 'beta', icon: '🧪', label: 'Beta', color: '#ec4899' },
            ].map(t => (
              <div key={t.key} onClick={() => setSelectedTier(t.key)} style={{
                borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'center',
                border: `2px solid ${selectedTier === t.key ? t.color : '#e2e8f0'}`,
                background: selectedTier === t.key ? `${t.color}0F` : 'white',
              }}>
                <div style={{ fontSize: 20 }}>{t.icon}</div>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a', marginTop: 6 }}>{t.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Payment Amount (₹)</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseInt(e.target.value) || 0)} placeholder="e.g. 999" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Internal Notes (Optional)</label>
            <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="e.g. Paid via UPI" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' } as React.CSSProperties} />
          </div>
        </div>
        <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '9px 18px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirmApprove} disabled={approving} style={{
            background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none',
            borderRadius: 12, padding: '11px 22px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14,
            boxShadow: '0 4px 14px rgba(5,150,105,0.35)', cursor: approving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, opacity: approving ? 0.7 : 1,
          }}>
            {approving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
            {approving ? 'Creating...' : '✅ Approve & Send Email →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI ANALYTICS TAB ────────────────────────────────────────
function AIAnalyticsTab({ dateRange, onDateRangeChange }: { dateRange: string; onDateRangeChange: (r: string) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogFeed, setShowLogFeed] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = useState(0); // for "Xs ago" ticker

  const fetchAnalytics = async (range: string, silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const fromDate: Record<string, string> = {
        'today': new Date(new Date().setHours(0,0,0,0)).toISOString(),
        '7days': new Date(Date.now() - 7*24*60*60*1000).toISOString(),
        '30days': new Date(Date.now() - 30*24*60*60*1000).toISOString(),
        'all': '2020-01-01T00:00:00Z',
      };
      const { data } = await supabase.from('ai_usage_logs').select('*').gte('created_at', fromDate[range]).order('created_at', { ascending: false });
      const l = (data || []) as any[];
      setLogs(l);

      const totalCalls = l.length;
      const totalTokens = l.reduce((s: number, x: any) => s + (x.total_tokens || 0), 0);
      const totalCostUsd = l.reduce((s: number, x: any) => s + parseFloat(x.estimated_cost_usd || '0'), 0);
      const uniqueUsers = new Set(l.map((x: any) => x.user_id).filter(Boolean)).size;

      // Data source split
      const edgeFunctionLogs = l.filter((x: any) => x.logged_from === 'edge_function').length;
      const frontendLogs = l.filter((x: any) => x.logged_from !== 'edge_function').length;

      const byModule: Record<string, any> = {};
      const byModel: Record<string, any> = {};
      const byUser: Record<string, any> = {};
      const byDay: Record<string, any> = {};

      l.forEach((x: any) => {
        const mod = x.module || 'unknown';
        if (!byModule[mod]) byModule[mod] = { calls: 0, tokens: 0, cost: 0 };
        byModule[mod].calls++; byModule[mod].tokens += x.total_tokens || 0; byModule[mod].cost += parseFloat(x.estimated_cost_usd || '0');

        const mdl = x.model || 'unknown';
        if (!byModel[mdl]) byModel[mdl] = { calls: 0, tokens: 0, cost: 0 };
        byModel[mdl].calls++; byModel[mdl].tokens += x.total_tokens || 0; byModel[mdl].cost += parseFloat(x.estimated_cost_usd || '0');

        const email = x.user_email || 'anonymous';
        if (!byUser[email]) byUser[email] = { name: x.user_name, email: x.user_email, calls: 0, tokens: 0, cost: 0, lastActive: x.created_at };
        byUser[email].calls++; byUser[email].tokens += x.total_tokens || 0; byUser[email].cost += parseFloat(x.estimated_cost_usd || '0');
        if (x.created_at > byUser[email].lastActive) byUser[email].lastActive = x.created_at;

        const day = (x.created_at || '').slice(0, 10);
        if (!byDay[day]) byDay[day] = { calls: 0, tokens: 0, cost: 0 };
        byDay[day].calls++; byDay[day].tokens += x.total_tokens || 0; byDay[day].cost += parseFloat(x.estimated_cost_usd || '0');
      });

      const byCallType: Record<string, number> = {};
      l.forEach((x: any) => { const ct = x.call_type || 'unknown'; byCallType[ct] = (byCallType[ct] || 0) + 1; });
      const topCallTypes = Object.entries(byCallType).sort((a, b) => b[1] - a[1]).slice(0, 5);

      setAnalytics({ totalCalls, totalTokens, totalCostUsd, uniqueUsers, byModule, byModel, byUser, byDay, topCallTypes, edgeFunctionLogs, frontendLogs });
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('AI analytics fetch error:', err);
    }
    if (!silent) { setIsRefreshing(false); setLoading(false); }
  };

  // Initial load + when date range changes
  useEffect(() => { fetchAnalytics(dateRange, false); }, [dateRange]);

  // Auto-refresh every 60 seconds (silent)
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchAnalytics(dateRange, true);
    }, 60000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [dateRange]);

  // Tick "Xs ago" every 10 seconds
  useEffect(() => {
    const ticker = setInterval(() => forceUpdate(n => n + 1), 10000);
    return () => clearInterval(ticker);
  }, []);

  const handleRangeChange = (r: string) => { onDateRangeChange(r); };
  const formatCallType = (ct: string) => ct.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const moduleColors: Record<string, string> = { product_navigator: '#ea580c', offer_creation: '#f59e0b', funnel_builder: '#06b6d4', niche_clarity: '#7c3aed' };
  const moduleNames: Record<string, string> = { product_navigator: 'Product Navigator', offer_creation: 'Offer Creation', funnel_builder: 'Funnel Builder', niche_clarity: 'Niche Clarity' };

  if (loading && !analytics) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;
  if (!analytics || analytics.totalCalls === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>No AI calls logged yet</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#94a3b8' }}>Usage will appear here as users use AI tools.</div>
      </div>
    );
  }

  const { totalCalls, totalTokens, totalCostUsd, uniqueUsers, byModule, byModel, byUser, byDay, topCallTypes } = analytics;
  const dayEntries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-14) as [string, any][];
  const maxDayTokens = Math.max(...dayEntries.map(([, d]) => d.tokens), 1);
  const userEntries = Object.values(byUser).sort((a: any, b: any) => b.cost - a.cost).slice(0, 10) as any[];
  const moduleEntries = Object.entries(byModule).sort((a, b) => (b[1] as any).cost - (a[1] as any).cost) as [string, any][];
  const costDisplay = totalCostUsd < 0.01 ? `$${totalCostUsd.toFixed(6)}` : `$${totalCostUsd.toFixed(4)}`;

  const flashModels = Object.entries(byModel).filter(([k]) => k.includes('flash'));
  const proModels = Object.entries(byModel).filter(([k]) => !k.includes('flash'));
  const flashTotal = flashModels.reduce((s, [, v]: any) => ({ calls: s.calls + v.calls, tokens: s.tokens + v.tokens, cost: s.cost + v.cost }), { calls: 0, tokens: 0, cost: 0 });
  const proTotal = proModels.reduce((s, [, v]: any) => ({ calls: s.calls + v.calls, tokens: s.tokens + v.tokens, cost: s.cost + v.cost }), { calls: 0, tokens: 0, cost: 0 });

  const ranges = [{ id: 'today', label: 'Today' }, { id: '7days', label: '7 Days' }, { id: '30days', label: '30 Days' }, { id: 'all', label: 'All Time' }];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Total AI Calls', value: totalCalls.toLocaleString(), sub: 'in selected period', icon: '🤖', bg: 'rgba(6,182,212,0.1)' },
          { label: 'Tokens Consumed', value: `${(totalTokens/1000).toFixed(1)}K`, sub: 'across all modules', icon: '⚡', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Estimated API Cost', value: costDisplay, sub: 'based on model pricing', icon: '💰', bg: 'rgba(34,197,94,0.1)' },
          { label: 'Unique Users', value: uniqueUsers, sub: 'users who called AI', icon: '👥', bg: 'rgba(124,58,237,0.1)' },
        ].map(k => (
          <div key={k.label} style={{ ...glassCard, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{k.icon}</div>
            </div>
            <div style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>{k.value}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>Period:</span>
        {ranges.map(r => (
          <button key={r.id} onClick={() => handleRangeChange(r.id)} style={{
            padding: '6px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans',
            background: dateRange === r.id ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : '#f8fafc',
            color: dateRange === r.id ? 'white' : '#64748b',
          }}>{r.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefreshed && (
            <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8' }}>
              Updated {(() => {
                const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
                if (diff < 10) return 'just now';
                if (diff < 60) return `${diff}s ago`;
                return `${Math.floor(diff / 60)}m ago`;
              })()}
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)',
            borderRadius: 50, padding: '4px 10px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulseDot 2s infinite' }} />
            <span style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 10, color: '#059669' }}>LIVE · 60s</span>
          </div>
          <button onClick={() => fetchAnalytics(dateRange, false)} disabled={isRefreshing} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: isRefreshing ? '#f8fafc' : 'white',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 12, color: '#64748b',
            transition: 'all 0.15s',
          }}>
            <span style={{ display: 'inline-block', fontSize: 12, animation: isRefreshing ? 'spinSlow 0.8s linear infinite' : 'none' }}>↻</span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Data source split indicator */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        padding: '10px 14px',
        background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.12)',
        borderRadius: 10, marginBottom: 16,
      }}>
        {[
          { label: 'Edge Function logs', value: analytics.edgeFunctionLogs || 0, color: '#059669', desc: 'Accurate — server-side' },
          { label: 'Frontend logs', value: analytics.frontendLogs || 0, color: '#b45309', desc: 'Old format — may be incomplete' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#64748b' }}>
              <strong style={{ color: '#374151' }}>{s.value}</strong> {s.label}
              {' '}
              <span style={{ color: '#94a3b8' }}>· {s.desc}</span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ ...glassCard, padding: 20 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 16 }}>Usage by Module</div>
          {moduleEntries.map(([mod, data]) => (
            <div key={mod} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: moduleColors[mod] || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white', fontWeight: 800, fontFamily: 'Sora', flexShrink: 0 }}>
                {(moduleNames[mod] || mod).charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>{moduleNames[mod] || mod}</div>
                <div style={{ background: '#f1f5f9', height: 8, borderRadius: 50, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(2, (data.cost / totalCostUsd) * 100)}%`, height: '100%', background: moduleColors[mod] || '#64748b', borderRadius: 50 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: moduleColors[mod] || '#64748b' }}>${data.cost.toFixed(4)}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>{data.calls} calls</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...glassCard, padding: 20 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 16 }}>Model Breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#0891b2', marginBottom: 4 }}>⚡ Flash</div>
              <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 20, color: '#0f172a' }}>{flashTotal.calls}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{(flashTotal.tokens/1000).toFixed(1)}K tokens</div>
              <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#059669' }}>${flashTotal.cost.toFixed(4)}</div>
            </div>
            <div style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#ea580c', marginBottom: 4 }}>🧠 Pro</div>
              <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 20, color: '#0f172a' }}>{proTotal.calls}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{(proTotal.tokens/1000).toFixed(1)}K tokens</div>
              <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#059669' }}>${proTotal.cost.toFixed(4)}</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>TOP OPERATIONS</div>
            {topCallTypes.map(([ct, count]) => (
              <div key={ct} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#334155' }}>{formatCallType(ct)}</span>
                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 50, padding: '2px 8px', color: '#64748b' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...glassCard, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Top Users by Cost</div>
            <button onClick={() => {
              const rows = [['Rank', 'User', 'Email', 'Calls', 'Tokens', 'Cost USD', 'Last Active'], ...userEntries.map((u: any, i: number) => [i + 1, u.name || '', u.email || '', u.calls, u.tokens, u.cost.toFixed(6), u.lastActive])];
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              const a = document.createElement('a'); a.href = url; a.download = `ai-top-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
            }} style={{ padding: '5px 11px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)', color: '#7c3aed', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11 }}>📥 CSV</button>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 60px 70px 80px', gap: 0, background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['#', 'User', 'Calls', 'Tokens', 'Cost'].map(h => (
                <div key={h} style={{ padding: '8px 8px', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {userEntries.map((u, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 60px 70px 80px', gap: 0, borderBottom: '1px solid #f8fafc', padding: '2px 0' }}>
                  <div style={{ padding: '10px 8px', fontFamily: 'Sora', fontWeight: 700, fontSize: 12, color: '#94a3b8' }}>{i + 1}</div>
                  <div style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 8, color: 'white', flexShrink: 0 }}>
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.email?.split('@')[0] || 'Unknown'}</span>
                  </div>
                  <div style={{ padding: '10px 8px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center' }}>{u.calls}</div>
                  <div style={{ padding: '10px 8px', fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center' }}>{(u.tokens/1000).toFixed(1)}K</div>
                  <div style={{ padding: '10px 8px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center' }}>${u.cost.toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...glassCard, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Daily AI Usage</div>
            <button onClick={() => {
              const rows = [['Date', 'Calls', 'Tokens', 'Cost USD'], ...dayEntries.map(([d, v]: [string, any]) => [d, v.calls, v.tokens, v.cost.toFixed(6)])];
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              const a = document.createElement('a'); a.href = url; a.download = `ai-daily-trend-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
            }} style={{ padding: '5px 11px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)', color: '#7c3aed', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11 }}>📥 CSV</button>
          </div>
          <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            {dayEntries.map(([day, data]) => {
              const pct = (data.tokens / maxDayTokens) * 100;
              const isToday = day === new Date().toISOString().slice(0, 10);
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${day}\n${data.calls} calls\n${(data.tokens/1000).toFixed(1)}K tokens`}>
                  <div style={{ width: '100%', minHeight: 4, height: `${Math.max(2, pct)}%`, background: isToday ? 'linear-gradient(180deg,#ea580c,#f59e0b)' : 'linear-gradient(180deg,#06b6d4,#3b82f6)', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontFamily: 'DM Sans', fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap' }}>{day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        <button onClick={() => setShowLogFeed(!showLogFeed)} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b' }}>📋 Live API Call Log ({logs.length} entries)</span>
          <span style={{ fontSize: 12, color: '#94a3b8', transform: showLogFeed ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
        </button>
        {showLogFeed && (
          <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: 16, maxHeight: 320, overflowY: 'auto' }}>
            {logs.slice(0, 100).map((log: any) => (
              <div key={log.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', width: 60, flexShrink: 0 }}>{new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false })}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: 'white', background: moduleColors[log.module] || '#64748b', flexShrink: 0 }}>{log.module?.replace('_', ' ')}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#334155', flex: 1 }}>{formatCallType(log.call_type)}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.user_name || log.user_email}</span>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: log.model?.includes('flash') ? '#06b6d4' : '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 700, fontSize: 9, color: 'white', flexShrink: 0 }}>{log.model?.includes('flash') ? 'F' : 'P'}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', width: 50, flexShrink: 0, textAlign: 'right' }}>{(log.total_tokens || 0).toLocaleString()}t</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <ByokStatsSection />
    </div>
  );
}

// ─── BYOK STATS SECTION ──────────────────────────────────────
function ByokStatsSection() {
  const [byokStats, setByokStats] = useState<any>({ byokLogs: [], byokUsers: 0, byProvider: {}, activeKeys: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: byokLogs } = await supabase.from('byok_usage_logs').select('*').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false });
      const byokUsers = new Set((byokLogs || []).map((l: any) => l.user_id)).size;
      const byProvider: Record<string, number> = {};
      (byokLogs || []).forEach((l: any) => { byProvider[l.provider] = (byProvider[l.provider] || 0) + 1; });
      const { count: activeKeys } = await supabase.from('user_byok_keys_safe').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_valid', true);
      setByokStats({ byokLogs: byokLogs || [], byokUsers, byProvider, activeKeys: activeKeys || 0 });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || (byokStats.byokLogs.length === 0 && byokStats.activeKeys === 0)) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 14 }}>🔑 BYOK Usage (Last 30 Days)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Active Keys', value: byokStats.activeKeys, color: '#059669' },
          { label: 'BYOK Users', value: byokStats.byokUsers, color: '#7c3aed' },
          { label: 'Total BYOK Calls', value: byokStats.byokLogs.length, color: '#0284c7' },
          { label: 'Credits Saved', value: `~${Math.floor(byokStats.byokLogs.length * 8)}`, color: '#ea580c' },
        ].map(stat => (
          <div key={stat.label} style={{ ...glassCard, padding: 14 }}>
            <p style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{stat.label}</p>
            <p style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div style={{ ...glassCard, padding: '16px 20px' }}>
        <p style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#374151', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>By Provider</p>
        {['anthropic', 'openai', 'gemini'].map(provider => {
          const count = byokStats.byProvider?.[provider] || 0;
          const total = byokStats.byokLogs.length || 1;
          return (
            <div key={provider} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{provider}</span>
                <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#7c3aed' }}>{count} calls</span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / total) * 100}%`, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 50 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────
function OverviewTab({ stats, users, emailMap, setAdminTab }: { stats: any; users: UserRow[]; emailMap: Record<string, string>; setAdminTab: (t: string) => void }) {
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>({ activeToday: 0, aiCallsToday: 0, tokensToday: 0, topModule: null });
  const [hourlyData, setHourlyData] = useState<number[]>(new Array(24).fill(0));
  const [peakHour, setPeakHour] = useState<{ hour: number; count: number }>({ hour: 0, count: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [newUsers, setNewUsers] = useState<UserRow[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [creditsConsumed24h, setCreditsConsumed24h] = useState(0);
  const [criticalErrors, setCriticalErrors] = useState(0);
  const [unreviewedSecurityEvents, setUnreviewedSecurityEvents] = useState(0);
  const [paidUserCount, setPaidUserCount] = useState(0);
  const [trialUserCount, setTrialUserCount] = useState(0);
  const [pendingTrialCount, setPendingTrialCount] = useState(0);
  const [pendingSignupCount, setPendingSignupCount] = useState(0);

  const moduleColors: Record<string, string> = { product_navigator: '#ea580c', offer_creation: '#f59e0b', funnel_builder: '#06b6d4', niche_clarity: '#7c3aed', copywriting_suite: '#ec4899' };
  const moduleNames: Record<string, string> = { product_navigator: 'Product Navigator', offer_creation: 'Offer Creation', funnel_builder: 'Funnel Builder', niche_clarity: 'Niche Clarity', copywriting_suite: 'Copy Suite' };

  const formatModuleName = (mod: string | undefined) => moduleNames[mod || ''] || mod?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

  const formatPageName = (page: string) => {
    const map: Record<string, string> = {
      'dashboard': '🏠 Dashboard', 'niche_clarity': '🎯 Niche Clarity', 'product_navigator': '🧭 Product Navigator',
      'offer_creation': '🎁 Offer Creation', 'funnel_builder': '🔀 Funnel Builder', 'copywriting_suite': '✍️ Copy Suite',
      'my_saved': '🔖 My Saved', 'profile': '👤 Profile', 'settings': '⚙️ Settings',
    };
    return map[page] || page?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  };

  const formatCallType = (ct: string) => ct?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

  const fetchOverviewData = async () => {
    try {
      const now = new Date();
      const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const day24hAgo = new Date(now.getTime() - 86400000).toISOString();

      const [presRes, activeTodayRes, activeWeekRes, totalRes, aiTodayRes, recentRes, revTodayRes, revWeekRes, deductionsRes, critErrRes, secEvtRes, paidRes, trialRes, pendingTrialsRes, pendingSignupsRes] = await Promise.all([
        supabase.from('user_presence').select('user_id, user_email, user_name, last_seen, current_page, session_start').gte('last_seen', twoMinAgo).order('last_seen', { ascending: false }),
        supabase.from('user_presence').select('*', { count: 'exact', head: true }).gte('last_seen', todayStart),
        supabase.from('user_presence').select('*', { count: 'exact', head: true }).gte('last_seen', weekStart),
        supabase.from('user_presence').select('*', { count: 'exact', head: true }),
        supabase.from('ai_usage_logs').select('total_tokens, module, created_at, call_type, user_name, user_email, model').gte('created_at', todayStart).order('created_at', { ascending: false }),
        supabase.from('ai_usage_logs').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('razorpay_orders').select('amount_inr').eq('status', 'paid').gte('paid_at', todayStart),
        supabase.from('razorpay_orders').select('amount_inr').eq('status', 'paid').gte('paid_at', weekStart),
        supabase.from('credit_transactions').select('amount').in('type', ['deduction', 'shadow_deduction']).gte('created_at', day24hAgo),
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('is_resolved', false),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('is_reviewed', false).in('severity', ['high', 'critical']),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).in('access_tier', ['basic', 'premium', 'beta']),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('access_tier', 'trial'),
        supabase.from('trial_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('signup_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setPresenceData(presRes.data || []);
      setTodayRevenue((revTodayRes.data || []).reduce((s: number, o: any) => s + o.amount_inr, 0));
      setWeekRevenue((revWeekRes.data || []).reduce((s: number, o: any) => s + o.amount_inr, 0));
      setCreditsConsumed24h(Math.abs((deductionsRes.data || []).reduce((s: number, t: any) => s + t.amount, 0)));
      setCriticalErrors(critErrRes.count || 0);
      setUnreviewedSecurityEvents(secEvtRes.count || 0);
      setPaidUserCount(paidRes.count || 0);
      setTrialUserCount(trialRes.count || 0);
      setPendingTrialCount(pendingTrialsRes.count || 0);
      setPendingSignupCount(pendingSignupsRes.count || 0);

      const tokenData = aiTodayRes.data || [];
      const tokensToday = (tokenData as any[]).reduce((s: number, l: any) => s + (l.total_tokens || 0), 0);
      const moduleCounts: Record<string, number> = {};
      (tokenData as any[]).forEach((l: any) => { moduleCounts[l.module] = (moduleCounts[l.module] || 0) + 1; });
      const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0] || null;

      const hourly = new Array(24).fill(0);
      (tokenData as any[]).forEach((l: any) => { hourly[new Date(l.created_at).getHours()]++; });
      setHourlyData(hourly);
      const maxHourIdx = hourly.indexOf(Math.max(...hourly));
      setPeakHour({ hour: maxHourIdx, count: hourly[maxHourIdx] });

      setRecentLogs(((recentRes.data || []) as any[]).slice(0, 20));
      setTodayStats({
        activeToday: activeTodayRes.count || 0,
        activeWeek: activeWeekRes.count || 0,
        totalUsers: totalRes.count || 0,
        aiCallsToday: (tokenData as any[]).length,
        tokensToday,
        topModule,
        newSignupsThisWeek: users.filter(u => u.created_at >= weekStart).length,
      });

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      setNewUsers(users.filter(u => u.created_at >= weekAgo));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Overview fetch error:', err);
    }
  };

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onlineUsers = presenceData;
  const onlineCount = onlineUsers.length;
  const maxHourly = Math.max(...hourlyData, 1);
  const currentHour = new Date().getHours();
  const hourLabels = ['12am', '', '', '', '4am', '', '', '', '8am', '', '', '', '12pm', '', '', '', '4pm', '', '', '', '8pm', '', '', ''];
  const pendingReview = (unreviewedSecurityEvents || 0) + (criticalErrors || 0) + (pendingTrialCount || 0) + (pendingSignupCount || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══ TIER 1: COMMAND STRIP ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap' as const, gap: 12,
        background: criticalErrors > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(5,150,105,0.06)',
        border: `1px solid ${criticalErrors > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(5,150,105,0.2)'}`,
        borderRadius: 16, padding: '14px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: criticalErrors > 0 ? '#ef4444' : '#10b981', animation: 'pulseDot 2s infinite', flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 32, color: criticalErrors > 0 ? '#dc2626' : '#059669', lineHeight: 1 }}>{onlineCount}</span>
              <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#64748b' }}>users live now</span>
            </div>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: 0 }}>
              {criticalErrors > 0
                ? `⚠️ ${criticalErrors} critical error${criticalErrors !== 1 ? 's' : ''} need attention`
                : '✓ All systems operational'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
          {[
            { label: 'Active Today', value: todayStats.activeToday, sub: 'users' },
            { label: 'AI Calls Today', value: todayStats.aiCallsToday, sub: 'generations' },
            { label: 'New This Week', value: todayStats.newSignupsThisWeek || 0, sub: 'signups' },
            { label: 'Pending Review', value: pendingReview, sub: 'items', alert: pendingReview > 0 },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' as const }}>
              <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 20, color: (m as any).alert ? '#dc2626' : '#0f172a', margin: '0 0 1px', lineHeight: 1 }}>{m.value ?? '—'}</p>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8', margin: 0 }}>{m.label}</p>
            </div>
          ))}
        </div>
        <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>↻ Refreshes every 30s</span>
      </div>

      {/* ═══ TIER 2: BUSINESS VITALS ═══ */}
      <div>
        <h3 style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 12px' }}>Business Vitals</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {([
            { icon: '💰', iconBg: 'rgba(5,150,105,0.1)', value: `₹${todayRevenue?.toLocaleString('en-IN') || '0'}`, label: 'Revenue Today', sub: `₹${weekRevenue?.toLocaleString('en-IN') || '0'} this week`, color: '#059669', period: 'Today' },
            { icon: '🤖', iconBg: 'rgba(6,182,212,0.1)', value: todayStats.aiCallsToday || 0, label: 'AI Calls Today', sub: todayStats.tokensToday ? `${(todayStats.tokensToday / 1000).toFixed(1)}K tokens` : '0 tokens', color: '#0891b2', period: 'Today' },
            { icon: '⚡', iconBg: 'rgba(124,58,237,0.1)', value: creditsConsumed24h?.toLocaleString('en-IN') || 0, label: 'Credits Used (24h)', sub: 'Shadow + live deductions', color: '#7c3aed', period: '24h' },
            { __totalUsers: true } as any,
            { icon: '🔥', iconBg: 'rgba(245,158,11,0.1)', value: formatModuleName(todayStats.topModule?.[0]), label: 'Hottest Tool Today', sub: `${todayStats.topModule?.[1] || 0} calls today`, color: '#b45309', period: 'Today', smallText: true },
            { icon: '🆕', iconBg: 'rgba(16,185,129,0.1)', value: todayStats.newSignupsThisWeek || 0, label: 'New Signups', sub: 'Last 7 days', color: '#10b981', period: '7d' },
          ] as any[]).map((k: any, idx: number) => (
            k.__totalUsers ? (
              <div key="total-users" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(2,132,199,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</div>
                  <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8' }}>Total</span>
                </div>
                <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 24, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.2 }}>{paidUserCount + trialUserCount}</p>
                <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#94a3b8', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Total Users</p>
                <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' as const, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10 }}>⚡</span>{paidUserCount} paid
                  </span>
                  <span style={{ color: '#e2e8f0', fontSize: 11 }}>·</span>
                  <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: trialUserCount > 0 ? '#7c3aed' : '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {trialUserCount > 0 && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: 'pulseDot 2s infinite', flexShrink: 0, display: 'inline-block' }} />
                    )}
                    {trialUserCount} on trial
                  </span>
                </div>
              </div>
            ) : (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{k.icon}</div>
                  <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8' }}>{k.period}</span>
                </div>
                <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: k.smallText ? 18 : 24, color: k.color, margin: '0 0 2px', lineHeight: 1.2 }}>{k.value}</p>
                <p style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#94a3b8', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{k.label}</p>
                <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#64748b', margin: 0 }}>{k.sub}</p>
              </div>
            )
          ))}
        </div>
      </div>

      {/* ═══ TIER 3: CONTEXT + DETAIL ═══ */}

      {/* Who's online */}
      {onlineCount > 0 && (
        <div>
          <h3 style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 12px' }}>Online Right Now</h3>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' as const, paddingBottom: 4 }}>
            {onlineUsers.slice(0, 8).map((u: any) => (
              <div key={u.user_id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 50, padding: '6px 14px 6px 8px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ position: 'relative' as const }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 700, fontSize: 10, color: 'white' }}>{(u.user_name || 'U').charAt(0).toUpperCase()}</div>
                  <div style={{ position: 'absolute' as const, bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid white' }} />
                </div>
                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{u.user_name || 'User'}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>· {formatPageName(u.current_page)}</span>
              </div>
            ))}
            {onlineCount > 8 && (
              <div style={{ background: '#f1f5f9', borderRadius: 50, padding: '6px 14px', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', fontWeight: 600 }}>+{onlineCount - 8} more</div>
            )}
          </div>
        </div>
      )}

      {/* Hourly activity chart */}
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' as const, gap: 8 }}>
          <div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: '0 0 2px' }}>Today's Activity by Hour</h3>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {peakHour.count > 0 ? `Peak: ${peakHour.hour}:00 (${peakHour.count} calls) · ${todayStats.aiCallsToday || 0} total calls today` : 'No activity yet today'}
            </p>
          </div>
          <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 50, padding: '3px 10px' }}>AI generations / hour</span>
        </div>
        <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {hourlyData.map((count, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${i}:00 — ${count} calls`}>
              <div style={{ width: '100%', minHeight: 2, height: `${Math.max(2, (count / maxHourly) * 100)}%`, background: i === currentHour ? 'linear-gradient(180deg,#ea580c,#f59e0b)' : 'linear-gradient(180deg,#06b6d4,#3b82f6)', borderRadius: '3px 3px 0 0' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {hourLabels.map((l, i) => (
            <span key={i} style={{ fontFamily: 'DM Sans', fontSize: 9, color: '#94a3b8', flex: 1, textAlign: 'center' as const }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Two columns: Recent Activity + New Signups */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>Recent Activity</h3>
            <button onClick={() => setAdminTab('ai-analytics')} style={{ background: 'none', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#06b6d4', cursor: 'pointer', fontWeight: 700 }}>Full log →</button>
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 20, color: '#94a3b8', fontSize: 13 }}>No AI activity today yet.</div>
          ) : (
            recentLogs.map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', width: 60, flexShrink: 0 }}>{formatDate(log.created_at)}</span>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 8, color: 'white', flexShrink: 0 }}>{(log.user_name || 'U').charAt(0).toUpperCase()}</div>
                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, color: '#0f172a', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{log.user_name || 'Unknown'}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: 'white', background: moduleColors[log.module] || '#64748b', flexShrink: 0 }}>{(moduleNames[log.module] || log.module || '').replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', flex: 1 }}>{formatCallType(log.call_type)}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>New This Week</h3>
            <button onClick={() => setAdminTab('signups')} style={{ background: 'none', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#10b981', cursor: 'pointer', fontWeight: 700 }}>Manage →</button>
          </div>
          {newUsers.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 20, color: '#94a3b8', fontFamily: 'DM Sans', fontSize: 13 }}>No new signups this week.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {newUsers.slice(0, 6).map(u => {
                const tc = tierColors[u.access_tier] || tierColors.basic;
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 9, color: 'white', flexShrink: 0 }}>{(u.full_name || 'U').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.full_name}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>{emailMap[u.id] || '—'}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const, flexShrink: 0 }}>{u.access_tier}</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{formatDate(u.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── USERS TAB ───────────────────────────────────────────────
function UsersTab({ users, emailMap, onRefresh, showToast, logActivity, adminId, role }: { users: UserRow[]; emailMap: Record<string, string>; onRefresh: () => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void>; adminId: string; role: AdminRole }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [securityUser, setSecurityUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletionReqs, setDeletionReqs] = useState<any[]>([]);
  const [showDeletionQueue, setShowDeletionQueue] = useState(false);
  const [byokKeys, setByokKeys] = useState<{ user_id: string; provider: string }[]>([]);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);

  // Inline gift credits modal state
  const [giftingUser, setGiftingUser] = useState<UserRow | null>(null);
  const [giftAmount, setGiftAmount] = useState(100);
  const [giftReason, setGiftReason] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);

  // Inline force logout modal state
  const [forceLoggingOutUser, setForceLoggingOutUser] = useState<UserRow | null>(null);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);

  // Inline Set Password modal state
  const [setPasswordUser, setSetPasswordUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generateStrongPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*-_=+?';
    const all = upper + lower + digits + special;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    let pw = pick(upper) + pick(lower) + pick(digits) + pick(special);
    for (let i = 0; i < 10; i++) pw += pick(all);
    return pw.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleSetPassword = async () => {
    if (!setPasswordUser || !newPassword) return;
    setSetPasswordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: setPasswordUser.id, new_password: newPassword },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const em = emailMap[setPasswordUser.id] || '';
      await logActivity('password_set_by_admin', setPasswordUser.id, em, { context: 'users_tab' });
      setSetPasswordSuccess(true);
      showToast(`🔐 Password set for ${em || setPasswordUser.full_name}`, 'success');
    } catch (e: any) {
      showToast(`❌ ${e.message || 'Failed to set password'}`, 'error');
    } finally {
      setSetPasswordLoading(false);
    }
  };

  const closeSetPasswordModal = () => {
    setSetPasswordUser(null);
    setNewPassword('');
    setSetPasswordSuccess(false);
    setShowNewPassword(true);
    setCopiedField(null);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  const handleInlineGift = async () => {
    if (!giftingUser || !giftAmount || giftAmount < 1) return;
    if (giftAmount > 1000) {
      showToast('Max 1,000 credits per gift. Use bulk gift for larger amounts.', 'error');
      return;
    }
    const targetEmail = emailMap[giftingUser.id];
    if (!targetEmail) { showToast('Email not found', 'error'); return; }
    setGiftLoading(true);
    try {
      const { error } = await supabase.functions.invoke('gift-credits', {
        body: { targetEmail, credits: giftAmount, reason: giftReason || 'Admin gift' },
      });
      if (error) throw new Error(error.message);
      try {
        await supabase.functions.invoke('send-gift-email', {
          body: { email: targetEmail, fullName: giftingUser.full_name, credits: giftAmount, reason: giftReason },
        });
      } catch (e) { console.warn('gift email failed', e); }
      await logActivity('gift_credits', giftingUser.id, targetEmail, { credits: giftAmount, reason: giftReason || null });
      showToast(`🎁 ${giftAmount} credits gifted to ${targetEmail}`, 'success');
      setGiftingUser(null); setGiftAmount(100); setGiftReason('');
      onRefresh();
    } catch (e: any) {
      showToast(`❌ ${e.message || 'Failed to gift credits'}`, 'error');
    } finally {
      setGiftLoading(false);
    }
  };

  const handleInlineForceLogout = async () => {
    if (!forceLoggingOutUser) return;
    const targetEmail = emailMap[forceLoggingOutUser.id] || '';
    setForceLogoutLoading(true);
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      await supabase.from('login_sessions')
        .update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'admin_force_logout' } as any)
        .eq('user_id', forceLoggingOutUser.id)
        .eq('is_active', true);
      await supabase.from('security_events').insert({
        user_id: forceLoggingOutUser.id, user_email: targetEmail,
        event_type: 'force_logout', severity: 'medium',
        description: `Admin force-logged out ${targetEmail}`,
        metadata: { admin_id: admin?.id, action: 'inline_force_logout' },
      } as any);
      await logActivity('force_logout', forceLoggingOutUser.id, targetEmail);
      showToast(`⚡ ${forceLoggingOutUser.full_name} has been force-logged out`, 'success');
      setForceLoggingOutUser(null);
    } catch (e: any) {
      showToast(`❌ ${e.message || 'Failed to force logout'}`, 'error');
    } finally {
      setForceLogoutLoading(false);
    }
  };

  // Test Trial modal state
  const [showTestTrial, setShowTestTrial] = useState(false);
  const [ttName, setTtName] = useState('');
  const [ttEmail, setTtEmail] = useState('');
  const [ttPhone, setTtPhone] = useState('');
  const [ttDays, setTtDays] = useState<2 | 7 | 14 | 30>(7);
  const [ttNotes, setTtNotes] = useState('');
  const [ttCreating, setTtCreating] = useState(false);
  const [ttResult, setTtResult] = useState<{ email: string; tempPassword: string; expiresAt: string; durationDays: number; isNewAuthUser: boolean } | null>(null);

  const seedTestTrial = () => {
    const stamp = Date.now().toString().slice(-6);
    setTtName(`Test Trialer ${stamp}`);
    setTtEmail(`test.trial+${stamp}@shikshantaram.in`);
    setTtPhone('+919999999999');
    setTtDays(7);
    setTtNotes('Smoke test — created from Users tab.');
  };

  const submitTestTrial = async () => {
    if (!ttName.trim() || !ttEmail.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    setTtCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-trial-user', {
        body: {
          fullName: ttName.trim(),
          email: ttEmail.trim().toLowerCase(),
          phone: ttPhone.trim(),
          durationDays: ttDays,
          adminNotes: ttNotes.trim() || 'Created via Test Trial (admin)',
          adminId,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setTtResult({
        email: data.email,
        tempPassword: data.tempPassword,
        expiresAt: data.expiresAt,
        durationDays: data.durationDays,
        isNewAuthUser: data.isNewAuthUser,
      });
      await logActivity('test_trial_created', data.userId, ttName.trim(), { email: data.email, durationDays: data.durationDays });
      showToast(`🧪 Test trial user created (${ttDays}d)`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`❌ Test trial failed: ${err.message}`, 'error');
    } finally {
      setTtCreating(false);
    }
  };

  const closeTestTrial = () => {
    setShowTestTrial(false);
    setTtResult(null);
    setTtName(''); setTtEmail(''); setTtPhone(''); setTtNotes(''); setTtDays(7);
  };

  useEffect(() => {
    supabase.from('user_byok_keys_safe').select('user_id, provider').eq('is_active', true).eq('is_valid', true)
      .then(({ data }) => setByokKeys(data || []));
  }, [users]);

  const fetchDeletionRequests = async () => {
    const { data } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });
    setDeletionReqs(data || []);
  };

  useEffect(() => {
    fetchDeletionRequests();
  }, []);

  const approveDeletion = async (req: any) => {
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    await supabase.from('user_profiles')
      .update({ access_tier: 'revoked' })
      .eq('id', req.user_id);
    await supabase.from('deletion_requests')
      .update({ status: 'completed', reviewed_at: new Date().toISOString(), reviewed_by: adminUser?.id })
      .eq('id', req.id);
    fetchDeletionRequests();
    onRefresh();
    showToast(`✅ ${req.user_email} access revoked. Data preserved.`, 'success');
  };

  const rejectDeletion = async (req: any) => {
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    await supabase.from('deletion_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: adminUser?.id })
      .eq('id', req.id);
    await supabase.from('user_profiles')
      .update({ deletion_requested: false, deletion_requested_at: null })
      .eq('id', req.user_id);
    fetchDeletionRequests();
    showToast(`Deletion request rejected for ${req.user_email}`, 'success');
  };

  const filtered = users.filter(u => {
    if (filter !== 'All' && u.access_tier !== filter.toLowerCase()) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchName = u.full_name.toLowerCase().includes(s);
      const matchEmail = (emailMap[u.id] || '').toLowerCase().includes(s);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const handleSendPasswordReset = async (target: UserRow) => {
    const em = emailMap[target.id];
    if (!em) { showToast('Email not found for this user', 'error'); return; }
    if (!window.confirm(`Send password reset link to ${em}?`)) return;
    setResettingPasswordId(target.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { user_id: target.id, email: em.trim().toLowerCase() },
      });
      if (error) throw new Error(error.message);
      if (data?.sent === false) throw new Error(data?.error || 'Failed to send reset link');
      await logActivity('password_reset_sent', target.id, em, { context: 'users_tab', sent_at: data?.sent_at || new Date().toISOString() });
      showToast(`🔑 Password reset link sent to ${em}`, 'success');
    } catch (e: any) {
      showToast(`❌ ${e.message || 'Failed to send reset link'}`, 'error');
    } finally {
      setResettingPasswordId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: deleteUser.id } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      await logActivity('user_deleted', deleteUser.id, deleteUser.full_name);
      setDeleteUser(null);
      onRefresh();
      showToast(`🗑 ${deleteUser.full_name}'s account has been permanently deleted.`, 'warning');
    } catch (err: any) {
      showToast(`❌ Delete failed: ${err.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Deletion requests warning strip */}
      {deletionReqs.length > 0 && (
        <div style={{
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
          borderRadius:'12px', padding:'14px 18px', marginBottom:'16px',
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap',
        }}>
          <span style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'13px', color:'#b45309' }}>
            ⚠️ {deletionReqs.length} pending account deletion request{deletionReqs.length > 1 ? 's' : ''}
          </span>
          <button onClick={() => setShowDeletionQueue(true)} style={{ background:'#b45309', color:'white', border:'none', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px' }}>
            Review Requests
          </button>
        </div>
      )}

      {/* Deletion queue modal */}
      {showDeletionQueue && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'white', borderRadius:'24px', padding:'32px', maxWidth:'520px', width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.2)', maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:'18px', color:'#0f172a', margin:0 }}>⚠️ Deletion Requests</h2>
              <button onClick={() => setShowDeletionQueue(false)} style={{ background:'#f1f5f9', border:'none', width:'30px', height:'30px', borderRadius:'50%', cursor:'pointer', fontSize:'14px' }}>✕</button>
            </div>
            {deletionReqs.map((req: any) => (
              <div key={req.id} style={{ border:'1px solid #f1f5f9', borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', gap:'8px', flexWrap:'wrap' }}>
                  <div>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'14px', color:'#0f172a', margin:'0 0 2px' }}>{req.user_name || req.user_email}</p>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'12px', color:'#94a3b8', margin:0 }}>{req.user_email}</p>
                  </div>
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'11px', color:'#94a3b8', margin:0, flexShrink:0 }}>
                    {new Date(req.requested_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
                {req.reason && (
                  <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#64748b', background:'#f8fafc', borderRadius:'8px', padding:'8px 12px', margin:'0 0 12px' }}>
                    "{req.reason}"
                  </p>
                )}
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => rejectDeletion(req)} style={{ flex:1, padding:'8px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'transparent', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px', color:'#64748b' }}>
                    ✕ Reject
                  </button>
                  <button onClick={() => approveDeletion(req)} style={{ flex:2, padding:'8px', borderRadius:'8px', border:'none', background:'#dc2626', color:'white', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'12px' }}>
                    ✓ Approve & Revoke Access
                  </button>
                </div>
              </div>
            ))}
            {deletionReqs.length === 0 && (
              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:'13px', color:'#94a3b8', textAlign:'center', padding:'20px 0' }}>No pending requests.</p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1.5px solid #e2e8f0' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'DM Sans' }} />
        </div>
        {['All', 'Trial', 'Basic', 'Premium', 'Beta', 'Revoked'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: filter === f ? '#7c3aed' : '#f1f5f9', color: filter === f ? 'white' : '#64748b',
          }}>{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap' }}>
          Showing {filtered.length} of {users.length}
        </span>
        <button
          onClick={() => {
            const escape = (v: any) => {
              const s = v === null || v === undefined ? '' : String(v);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const headers = ['Name', 'Email', 'Phone', 'Tier', 'Paid (INR)', 'Joined'];
            const rows = filtered.map(u => [
              u.full_name || '',
              emailMap[u.id] || '',
              u.phone || '',
              (u.access_tier || '').charAt(0).toUpperCase() + (u.access_tier || '').slice(1),
              u.payment_amount ?? 0,
              u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
            ]);
            const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `users-${filter.toLowerCase()}-${ts}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`📥 Exported ${filtered.length} user${filtered.length === 1 ? '' : 's'} to CSV`, 'success');
          }}
          style={{
            padding: '7px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white',
            cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans,sans-serif',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}
        >
          📥 Export CSV
        </button>
        <button
          onClick={() => { seedTestTrial(); setShowTestTrial(true); }}
          style={{
            padding: '7px 14px', borderRadius: 10, border: '1.5px solid #fde68a', background: '#fffbeb',
            cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#92400e', fontFamily: 'DM Sans,sans-serif',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}
          title="Provision a sandbox trial user end-to-end (auth + profile + credits + trial_request). Bypasses OTP."
        >
          🧪 Test Trial
        </button>
      </div>

      {/* Test Trial modal */}
      {showTestTrial && (
        <div onClick={closeTestTrial} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 520, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 18, color: '#0f172a', margin: 0 }}>🧪 Create Test Trial User</h2>
              <button onClick={closeTestTrial} style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#64748b', margin: '0 0 18px', lineHeight: 1.5 }}>
              Provisions a complete trial account end-to-end: auth user, profile (<code>access_tier=trial</code>), 100 starter credits, and a <code>trial_requests</code> record. Bypasses OTP. Use a dummy email for safe testing.
            </p>

            {!ttResult ? (
              <>
                {[
                  { label: 'Full Name', val: ttName, set: setTtName, ph: 'Test Trialer 123456', type: 'text' },
                  { label: 'Email', val: ttEmail, set: setTtEmail, ph: 'test.trial+123@shikshantaram.in', type: 'email' },
                  { label: 'Phone', val: ttPhone, set: setTtPhone, ph: '+919999999999', type: 'tel' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Trial Duration</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([2, 7, 14, 30] as const).map(d => (
                      <button key={d} onClick={() => setTtDays(d)}
                        style={{
                          flex: 1, padding: '10px 8px', borderRadius: 10, border: ttDays === d ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                          background: ttDays === d ? 'rgba(124,58,237,0.08)' : 'white', cursor: 'pointer',
                          fontFamily: 'DM Sans,sans-serif', fontWeight: 800, fontSize: 13,
                          color: ttDays === d ? '#7c3aed' : '#64748b',
                        }}
                      >{d}d</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Internal Notes</label>
                  <textarea value={ttNotes} onChange={e => setTtNotes(e.target.value)} rows={2}
                    placeholder="Why are you creating this test user?"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 16, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', lineHeight: 1.6, overflowX: 'auto' }}>
                  <div style={{ color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9 }}>Payload preview</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify({ fullName: ttName, email: ttEmail, phone: ttPhone, durationDays: ttDays, adminNotes: ttNotes, adminId }, null, 2)}</pre>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={closeTestTrial} disabled={ttCreating}
                    style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, color: '#64748b' }}
                  >Cancel</button>
                  <button onClick={submitTestTrial} disabled={ttCreating || !ttName.trim() || !ttEmail.trim()}
                    style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: ttCreating ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', cursor: ttCreating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 800, fontSize: 13 }}
                  >{ttCreating ? 'Provisioning...' : `Create ${ttDays}-day Test Trial →`}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #86efac' }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: '#166534', marginBottom: 4 }}>
                    ✅ Test trial user created
                  </div>
                  <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#15803d' }}>
                    {ttResult.isNewAuthUser ? 'New auth user created.' : 'Existing auth user reused — password reset.'} Trial expires {new Date(ttResult.expiresAt).toLocaleString('en-IN')}.
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px dashed #f59e0b' }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 12, color: '#78350f', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🔐 Login Credentials</div>
                  {[{ k: 'Email', v: ttResult.email }, { k: 'Password', v: ttResult.tempPassword }].map(({ k, v }) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                      <span style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 700, color: '#78350f' }}>{k}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', maxWidth: '70%' }}>
                        <code style={{ fontFamily: 'monospace', fontSize: 11, color: '#0f172a', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 6, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</code>
                        <button onClick={() => { navigator.clipboard.writeText(v); showToast(`${k} copied`, 'success'); }}
                          style={{ background: '#78350f', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                        >Copy</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={closeTestTrial}
                  style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 800, fontSize: 13 }}
                >Done</button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ ...glassCard, overflowX: 'auto', overflowY: 'visible' }}>
        <table style={{ width: '100%', minWidth: 1400, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Avatar', 'Name', 'Email', 'Phone', 'Tier', 'Paid (₹)', 'BYOK', 'Joined', 'Credits', 'Last Active', 'Last IP', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const tc = tierColors[u.access_tier] || tierColors.basic;
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: tierGradients[u.access_tier] || tierGradients.basic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 10, color: 'white' }}>
                      {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name || 'Unknown'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{emailMap[u.id] || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'DM Sans,sans-serif', color: u.phone ? '#0f172a' : '#cbd5e1', fontWeight: u.phone ? 600 : 400 }}>{u.phone || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{u.access_tier}</span>
                      {u.access_tier === 'trial' ? (() => {
                        const ends = u.trial_ends_at ? new Date(u.trial_ends_at).getTime() : 0;
                        const ms = ends - Date.now();
                        const expired = ms <= 0;
                        const days = Math.max(0, Math.floor(ms / 86400000));
                        const hours = Math.max(0, Math.floor((ms % 86400000) / 3600000));
                        const label = expired ? 'EXPIRED' : days > 0 ? `${days}d left` : `${hours}h left`;
                        const urgent = !expired && ms < 86400000;
                        return (
                          <span title={ends ? new Date(ends).toLocaleString() : ''} style={{ fontSize: 9, fontWeight: 800, background: expired ? '#fee2e2' : urgent ? '#fef3c7' : '#fef9c3', color: expired ? '#991b1b' : urgent ? '#92400e' : '#854d0e', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                            🎁 TRIAL · {label}
                          </span>
                        );
                      })() : (u.payment_amount || 0) > 0 ? (
                        <span style={{ fontSize: 9, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>💳 PAID</span>
                      ) : u.is_beta_user ? (
                        <span style={{ fontSize: 9, fontWeight: 800, background: '#fce7f3', color: '#9d174d', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>✨ BETA</span>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'DM Sans,sans-serif', fontWeight: 700, color: (u.payment_amount || 0) > 0 ? '#059669' : '#cbd5e1' }}>
                    {(u.payment_amount || 0) > 0 ? `₹${(u.payment_amount || 0).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {(() => {
                      const providers = byokKeys.filter(k => k.user_id === u.id).map(k => k.provider);
                      return providers.length > 0 ? (
                        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '2px 8px', borderRadius: 50 }}>
                          🔑 {providers.join(', ')}
                        </span>
                      ) : <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>;
                    })()}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{formatDate(u.created_at)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'DM Sans,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {(u.creditBalance ?? 0) === 0
                      ? <span style={{ color: '#dc2626' }}>⚠️ 0</span>
                      : <span style={{ color: '#7c3aed' }}>⚡ {(u.creditBalance ?? 0).toLocaleString('en-IN')}</span>}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {u.lastSeen
                      ? (() => {
                          const diff = Date.now() - new Date(u.lastSeen).getTime();
                          if (diff < 120000) return <span style={{ color: '#059669', fontWeight: 700 }}>🟢 Now</span>;
                          if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                          if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                          return `${Math.floor(diff / 86400000)}d ago`;
                        })()
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{u.lastIp || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {canDo.editUsers(role) && (
                        <button
                          onClick={() => handleSendPasswordReset(u)}
                          disabled={resettingPasswordId === u.id}
                          title="Send Password Reset Link"
                          style={{ width: 30, height: 30, background: 'rgba(2,132,199,0.06)', border: '1px solid rgba(2,132,199,0.2)', color: '#0284c7', borderRadius: 8, cursor: resettingPasswordId === u.id ? 'wait' : 'pointer', opacity: resettingPasswordId === u.id ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                        >{resettingPasswordId === u.id ? '…' : '🔑'}</button>
                      )}
                      {canDo.editUsers(role) && (
                        <button
                          onClick={() => { setSetPasswordUser(u); setNewPassword(generateStrongPassword()); }}
                          title="Set Password (Manual)"
                          style={{ width: 30, height: 30, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', color: '#7c3aed', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                        >🔐</button>
                      )}
                      {canDo.editUsers(role) && (
                        <button
                          onClick={() => setGiftingUser(u)}
                          title="Gift Credits"
                          style={{ width: 30, height: 30, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)', color: '#059669', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                        >🎁</button>
                      )}
                      {canDo.blockUsers(role) && (
                        <button
                          onClick={() => setForceLoggingOutUser(u)}
                          title="Force Logout"
                          style={{ width: 30, height: 30, background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)', color: '#ea580c', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                        >⚡</button>
                      )}
                      {canDo.editUsers(role) && <button onClick={() => setEditUser(u)} title="Edit" style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✏️</button>}
                      {canDo.blockUsers(role) && <button onClick={() => setSecurityUser(u)} title="View Security" style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🛡️</button>}
                      {canDo.deleteUsers(role) && <button onClick={() => setDeleteUser(u)} title="Delete" style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🗑</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editUser && (
        <EditUserModal user={editUser} email={emailMap[editUser.id] || ''} onClose={() => setEditUser(null)}
          onSave={() => { setEditUser(null); onRefresh(); }}
          onDelete={(id, name) => { onRefresh(); showToast(`🗑 ${name} deleted.`, 'warning'); }}
          showToast={showToast} logActivity={logActivity} />
      )}
      {deleteUser && <DeleteConfirmModal userName={deleteUser.full_name} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteUser(null)} deleting={deleting} />}
      {securityUser && (
        <SecurityProfileModal userId={securityUser.id} userEmail={emailMap[securityUser.id] || ''} userName={securityUser.full_name}
          onClose={() => setSecurityUser(null)} adminId={adminId} showToast={showToast} />
      )}

      {/* Inline Gift Credits modal */}
      {giftingUser && (
        <div onClick={() => !giftLoading && setGiftingUser(null)} style={{ position: 'fixed', inset: 0, zIndex: 8888, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '100%', background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 18, color: '#0f172a', margin: '0 0 6px' }}>🎁 Gift Credits</h2>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#64748b', margin: '0 0 18px' }}>
              {giftingUser.full_name} · Current balance: ⚡{(giftingUser.creditBalance ?? 0).toLocaleString('en-IN')}
            </p>
            <label style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Credits to gift (max 1,000)</label>
            <input type="number" value={giftAmount} min={1} max={1000} disabled={giftLoading}
              onChange={e => setGiftAmount(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }} />
            <label style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Reason (shown in email)</label>
            <input type="text" value={giftReason} onChange={e => setGiftReason(e.target.value)} disabled={giftLoading} maxLength={200}
              placeholder="e.g. Compensation for downtime"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, boxSizing: 'border-box', marginBottom: 14 }} />
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 10, marginBottom: 16 }}>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#166534', margin: 0 }}>
                After gifting: ⚡{((giftingUser.creditBalance ?? 0) + giftAmount).toLocaleString('en-IN')} credits · An email will be sent.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setGiftingUser(null)} disabled={giftLoading}
                style={{ flex: 1, padding: 11, borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', cursor: giftLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, color: '#64748b', opacity: giftLoading ? 0.5 : 1 }}>Cancel</button>
              <button onClick={handleInlineGift} disabled={giftLoading || giftAmount < 1 || giftAmount > 1000}
                style={{ flex: 2, padding: 11, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', cursor: giftLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, opacity: giftLoading ? 0.7 : 1 }}>
                {giftLoading ? 'Gifting…' : `🎁 Gift ${giftAmount} Credits`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Force Logout modal */}
      {forceLoggingOutUser && (
        <div onClick={() => !forceLogoutLoading && setForceLoggingOutUser(null)} style={{ position: 'fixed', inset: 0, zIndex: 8888, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '100%', background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 18, color: '#0f172a', margin: '0 0 8px' }}>Force Logout User</h2>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              <strong>{forceLoggingOutUser.full_name}</strong> ({emailMap[forceLoggingOutUser.id] || '—'}) will be immediately signed out of all active sessions.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setForceLoggingOutUser(null)} disabled={forceLogoutLoading}
                style={{ flex: 1, padding: 11, borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', cursor: forceLogoutLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, color: '#64748b', opacity: forceLogoutLoading ? 0.5 : 1 }}>Cancel</button>
              <button onClick={handleInlineForceLogout} disabled={forceLogoutLoading}
                style={{ flex: 2, padding: 11, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ea580c,#f97316)', color: 'white', cursor: forceLogoutLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, opacity: forceLogoutLoading ? 0.7 : 1 }}>
                {forceLogoutLoading ? 'Signing out…' : '⚡ Force Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Set Password modal */}
      {setPasswordUser && (
        <div onClick={() => !setPasswordLoading && closeSetPasswordModal()} style={{ position: 'fixed', inset: 0, zIndex: 8888, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%', background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 18, color: '#0f172a', margin: '0 0 6px' }}>🔐 Set Password Manually</h2>
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#64748b', margin: '0 0 18px' }}>
              {setPasswordUser.full_name} · {emailMap[setPasswordUser.id] || '—'}
            </p>

            {!setPasswordSuccess ? (
              <>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 10, marginBottom: 14 }}>
                  <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11.5, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                    ⚠️ This directly overwrites the user's password. Share it securely (WhatsApp/in-person). Min 8 chars with upper, lower, digit & special.
                  </p>
                </div>

                <label style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>New Password</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={setPasswordLoading}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14, boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowNewPassword(s => !s)}
                    style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
                    {showNewPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                  <button type="button" onClick={() => setNewPassword(generateStrongPassword())} disabled={setPasswordLoading}
                    style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    🎲 Regenerate
                  </button>
                  <button type="button" onClick={() => copyToClipboard(newPassword, 'pw-input')} disabled={!newPassword}
                    style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    {copiedField === 'pw-input' ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={closeSetPasswordModal} disabled={setPasswordLoading}
                    style={{ flex: 1, padding: 11, borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', cursor: setPasswordLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, color: '#64748b', opacity: setPasswordLoading ? 0.5 : 1 }}>Cancel</button>
                  <button onClick={handleSetPassword} disabled={setPasswordLoading || !newPassword || newPassword.length < 8}
                    style={{ flex: 2, padding: 11, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', cursor: setPasswordLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, opacity: setPasswordLoading ? 0.7 : 1 }}>
                    {setPasswordLoading ? 'Setting…' : '🔐 Set Password'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12.5, color: '#166534', margin: 0, fontWeight: 700 }}>
                    ✅ Password updated. Share these credentials with the user securely.
                  </p>
                </div>

                <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Email</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', wordBreak: 'break-all' }}>{emailMap[setPasswordUser.id] || '—'}</code>
                    <button onClick={() => copyToClipboard(emailMap[setPasswordUser.id] || '', 'em')}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {copiedField === 'em' ? '✓' : '📋'}
                    </button>
                  </div>
                  <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Password</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 14, color: '#fbbf24', wordBreak: 'break-all' }}>{newPassword}</code>
                    <button onClick={() => copyToClipboard(newPassword, 'pw')}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {copiedField === 'pw' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const em = emailMap[setPasswordUser.id] || '';
                    const msg = `Hi ${setPasswordUser.full_name},\n\nYour Shikshantaram OS password has been reset by our team.\n\nLogin: https://os.shikshantaram.in\nEmail: ${em}\nPassword: ${newPassword}\n\nPlease sign in and change your password from Profile → Security.`;
                    copyToClipboard(msg, 'msg');
                  }}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 10 }}>
                  {copiedField === 'msg' ? '✓ Message Copied' : '📋 Copy Ready-to-Send Message'}
                </button>

                <button onClick={closeSetPasswordModal}
                  style={{ width: '100%', padding: 11, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13 }}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIGNUPS TAB ─────────────────────────────────────────────
function SignupsTab({ onRefresh, showToast, logActivity }: { onRefresh: () => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void> }) {
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [trialIps, setTrialIps] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [approveRequest, setApproveRequest] = useState<SignupRow | null>(null);
  const [ipLookup, setIpLookup] = useState<string | null>(null);
  const [signupsFilter, setSignupsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [signupsSearch, setSignupsSearch] = useState('');
  const [rejectingSignup, setRejectingSignup] = useState<SignupRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => { fetchSignups(); }, []);

  const fetchSignups = async () => {
    setLoading(true);
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('signup_requests').select('*').order('submitted_at', { ascending: false }),
      supabase.from('trial_requests').select('email, ip_address').not('ip_address', 'is', null),
    ]);
    setSignups((s || []) as unknown as SignupRow[]);
    const ipMap: Record<string, string[]> = {};
    (t || []).forEach((row: any) => {
      if (!row.ip_address) return;
      if (!ipMap[row.ip_address]) ipMap[row.ip_address] = [];
      ipMap[row.ip_address].push(row.email);
    });
    setTrialIps(ipMap);
    setLoading(false);
  };

  const filteredSignups = signups.filter(s => {
    if (signupsFilter !== 'all' && s.status !== signupsFilter) return false;
    const q = signupsSearch.trim().toLowerCase();
    if (!q) return true;
    return (s.full_name?.toLowerCase().includes(q)) ||
           (s.email?.toLowerCase().includes(q)) ||
           (s.phone?.includes(signupsSearch.trim()));
  });

  const pendingSignups = filteredSignups.filter(s => s.status === 'pending');
  const otherSignups = filteredSignups.filter(s => s.status !== 'pending');
  const pendingCount = signups.filter(s => s.status === 'pending').length;
  const approvedCount = signups.filter(s => s.status === 'approved').length;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const approvedThisWeek = signups.filter(s => s.status === 'approved' && s.reviewed_at && s.reviewed_at >= weekAgo).length;

  const handleSignupReject = async () => {
    if (!rejectingSignup) return;
    setRejecting(true);
    try {
      await supabase.from('signup_requests').update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        notes: rejectReason.trim() || null,
      } as any).eq('id', rejectingSignup.id);

      try {
        await supabase.functions.invoke('send-rejection-email', {
          body: { email: rejectingSignup.email, fullName: rejectingSignup.full_name, reason: rejectReason.trim() || null },
        });
      } catch (e) { console.error('rejection email failed', e); }

      await logActivity('signup_rejected', null, rejectingSignup.full_name || null, { email: rejectingSignup.email, reason: rejectReason.trim() || null });
      setRejectingSignup(null);
      setRejectReason('');
      fetchSignups();
      showToast('Request rejected — email sent.', 'warning');
    } catch (e: any) {
      showToast(`❌ ${e.message || 'Failed to reject'}`, 'error');
    } finally {
      setRejecting(false);
    }
  };

  const exportSignupsCSV = () => {
    if (filteredSignups.length === 0) { showToast('No signups to export', 'warning'); return; }
    const rows = filteredSignups.map(s => ({
      Name: s.full_name || '',
      Email: s.email || '',
      Phone: s.phone || '',
      Payment: s.payment_type || '',
      IP: s.ip_address || '',
      Device: s.user_agent ? (s.user_agent.includes('Mobile') ? 'Mobile' : 'Desktop') : '',
      Submitted: s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-IN') : '',
      Status: s.status || '',
      Notes: (s.notes || '').replace(/\n/g, ' '),
    }));
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signups-${signupsFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📥 Exported ${filteredSignups.length} signup${filteredSignups.length === 1 ? '' : 's'}`, 'success');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  const SignupRowEl = ({ s }: { s: SignupRow }) => {
    const trialMatches = s.ip_address ? (trialIps[s.ip_address] || []).filter(e => e !== s.email) : [];
    const flagged = trialMatches.length > 0;
    return (
      <tr style={{ borderTop: '1px solid #f1f5f9' }}>
        <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{s.full_name}</td>
        <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{s.email}</td>
        <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{s.phone}</td>
        <td style={{ padding: '10px 16px', fontSize: 11.5, color: flagged ? '#991b1b' : '#94a3b8', fontWeight: flagged ? 700 : 400 }}>
          {s.ip_address ? (
            <button onClick={() => setIpLookup(s.ip_address!)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11.5, fontFamily: 'monospace', color: flagged ? '#991b1b' : '#475569', textDecoration: 'underline', fontWeight: flagged ? 700 : 500 }} title="Click to look up all accounts on this IP">
              {s.ip_address}
            </button>
          ) : '—'}
          {flagged && (
            <span title={`Same IP also used by trial accounts: ${trialMatches.join(', ')}`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: '#fee2e2', color: '#991b1b' }}>
              ⚠ TRIAL ×{trialMatches.length}
            </span>
          )}
        </td>
        <td style={{ padding: '10px 16px' }}>
          {(() => {
            const PAYMENT_CHIP: Record<string, { label: string; color: string; bg: string }> = {
              full:    { label: 'FULL',    color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
              beta:    { label: 'BETA',    color: '#ea580c', bg: 'rgba(234,88,12,0.1)'  },
              reserve: { label: 'RESERVE', color: '#b45309', bg: 'rgba(180,83,9,0.1)'   },
              trial:   { label: 'TRIAL',   color: '#0284c7', bg: 'rgba(2,132,199,0.1)'  },
            };
            const chip = PAYMENT_CHIP[s.payment_type] || PAYMENT_CHIP.reserve;
            return (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                background: chip.bg, color: chip.color,
              }}>{chip.label}</span>
            );
          })()}
        </td>
        <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b' }} title={s.user_agent || ''}>
          {s.user_agent ? (s.user_agent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop') : '—'}
        </td>
        <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{formatDate(s.submitted_at)}</td>
        <td style={{ padding: '10px 16px' }}>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
            background: s.status === 'pending' ? '#fef9c3' : s.status === 'approved' ? '#dcfce7' : '#fee2e2',
            color: s.status === 'pending' ? '#92400e' : s.status === 'approved' ? '#15803d' : '#991b1b',
          }}>{s.status}</span>
        </td>
        <td style={{ padding: '10px 16px' }}>
          {s.status === 'pending' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setApproveRequest(s)} style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Approve</button>
              <button onClick={() => setRejectingSignup(s)} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✗ Reject</button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#92400e' }}>⏳ {pendingCount} Pending</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>✅ {approvedThisWeek} Approved This Week</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#f0f9ff', color: '#0891b2' }}>📊 {approvedCount} All Time Approved</span>
      </div>

      {/* Filter pills + Search + Export */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            { id: 'pending', label: '⏳ Pending' },
            { id: 'approved', label: '✅ Approved' },
            { id: 'rejected', label: '✗ Rejected' },
            { id: 'all', label: '📋 All' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setSignupsFilter(f.id)} style={{
              padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              background: signupsFilter === f.id ? '#0f172a' : '#f8fafc',
              color: signupsFilter === f.id ? 'white' : '#64748b',
              fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 12,
            }}>{f.label}</button>
          ))}
        </div>
        <input value={signupsSearch} onChange={e => setSignupsSearch(e.target.value)} placeholder="Search name, email, or phone..."
          style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, width: 240, outline: 'none' }} />
        <button onClick={exportSignupsCSV} style={{
          marginLeft: 'auto', padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
          background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0f172a',
          fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', gap: 6,
        }}>📥 Export CSV</button>
      </div>
      {pendingSignups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>⏳ Pending Approval</div>
          <div style={{ ...glassCard, overflowX: 'auto', border: '1.5px solid #fde68a' }}>
            <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fffbeb' }}>
                  {['Name', 'Email', 'Phone', 'IP', 'Payment', 'Device', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingSignups.map(s => <SignupRowEl key={s.id} s={s} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approved/Rejected Section */}
      {otherSignups.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>📋 Approved / Rejected</div>
          <div style={{ ...glassCard, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Name', 'Email', 'Phone', 'IP', 'Payment', 'Device', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otherSignups.map(s => <SignupRowEl key={s.id} s={s} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {signups.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16 }}>No signup requests yet</div>
        </div>
      )}

      {approveRequest && (
        <ApproveAccessModal request={approveRequest} onClose={() => setApproveRequest(null)}
          onApproved={() => { fetchSignups(); onRefresh(); }} showToast={showToast} logActivity={logActivity} />
      )}

      {ipLookup && <AdminIpLookupModal ip={ipLookup} onClose={() => setIpLookup(null)} />}

      {/* Rejection reason modal */}
      {rejectingSignup && (
        <div onClick={() => { if (!rejecting) { setRejectingSignup(null); setRejectReason(''); } }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 24, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 900, fontSize: 18, color: '#0f172a', margin: 0 }}>✗ Reject Signup Request</h2>
              <button onClick={() => { setRejectingSignup(null); setRejectReason(''); }} disabled={rejecting} style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: rejecting ? 'not-allowed' : 'pointer', fontSize: 14, opacity: rejecting ? 0.5 : 1 }}>✕</button>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#991b1b', margin: '0 0 4px', fontWeight: 700 }}>{rejectingSignup.full_name}</p>
              <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#7f1d1d', margin: 0 }}>{rejectingSignup.email}</p>
            </div>
            <label style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Reason (optional — included in rejection email)
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="e.g. We're at capacity right now. We'll re-open access soon."
              disabled={rejecting}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#94a3b8', margin: '4px 0 16px', textAlign: 'right' }}>{rejectReason.length}/500</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setRejectingSignup(null); setRejectReason(''); }} disabled={rejecting}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', cursor: rejecting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, color: '#64748b', opacity: rejecting ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={handleSignupReject} disabled={rejecting}
                style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', cursor: rejecting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, fontSize: 13, opacity: rejecting ? 0.7 : 1 }}>
                {rejecting ? 'Rejecting…' : '✗ Reject & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROLE BADGE ──────────────────────────────────────────────
function RoleBadge({ role, displayName }: { role: AdminRole; displayName: string }) {
  const meta = roleMeta[role!] || roleMeta.operator;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'DM Sans' }}>Logged in as {displayName}</span>
      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, fontFamily: 'DM Sans' }}>{meta.label}</span>
    </div>
  );
}

// ─── PERMISSIONS TABLE ───────────────────────────────────────
function PermissionsTable() {
  const rows = [
    { action: 'View Overview & Analytics dashboard', owner: true, admin: true, manager: false, operator: false },
    { action: 'View & manage Users', owner: true, admin: true, manager: true, operator: false },
    { action: 'Approve / reject Signups', owner: true, admin: true, manager: true, operator: true },
    { action: 'Edit user details & tier', owner: true, admin: true, manager: true, operator: false },
    { action: 'Block / unblock users', owner: true, admin: true, manager: false, operator: false },
    { action: 'View AI Analytics', owner: true, admin: false, manager: false, operator: false },
    { action: 'View Security & error logs', owner: true, admin: false, manager: false, operator: false },
    { action: 'Force logout sessions', owner: true, admin: false, manager: false, operator: false },
    { action: 'Manage team access', owner: true, admin: false, manager: false, operator: false },
    { action: "Change anyone's role", owner: true, admin: false, manager: false, operator: false },
  ];
  return (
    <div style={{ ...glassCard, padding: 20, marginTop: 20 }}>
      <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 14 }}>📋 Permissions Reference</div>
      <div style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const }}>Permission</th>
              {['👑 Owner', '🔧 Admin', '📋 Manager', '⚡ Operator'].map(r => (
                <th key={r} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b' }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 14px', fontSize: 12.5, color: '#334155', fontFamily: 'DM Sans' }}>{row.action}</td>
                {[row.owner, row.admin, row.manager, row.operator].map((can, j) => (
                  <td key={j} style={{ padding: '8px', textAlign: 'center', fontSize: 14 }}>{can ? '✅' : '❌'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TEAM ACCESS TAB ─────────────────────────────────────────
function TeamAccessTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rolePickerFor, setRolePickerFor] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<any | null>(null);
  const [removing, setRemoving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const roleBtnRef = useRef<HTMLButtonElement>(null);

  const fetchTeam = async () => {
    setLoading(true);
    const [{ data: members }, { data: invites }] = await Promise.all([
      supabase.from('admin_users').select('*').order('created_at', { ascending: true }),
      supabase.from('team_invitations').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setTeamMembers((members || []) as any[]);
    setPendingInvites((invites || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const changeRole = async (targetUserId: string, newRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await supabase.functions.invoke('manage-team', {
        body: { action: 'change_role', targetUserId, newRole },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (result.data?.success) { showToast(`✅ ${result.data.message}`); fetchTeam(); }
      else showToast(`❌ ${result.data?.error || 'Failed'}`, 'error');
    } catch (err: any) { showToast(`❌ ${err.message}`, 'error'); }
    setRolePickerFor(null);
  };

  const confirmRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await supabase.functions.invoke('manage-team', {
        body: { action: 'remove_member', targetUserId: removeTarget.user_id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (result.data?.success) { showToast(`✅ ${result.data.message}`); fetchTeam(); setRemoveTarget(null); }
      else showToast(`❌ ${result.data?.error || 'Failed'}`, 'error');
    } catch (err: any) { showToast(`❌ ${err.message}`, 'error'); }
    setRemoving(false);
  };

  const cancelInvite = async (invitationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('manage-team', {
        body: { action: 'cancel_invitation', invitationId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      showToast('✅ Invitation cancelled.');
      fetchTeam();
    } catch (err: any) { showToast(`❌ ${err.message}`, 'error'); }
  };

  const resendInvite = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await supabase.functions.invoke('manage-team', {
        body: { action: 'resend_invitation', invitationId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (result.data?.success) { showToast(`✅ ${result.data.message}`); fetchTeam(); }
      else showToast(`❌ ${result.data?.error || 'Failed to resend'}`, 'error');
    } catch (err: any) { showToast(`❌ ${err.message}`, 'error'); }
    setResendingId(null);
  };

  const copyInviteLink = async (inv: any) => {
    const url = `${window.location.origin}/?invite=${inv.token || inv.id}&email=${encodeURIComponent(inv.email)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteId(inv.id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch {
      showToast('❌ Could not copy to clipboard', 'error');
    }
  };

  const handleAddSuccess = (msg: string) => { showToast(`✅ ${msg}`); fetchTeam(); };

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return 'Never signed in';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return 'Active now';
    if (diff < 3_600_000) return `Active ${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `Active ${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `Active ${Math.floor(diff / 86_400_000)}d ago`;
    return `Active ${new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a' }}>🔑 Team Access</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Only you (Owner) can manage who has access to this panel</div>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 12,
          padding: '10px 20px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
        }}>+ Add Team Member</button>
      </div>

      {/* Current Team */}
      <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>Current Team ({teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'})</div>

      {teamMembers.length === 0 ? (
        <div style={{ ...glassCard, padding: 40, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 6 }}>No team members yet</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8' }}>Click <strong>+ Add Team Member</strong> above to invite an admin, manager or operator.</div>
        </div>
      ) : (
        <div style={{ ...glassCard, marginBottom: 20 }}>
          {teamMembers.map((member: any, i: number) => {
            const meta = roleMeta[member.role] || roleMeta.operator;
            const isOwnerRow = member.is_owner;
            return (
              <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 12, color: 'white', flexShrink: 0 }}>
                  {(member.display_name || member.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{member.display_name || member.email?.split('@')[0] || 'Unknown'}</span>
                    {isOwnerRow && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>(You)</span>}
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8' }}>
                    {member.email || '—'} · Added {formatDate(member.invited_at || member.created_at)}
                    <span style={{ marginLeft: 8, color: member.last_active ? '#059669' : '#cbd5e1', fontWeight: 600 }}>
                      · {formatLastActive(member.last_active)}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, fontFamily: 'DM Sans', flexShrink: 0 }}>{meta.label}</span>
                {isOwnerRow ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>🔒 Protected</span>
                ) : (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <button ref={roleBtnRef} onClick={() => setRolePickerFor(rolePickerFor === member.user_id ? null : member.user_id)} style={{
                        background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#374151',
                      }}>Change Role ▾</button>
                      {rolePickerFor === member.user_id && createPortal(
                        <>
                          <div onClick={() => setRolePickerFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'transparent' }} />
                          <div style={{
                            position: 'fixed',
                            top: (roleBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                            left: (roleBtnRef.current?.getBoundingClientRect().right ?? 200) - 200,
                            zIndex: 99999,
                            background: 'white',
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            border: '1px solid #e2e8f0',
                            padding: 6,
                            width: 200,
                          }}>
                            {(['admin', 'manager', 'operator'] as const).map(r => {
                              const isCurrent = member.role === r;
                              return (
                                <div key={r} onClick={() => { if (!isCurrent) { changeRole(member.user_id, r); } setRolePickerFor(null); }} style={{
                                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left' as const, padding: '10px 14px', borderRadius: 8,
                                  cursor: isCurrent ? 'default' : 'pointer',
                                  background: isCurrent ? (r === 'admin' ? 'rgba(124,58,237,0.08)' : r === 'manager' ? 'rgba(37,99,235,0.08)' : 'rgba(100,116,139,0.08)') : 'transparent',
                                  fontFamily: 'DM Sans', fontWeight: isCurrent ? 700 : 500, fontSize: 13,
                                  color: isCurrent ? (r === 'admin' ? '#7c3aed' : r === 'manager' ? '#2563eb' : '#64748b') : '#374151',
                                }}>
                                  <span style={{ fontSize: 16 }}>{r === 'admin' ? '🔧' : r === 'manager' ? '📋' : '⚙️'}</span>
                                  <span style={{ textTransform: 'capitalize' as const }}>{r}</span>
                                  {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 14 }}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                    <button onClick={() => setRemoveTarget(member)} style={{
                      background: 'rgba(239,68,68,0.08)', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#dc2626',
                    }}>Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>Pending Invitations ({pendingInvites.length})</div>
          <div style={{ ...glassCard, overflow: 'hidden', marginBottom: 20 }}>
            {pendingInvites.map((inv: any, i: number) => {
              const meta = roleMeta[inv.role] || roleMeta.operator;
              const isResending = resendingId === inv.id;
              const isCopied = copiedInviteId === inv.id;
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📧</div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{inv.email}</div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8' }}>
                      Sent {formatDate(inv.created_at)} · Expires {formatDate(inv.expires_at)}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, fontFamily: 'DM Sans' }}>{meta.label}</span>
                  <button onClick={() => copyInviteLink(inv)} style={{
                    background: isCopied ? '#dcfce7' : '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: isCopied ? '#15803d' : '#475569',
                  }}>{isCopied ? '✓ Copied' : '🔗 Copy link'}</button>
                  <button onClick={() => resendInvite(inv.id)} disabled={isResending} style={{
                    background: 'rgba(124,58,237,0.08)', border: 'none', padding: '6px 10px', borderRadius: 8,
                    cursor: isResending ? 'wait' : 'pointer', opacity: isResending ? 0.6 : 1,
                    fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#7c3aed',
                  }}>{isResending ? 'Sending…' : '↻ Resend'}</button>
                  <button onClick={() => cancelInvite(inv.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#dc2626' }}>Cancel</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <PermissionsTable />

      {showAddModal && <AddTeamMemberModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />}

      {/* ─── Remove Member Modal ───────────────────────────────── */}
      {removeTarget && (
        <div onClick={() => !removing && setRemoveTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, maxWidth: 440, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '20px 24px', color: 'white' }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 17 }}>✕ Remove Team Member</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, opacity: 0.85, marginTop: 4 }}>This action revokes their admin access immediately.</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#f8fafc', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: (roleMeta[removeTarget.role] || roleMeta.operator).bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                  {(removeTarget.display_name || removeTarget.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{removeTarget.display_name || removeTarget.email}</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8' }}>{removeTarget.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: (roleMeta[removeTarget.role] || roleMeta.operator).bg, color: (roleMeta[removeTarget.role] || roleMeta.operator).color, fontFamily: 'DM Sans' }}>{(roleMeta[removeTarget.role] || roleMeta.operator).label}</span>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans', fontSize: 12.5, color: '#92400e', marginBottom: 18 }}>
                ⚠️ They will be signed out of the admin panel on their next request. Their user account and content remain intact — only admin privileges are revoked. You can re-invite them later.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setRemoveTarget(null)} disabled={removing} style={{ background: '#f1f5f9', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#475569' }}>Cancel</button>
                <button onClick={confirmRemoveMember} disabled={removing} style={{ background: removing ? '#fca5a5' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: removing ? 'wait' : 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}>
                  {removing ? 'Removing…' : '✕ Remove from team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD TEAM MEMBER MODAL ───────────────────────────────────
function AddTeamMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'operator'>('operator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await supabase.functions.invoke('manage-team', {
        body: { action: 'add_member', email: email.trim().toLowerCase(), role },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (result.data?.success) { onSuccess(result.data.message); onClose(); }
      else setError(result.data?.error || 'Failed to add team member.');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const roleDescriptions: Record<string, string> = {
    admin: '🔧 Full access to Overview, Users, and Signups. Cannot see AI Analytics or Security.',
    manager: '📋 Can view Users and Signups. Can approve signups and edit user details. Cannot block users.',
    operator: '⚡ Can only approve or reject new signup requests. No access to Users or other data.',
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '94%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
        <div style={{ height: 60, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>➕</span>
          <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>Add Team Member</span>
        </div>
        <div style={{ background: 'white', padding: 24 }}>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
            Enter the email of the person you want to give access to. They must already have a Shikshantaram OS account.
          </div>

          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 6 }}>Email Address</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="team@example.com" style={{ ...inputStyle, marginBottom: 20 }} />

          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8 }}>Assign Role</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['admin', 'manager', 'operator'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                border: role === r ? 'none' : '1.5px solid #e2e8f0',
                background: role === r ? roleMeta[r].bg : 'transparent',
                color: role === r ? 'white' : '#64748b',
                fontFamily: 'DM Sans', fontWeight: 800, fontSize: 12,
                transition: 'all 0.15s',
              }}>{roleMeta[r].label}</button>
            ))}
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontFamily: 'DM Sans', fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>
            {roleDescriptions[role]}
          </div>

          {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontFamily: 'DM Sans', fontSize: 13, color: '#991b1b' }}>❌ {error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '9px 18px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={loading} style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10,
              padding: '10px 22px', fontFamily: 'Sora', fontWeight: 700, fontSize: 13.5, cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {loading && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
              {loading ? 'Adding...' : `Add as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ADMIN PANEL ────────────────────────────────────────
export default function AdminPanel() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { role, isOwner, displayName, loading: roleLoading } = useAdminRole();
  const [tab, setTab] = useState('');
  useEffect(() => { const el = document.getElementById('main-content-area'); if (el) el.scrollTop = 0; }, [tab]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ total: 0, basic: 0, premium: 0 });
  const [loading, setLoading] = useState(true);
  const [adminToast, setAdminToast] = useState<{ message: string; type: string } | null>(null);
  const [analyticsDateRange, setAnalyticsDateRange] = useState(() => {
    try { return localStorage.getItem('admin_analytics_date_range') || '30days'; } catch { return '30days'; }
  });
  useEffect(() => { try { localStorage.setItem('admin_analytics_date_range', analyticsDateRange); } catch {} }, [analyticsDateRange]);
  const [tabBadges, setTabBadges] = useState<{ signups: number; trials: number; security: number }>({ signups: 0, trials: 0, security: 0 });

  const fetchTabBadges = async () => {
    try {
      const [pendingSignupsRes, pendingTrialsRes, critErrRes, secEvtRes] = await Promise.all([
        supabase.from('signup_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('trial_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('is_resolved', false).neq('module', 'health_monitor'),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('is_reviewed', false).in('severity', ['high', 'critical']),
      ]);
      setTabBadges({
        signups: pendingSignupsRes.count || 0,
        trials: pendingTrialsRes.count || 0,
        security: (critErrRes.count || 0) + (secEvtRes.count || 0),
      });
    } catch (e) { console.error('badge fetch error', e); }
  };

  useEffect(() => {
    fetchTabBadges();
    const id = setInterval(fetchTabBadges, 60000);
    return () => clearInterval(id);
  }, []);

  // Set default tab based on role
  useEffect(() => {
    if (!role) return;
    if (canDo.viewOverview(role)) setTab('overview');
    else if (canDo.viewUsers(role)) setTab('users');
    else setTab('signups');
  }, [role]);

  useEffect(() => {
    if (!isAdmin && !roleLoading) { navigate('/'); return; }
    if (role) loadData();
  }, [isAdmin, role]);

  const showAdminToast = (message: string, type = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => setAdminToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    const [usersRes, emailsRes, creditsRes, presenceRes, sessionsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
      supabase.functions.invoke('admin-list-emails'),
      supabase.from('user_credits').select('user_id, balance'),
      supabase.from('user_presence').select('user_id, last_seen'),
      supabase.from('login_sessions').select('user_id, ip_address, created_at').order('created_at', { ascending: false }),
    ]);
    const baseUsers = (usersRes.data || []) as unknown as UserRow[];
    const creditMap = Object.fromEntries(((creditsRes.data || []) as any[]).map(c => [c.user_id, c.balance]));
    const presenceMap = Object.fromEntries(((presenceRes.data || []) as any[]).map(p => [p.user_id, p.last_seen]));
    const ipMap: Record<string, string> = {};
    ((sessionsRes.data || []) as any[]).forEach(s => {
      if (s.user_id && s.ip_address && !ipMap[s.user_id]) ipMap[s.user_id] = s.ip_address;
    });
    const u: UserRow[] = baseUsers.map(x => ({
      ...x,
      creditBalance: creditMap[x.id] ?? 0,
      lastSeen: presenceMap[x.id] ?? null,
      lastIp: ipMap[x.id] ?? null,
    }));
    setUsers(u);
    setEmailMap(emailsRes.data?.emails || {});
    setStats({ total: u.length, basic: u.filter(x => x.access_tier === 'basic').length, premium: u.filter(x => x.access_tier === 'premium').length });
    setLoading(false);
  };

  const adminId = user?.id || '';

  const logActivity = async (action_type: string, target_user_id: string | null, target_user_name: string | null, details: Record<string, any> = {}) => {
    if (!user) return;
    await supabase.from('admin_activity_log').insert({ admin_id: user.id, action_type, target_user_id, target_user_name, details } as any);
  };

  if (roleLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)' }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} /></div>;

  if (!role) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>Access Denied</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginBottom: 20 }}>You don't have permission to access the admin panel.</div>
        <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 24px', fontFamily: 'Sora', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Back to App</button>
      </div>
    </div>
  );

  // Build visible nav items dynamically based on role, grouped by section
  type NavItem = { id: string; label: string; icon: string; badge: number };
  type NavGroup = { title: string; items: NavItem[] };
  const navGroups: NavGroup[] = [
    {
      title: 'Operations',
      items: [
        canDo.viewOverview(role) && { id: 'overview', label: 'Overview', icon: '📊', badge: 0 },
        canDo.viewUsers(role) && { id: 'users', label: 'Users', icon: '👥', badge: 0 },
        canDo.viewSignups(role) && { id: 'signups', label: 'Signups', icon: '📝', badge: tabBadges.signups },
        canDo.viewSignups(role) && { id: 'trials', label: 'Trials', icon: '🎁', badge: tabBadges.trials },
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Analytics',
      items: [
        canDo.viewAnalytics(role) && { id: 'credits', label: 'Credits', icon: '💰', badge: 0 },
        canDo.viewAnalytics(role) && { id: 'ai-analytics', label: 'AI Analytics', icon: '⚡', badge: 0 },
        role === 'owner' && { id: 'ai-settings', label: 'AI Settings', icon: '🤖', badge: 0 },
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Governance',
      items: [
        canDo.viewSecurity(role) && { id: 'security', label: 'Security', icon: '🔒', badge: tabBadges.security },
        canDo.viewSecurity(role) && { id: 'activity_log', label: 'Activity Log', icon: '📋', badge: 0 },
        canDo.viewTeam(role) && { id: 'team', label: 'Team Access', icon: '🔑', badge: 0 },
      ].filter(Boolean) as NavItem[],
    },
  ].filter(g => g.items.length > 0);

  const allItems = navGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === tab);

  const SIDEBAR_W = 248;

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = tab === item.id;
    return (
      <button
        onClick={() => setTab(item.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: 'DM Sans', fontWeight: active ? 700 : 500, fontSize: 13.5,
          background: active ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
          color: active ? 'white' : '#475569',
          boxShadow: active ? '0 8px 24px -8px rgba(124,58,237,0.55)' : 'none',
          transition: 'all 0.18s ease', textAlign: 'left',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = '#0f172a'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
      >
        <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge > 0 && (
          <span style={{
            background: active ? 'rgba(255,255,255,0.25)' : '#dc2626',
            color: 'white', fontSize: 10, fontWeight: 800,
            padding: '2px 8px', borderRadius: 20, minWidth: 20, textAlign: 'center',
            lineHeight: '14px', fontFamily: 'DM Sans,sans-serif',
          }}>{item.badge > 99 ? '99+' : item.badge}</span>
        )}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)' }}>
      <style>{popInKeyframes}</style>
      <AdminToast toast={adminToast} onClose={() => setAdminToast(null)} />

      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(15,23,42,0.06)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 18px' }}>
          <svg width="30" height="30" viewBox="0 0 50 50" fill="none">
            <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
            <circle cx="21" cy="14" r="2" fill="white"/>
            <circle cx="29" cy="14" r="2" fill="white"/>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>Shikshantaram OS</span>
            <span style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: 11, color: '#7c3aed', letterSpacing: 0.4, textTransform: 'uppercase' }}>Admin Panel</span>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '0 14px 14px' }}>
          <RoleBadge role={role} displayName={displayName || user?.email || ''} />
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
          {navGroups.map((group, gi) => (
            <div key={group.title} style={{ marginBottom: gi === navGroups.length - 1 ? 0 : 18 }}>
              <div style={{
                fontFamily: 'DM Sans', fontWeight: 700, fontSize: 10, letterSpacing: 1.2,
                textTransform: 'uppercase', color: '#94a3b8', padding: '8px 14px 6px',
              }}>{group.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map(item => <NavButton key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer actions */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12.5, color: '#7c3aed', textAlign: 'left',
          }}>
            <span style={{ fontSize: 14 }}>←</span> Back to App
          </button>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12.5, color: '#ef4444', textAlign: 'left',
          }}>
            <span style={{ fontSize: 14 }}>⎋</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Section header */}
        <header style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(15,23,42,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{activeItem?.icon || '✨'}</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{activeItem?.label || 'Admin'}</span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#94a3b8' }}>
                {role === 'owner' ? 'Full owner access' : `Signed in as ${role}`}
              </span>
            </div>
          </div>
        </header>

        {/* Role welcome strip for non-owner roles */}
        {role !== 'owner' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 32px', background: 'rgba(124,58,237,0.04)', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
            <span style={{ fontSize: 18 }}>{role === 'admin' ? '🔧' : role === 'manager' ? '📋' : '⚡'}</span>
            <div style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#475569' }}>
              {role === 'operator' && 'You can approve or reject new signup requests.'}
              {role === 'manager' && 'You can manage signups and user details.'}
              {role === 'admin' && 'You have full operational access.'}
            </div>
          </div>
        )}

        {/* Content */}
        <div id="main-content-area" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          {loading && tab !== 'team' ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : (
            <>
              {tab === 'overview' && canDo.viewOverview(role) && <OverviewTab stats={stats} users={users} emailMap={emailMap} setAdminTab={setTab} />}
              {tab === 'users' && canDo.viewUsers(role) && <UsersTab users={users} emailMap={emailMap} onRefresh={loadData} showToast={showAdminToast} logActivity={logActivity} adminId={adminId} role={role} />}
              {tab === 'signups' && canDo.viewSignups(role) && <SignupsTab onRefresh={loadData} showToast={showAdminToast} logActivity={logActivity} />}
              {tab === 'trials' && canDo.viewSignups(role) && <AdminTrialTab showToast={showAdminToast} />}
              {tab === 'credits' && canDo.viewAnalytics(role) && <AdminCreditsTab showToast={showAdminToast} />}
              {tab === 'ai-analytics' && canDo.viewAnalytics(role) && <AIAnalyticsTab dateRange={analyticsDateRange} onDateRangeChange={setAnalyticsDateRange} />}
              {tab === 'ai-settings' && role === 'owner' && <AdminAISettingsTab />}
              {tab === 'security' && canDo.viewSecurity(role) && <SecurityTab adminId={adminId} showToast={showAdminToast} />}
              {tab === 'activity_log' && canDo.viewSecurity(role) && <AdminActivityLogTab showToast={showAdminToast} />}
              {tab === 'team' && canDo.viewTeam(role) && <TeamAccessTab showToast={showAdminToast} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
