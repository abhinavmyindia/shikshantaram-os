import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import SecurityTab from '@/components/AdminSecurityTab';
import { useAdminRole, canDo, roleMeta, type AdminRole } from '@/hooks/useAdminRole';
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
  basic: { bg: '#dcfce7', color: '#15803d' },
  premium: { bg: '#ede9fe', color: '#7c3aed' },
  beta: { bg: '#fce7f3', color: '#be185d' },
  revoked: { bg: '#fee2e2', color: '#991b1b' },
};

const tierGradients: Record<string, string> = {
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
function DeleteConfirmModal({ userName, onConfirm, onCancel, deleting }: {
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
function EditUserModal({ user, email, onClose, onSave, onDelete, showToast, logActivity }: {
  user: UserRow; email: string; onClose: () => void; onSave: () => void; onDelete: (id: string, name: string) => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    fullName: user.full_name, email, phone: user.phone || '', accessTier: user.access_tier,
    paymentStatus: user.payment_status, paymentAmount: user.payment_amount || 0,
    isBetaUser: user.is_beta_user || false, notes: user.notes || '',
  });
  const [originalEmail] = useState(email);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState([true, true, false]);
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = form.fullName !== user.full_name || form.email !== email || form.phone !== (user.phone || '') ||
    form.accessTier !== user.access_tier || form.paymentStatus !== user.payment_status ||
    form.paymentAmount !== (user.payment_amount || 0) || form.isBetaUser !== (user.is_beta_user || false) ||
    form.notes !== (user.notes || '');

  const handleClose = () => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return;
    onClose();
  };

  const toggleSection = (i: number) => setSections(s => s.map((v, j) => j === i ? !v : v));

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('user_profiles').update({
        full_name: form.fullName.trim(), phone: form.phone.trim(), access_tier: form.accessTier,
        payment_status: form.paymentStatus, payment_amount: form.paymentAmount || 0,
        is_beta_user: form.isBetaUser, notes: form.notes.trim(), updated_at: new Date().toISOString(),
      } as any).eq('id', user.id);
      if (form.email !== originalEmail) {
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
          body: { userId: user.id, newEmail: form.email.toLowerCase().trim() },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
      }
      await logActivity('user_edited', user.id, form.fullName, {
        tier: form.accessTier, payment: form.paymentStatus,
        ...(form.email !== originalEmail ? { email_changed: form.email } : {}),
      });
      onSave();
      showToast(`✅ ${form.fullName} updated successfully.`);
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async (type: string) => {
    try {
      if (type === 'access') {
        await supabase.functions.invoke('send-upgrade-email', {
          body: { email: form.email, full_name: form.fullName, access_tier: form.accessTier },
        });
      } else {
        const tempPwd = 'Shk' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 5);
        await supabase.functions.invoke('admin-reset-password', { body: { user_id: user.id, new_password: tempPwd } });
        await supabase.functions.invoke('send-welcome-email', {
          body: { email: form.email, full_name: form.fullName, access_tier: form.accessTier, temp_password: tempPwd, login_url: 'https://app.shikshantaram.in' },
        });
      }
      setEmailSent(p => ({ ...p, [type]: true }));
      setTimeout(() => setEmailSent(p => ({ ...p, [type]: false })), 3000);
      showToast(`📧 Email sent to ${form.email}`);
    } catch (err: any) {
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
            <SectionHeader index={1} icon="🛡️" iconBg="#dcfce7" iconColor="#059669" title="Access & Payment" />
            {sections[1] && (
              <div style={{ padding: '12px 0' }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Access Tier</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
                  {[
                    { key: 'basic', label: 'Basic', desc: 'Niche + Product', badge: '2 tools', color: '#059669' },
                    { key: 'premium', label: 'Premium', desc: 'All tools', badge: 'Full access ✦', color: '#7c3aed' },
                    { key: 'beta', label: 'Beta', desc: 'All tools + feedback', badge: 'Beta 🧪', color: '#ec4899' },
                  ].map(t => (
                    <div key={t.key} onClick={() => setForm(f => ({ ...f, accessTier: t.key }))} style={{
                      borderRadius: 10, padding: 12, cursor: 'pointer',
                      border: `2px solid ${form.accessTier === t.key ? t.color : '#e2e8f0'}`,
                      background: form.accessTier === t.key ? `${t.color}0F` : '#f8fafc',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${form.accessTier === t.key ? t.color : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {form.accessTier === t.key && <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />}
                        </div>
                        <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                      <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: t.color, marginTop: 4 }}>{t.badge}</div>
                    </div>
                  ))}
                </div>
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
                  <input type="number" value={form.paymentAmount} onChange={e => setForm(f => ({ ...f, paymentAmount: parseInt(e.target.value) || 0 }))} placeholder="0" style={inputStyle} />
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
            <SectionHeader index={2} icon="🔔" iconBg="#fff7ed" iconColor="#ea580c" title="Send Email Notification"
              pill={<span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 10, padding: '2px 8px', borderRadius: 20, marginLeft: 6 }}>Optional</span>} />
            {sections[2] && (
              <div style={{ padding: '12px 0' }}>
                <button onClick={() => sendEmail('access')} style={{ width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left', marginBottom: 10 }}>
                  📧 Send Access Updated Email {emailSent.access && <span style={{ marginLeft: 8, color: '#059669' }}>✅ Sent!</span>}
                </button>
                <button onClick={() => sendEmail('password')} style={{ width: '100%', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0891b2', borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  🔑 Send New Password Email {emailSent.password && <span style={{ marginLeft: 8, color: '#059669' }}>✅ Sent!</span>}
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
    </>
  );
}

// ─── SECURITY PROFILE MODAL ────────────────────────────────
function SecurityProfileModal({ userId, userEmail, userName, onClose, adminId, showToast }: {
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
  const defaultTier = request.payment_type === 'full' ? 'premium' : 'basic';
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
function AIAnalyticsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [showLogFeed, setShowLogFeed] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => { fetchAnalytics(dateRange); }, []);

  const fetchAnalytics = async (range: string) => {
    setLoading(true);
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

      setAnalytics({ totalCalls, totalTokens, totalCostUsd, uniqueUsers, byModule, byModel, byUser, byDay, topCallTypes });
    } catch (err) {
      console.error('AI analytics fetch error:', err);
    }
    setLoading(false);
  };

  const handleRangeChange = (r: string) => { setDateRange(r); fetchAnalytics(r); };
  const formatCallType = (ct: string) => ct.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const moduleColors: Record<string, string> = { product_navigator: '#ea580c', offer_creation: '#f59e0b', funnel_builder: '#06b6d4', niche_clarity: '#7c3aed' };
  const moduleNames: Record<string, string> = { product_navigator: 'Product Navigator', offer_creation: 'Offer Creation', funnel_builder: 'Funnel Builder', niche_clarity: 'Niche Clarity' };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>Period:</span>
        {ranges.map(r => (
          <button key={r.id} onClick={() => handleRangeChange(r.id)} style={{
            padding: '6px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans',
            background: dateRange === r.id ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : '#f8fafc',
            color: dateRange === r.id ? 'white' : '#64748b',
          }}>{r.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => fetchAnalytics(dateRange)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' }}>🔄 Refresh</button>
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
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 14 }}>Top Users by Cost</div>
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
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 16 }}>Daily AI Usage</div>
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
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────
function OverviewTab({ stats, users, emailMap }: { stats: any; users: UserRow[]; emailMap: Record<string, string> }) {
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>({ activeToday: 0, aiCallsToday: 0, tokensToday: 0, topModule: null });
  const [hourlyData, setHourlyData] = useState<number[]>(new Array(24).fill(0));
  const [peakHour, setPeakHour] = useState<{ hour: number; count: number }>({ hour: 0, count: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [newUsers, setNewUsers] = useState<UserRow[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const moduleColors: Record<string, string> = { product_navigator: '#ea580c', offer_creation: '#f59e0b', funnel_builder: '#06b6d4', niche_clarity: '#7c3aed' };
  const moduleNames: Record<string, string> = { product_navigator: 'Product Navigator', offer_creation: 'Offer Creation', funnel_builder: 'Funnel Builder', niche_clarity: 'Niche Clarity' };

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

      const [presRes, activeTodayRes, activeWeekRes, totalRes, aiTodayRes, recentRes] = await Promise.all([
        supabase.from('user_presence').select('user_id, user_email, user_name, last_seen, current_page, session_start').gte('last_seen', twoMinAgo).order('last_seen', { ascending: false }),
        supabase.from('user_presence').select('*', { count: 'exact', head: true }).gte('last_seen', todayStart),
        supabase.from('user_presence').select('*', { count: 'exact', head: true }).gte('last_seen', weekStart),
        supabase.from('user_presence').select('*', { count: 'exact', head: true }),
        supabase.from('ai_usage_logs').select('total_tokens, module, created_at, call_type, user_name, user_email, model').gte('created_at', todayStart).order('created_at', { ascending: false }),
        supabase.from('ai_usage_logs').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      setPresenceData(presRes.data || []);

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

  return (
    <div>
      {/* STRIP 1 — ACTIVE IN APP NOW */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(5,150,105,0.08),rgba(16,185,129,0.05))',
        border: '1px solid rgba(5,150,105,0.2)', borderRadius: 20, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', marginRight: 8, animation: 'pulseDot 2s infinite' }} />
            <div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 800, color: '#059669', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>ACTIVE IN APP NOW</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 48, color: '#059669' }} title="Users who have sent a heartbeat in the last 2 minutes. Refreshes every 30s.">{onlineCount}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' }}>users right now</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { value: todayStats.activeToday || 0, label: 'Active Today' },
              { value: todayStats.activeWeek || 0, label: 'This Week' },
              { value: todayStats.totalUsers || stats.total, label: 'All Time' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: '#0f172a' }}>{m.value}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' as const, marginTop: 8 }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>🔄 Refreshes every 30s · Last: {lastRefreshed.toLocaleTimeString('en-IN')}</span>
        </div>
      </div>

      {/* STRIP 2 — WHO'S ACTIVE */}
      {onlineCount > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 12 }}>👥 Who's Active Right Now</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' as const, paddingBottom: 4 }}>
            {onlineUsers.slice(0, 8).map((u: any) => (
              <div key={u.user_id} style={{
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 50, padding: '6px 14px 6px 8px',
                display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
              }}>
                <div style={{ position: 'relative' as const }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 700, fontSize: 10, color: 'white' }}>{(u.user_name || 'U').charAt(0).toUpperCase()}</div>
                  <div style={{ position: 'absolute' as const, bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid white' }} />
                </div>
                <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{u.user_name || 'User'}</span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>· {formatPageName(u.current_page)}</span>
              </div>
            ))}
            {onlineCount > 8 && (
              <div style={{ background: '#f1f5f9', borderRadius: 50, padding: '6px 14px', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                +{onlineCount - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* STRIP 3 — KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { icon: '👤', bg: 'rgba(5,150,105,0.1)', value: todayStats.activeToday || 0, label: 'Users Active Today', sub: 'unique since midnight' },
          { icon: '🤖', bg: 'rgba(6,182,212,0.1)', value: todayStats.aiCallsToday || 0, label: 'AI Calls Today', sub: 'across all modules' },
          { icon: '⚡', bg: 'rgba(245,158,11,0.1)', value: `${((todayStats.tokensToday || 0) / 1000).toFixed(1)}K`, label: 'Tokens Today', sub: 'input + output' },
          { icon: '🔥', bg: 'rgba(234,88,12,0.1)', value: todayStats.topModule ? (moduleNames[todayStats.topModule[0]] || todayStats.topModule[0]) : '—', label: 'Hottest Tool Today', sub: `${todayStats.topModule?.[1] || 0} calls` },
        ].map(k => (
          <div key={k.label} style={{ ...glassCard, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{k.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{k.icon}</div>
            </div>
            <div style={{ fontFamily: 'Sora', fontSize: typeof k.value === 'string' && k.value.length > 8 ? 16 : 28, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{k.value}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* STRIP 4 — HOURLY ACTIVITY */}
      <div style={{ ...glassCard, padding: 20, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>⏰ Today's Activity by Hour</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>When are your users most active?</div>
        <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {hourlyData.map((count, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${i}:00 — ${count} calls`}>
              <div style={{
                width: '100%', minHeight: 2, height: `${Math.max(2, (count / maxHourly) * 100)}%`,
                background: i === currentHour ? 'linear-gradient(180deg,#ea580c,#f59e0b)' : 'linear-gradient(180deg,#06b6d4,#3b82f6)',
                borderRadius: '3px 3px 0 0',
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {hourLabels.map((l, i) => (
            <span key={i} style={{ fontFamily: 'DM Sans', fontSize: 9, color: '#94a3b8', flex: 1, textAlign: 'center' as const }}>{l}</span>
          ))}
        </div>
        {peakHour.count > 0 && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', marginTop: 10 }}>
            🔥 Peak hour today: {peakHour.hour}:00 ({peakHour.count} calls)
          </div>
        )}
      </div>

      {/* STRIP 5 — RECENT ACTIVITY */}
      <div style={{ ...glassCard, padding: 20, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 12 }}>📋 Recent Activity</div>
        {recentLogs.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: 20, color: '#94a3b8', fontSize: 13 }}>No AI activity today yet.</div>
        ) : (
          recentLogs.map((log: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', width: 60, flexShrink: 0 }}>{formatDate(log.created_at)}</span>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 8, color: 'white', flexShrink: 0 }}>{(log.user_name || 'U').charAt(0).toUpperCase()}</div>
              <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, color: '#0f172a', width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{log.user_name || 'Unknown'}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: 'white', background: moduleColors[log.module] || '#64748b', flexShrink: 0 }}>{(moduleNames[log.module] || log.module || '').replace(/_/g, ' ')}</span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', flex: 1 }}>{formatCallType(log.call_type)}</span>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: log.model?.includes('flash') ? '#06b6d4' : '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 700, fontSize: 9, color: 'white', flexShrink: 0 }}>{log.model?.includes('flash') ? 'F' : 'P'}</span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{(log.total_tokens || 0).toLocaleString()}t</span>
            </div>
          ))
        )}
      </div>

      {/* STRIP 6 — NEW THIS WEEK */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 12 }}>🆕 New Signups This Week</div>
        {newUsers.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: 20, color: '#94a3b8', fontFamily: 'DM Sans', fontSize: 13 }}>No new signups this week.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {newUsers.slice(0, 6).map(u => {
              const tc = tierColors[u.access_tier] || tierColors.basic;
              return (
                <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 9, color: 'white' }}>{(u.full_name || 'U').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12.5, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.full_name}</div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>{emailMap[u.id] || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const }}>{u.access_tier}</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#94a3b8' }}>Joined {formatDate(u.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1.5px solid #e2e8f0' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'DM Sans' }} />
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
              {['Avatar', 'Name', 'Email', 'Tier', 'Joined', 'Actions'].map(h => (
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
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: tierGradients[u.access_tier] || tierGradients.basic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 10, color: 'white' }}>
                      {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name || 'Unknown'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{emailMap[u.id] || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{u.access_tier}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{formatDate(u.created_at)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canDo.editUsers(role) && <button onClick={() => setEditUser(u)} title="Edit" style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✏️</button>}
                      {canDo.blockUsers(role) && <button onClick={() => setSecurityUser(u)} title="View Security" style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🛡️</button>}
                      {canDo.deleteUsers(role) && <button onClick={() => setDeleteUser(u)} title="Delete" style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🗑</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>No users found.</td></tr>
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
    </div>
  );
}

// ─── SIGNUPS TAB ─────────────────────────────────────────────
function SignupsTab({ onRefresh, showToast, logActivity }: { onRefresh: () => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void> }) {
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveRequest, setApproveRequest] = useState<SignupRow | null>(null);

  useEffect(() => { fetchSignups(); }, []);

  const fetchSignups = async () => {
    setLoading(true);
    const { data } = await supabase.from('signup_requests').select('*').order('submitted_at', { ascending: false });
    setSignups((data || []) as unknown as SignupRow[]);
    setLoading(false);
  };

  const pendingSignups = signups.filter(s => s.status === 'pending');
  const otherSignups = signups.filter(s => s.status !== 'pending');
  const pendingCount = pendingSignups.length;
  const approvedCount = signups.filter(s => s.status === 'approved').length;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const approvedThisWeek = signups.filter(s => s.status === 'approved' && s.reviewed_at && s.reviewed_at >= weekAgo).length;

  const rejectSignup = async (requestId: string) => {
    const req = signups.find(s => s.id === requestId);
    if (!confirm(`Reject ${req?.full_name}?`)) return;
    await supabase.from('signup_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() } as any).eq('id', requestId);
    await logActivity('signup_rejected', null, req?.full_name || null, { email: req?.email });
    fetchSignups();
    showToast('❌ Request rejected.', 'warning');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;

  const SignupRow = ({ s }: { s: SignupRow }) => (
    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
      <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{s.full_name}</td>
      <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{s.email}</td>
      <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{s.phone}</td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{
          fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
          background: s.payment_type === 'full' ? '#ede9fe' : '#fef9c3',
          color: s.payment_type === 'full' ? '#7c3aed' : '#92400e',
        }}>{s.payment_type === 'full' ? 'FULL' : 'RESERVE'}</span>
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
            <button onClick={() => rejectSignup(s.id)} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✗ Reject</button>
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#92400e' }}>⏳ {pendingCount} Pending</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>✅ {approvedThisWeek} Approved This Week</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#f0f9ff', color: '#0891b2' }}>📊 {approvedCount} All Time Approved</span>
      </div>

      {/* Pending Section */}
      {pendingSignups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>⏳ Pending Approval</div>
          <div style={{ ...glassCard, overflow: 'hidden', border: '1.5px solid #fde68a' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fffbeb' }}>
                  {['Name', 'Email', 'Phone', 'Payment', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingSignups.map(s => <SignupRow key={s.id} s={s} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approved/Rejected Section */}
      {otherSignups.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 10 }}>📋 Approved / Rejected</div>
          <div style={{ ...glassCard, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Name', 'Email', 'Phone', 'Payment', 'Submitted', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otherSignups.map(s => <SignupRow key={s.id} s={s} />)}
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
    </div>
  );
}

// ─── MAIN ADMIN PANEL ────────────────────────────────────────
export default function AdminPanel() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ total: 0, basic: 0, premium: 0 });
  const [loading, setLoading] = useState(true);
  const [adminToast, setAdminToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const showAdminToast = (message: string, type = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => setAdminToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    const [usersRes, emailsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
      supabase.functions.invoke('admin-list-emails'),
    ]);
    const u = (usersRes.data || []) as unknown as UserRow[];
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

  const tabDefs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'users', label: '👥 Users' },
    { id: 'signups', label: '📝 Signups' },
    { id: 'ai-analytics', label: '⚡ AI Analytics' },
    { id: 'security', label: '🔒 Security' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)' }}>
      <style>{popInKeyframes}</style>
      <AdminToast toast={adminToast} onClose={() => setAdminToast(null)} />

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

      {/* Tab bar — exactly 5 tabs per spec */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', borderRadius: 0 }}>
        {tabDefs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans',
            fontWeight: tab === t.id ? 800 : 500, fontSize: 13,
            background: tab === t.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
            color: tab === t.id ? 'white' : '#64748b',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { if (tab !== t.id) (e.currentTarget.style.color = '#374151'); }}
            onMouseLeave={e => { if (tab !== t.id) (e.currentTarget.style.color = '#64748b'); }}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab stats={stats} users={users} emailMap={emailMap} />}
            {tab === 'users' && <UsersTab users={users} emailMap={emailMap} onRefresh={loadData} showToast={showAdminToast} logActivity={logActivity} adminId={adminId} />}
            {tab === 'signups' && <SignupsTab onRefresh={loadData} showToast={showAdminToast} logActivity={logActivity} />}
            {tab === 'ai-analytics' && <AIAnalyticsTab />}
            {tab === 'security' && <SecurityTab adminId={adminId} showToast={showAdminToast} />}
          </>
        )}
      </div>
    </div>
  );
}
