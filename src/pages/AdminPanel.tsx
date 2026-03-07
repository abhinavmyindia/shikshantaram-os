import { useState, useEffect } from 'react';
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
`;

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
        {/* Header */}
        <div style={{ height: 60, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🗑</span>
          <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>Delete User</span>
        </div>
        {/* Body */}
        <div style={{ background: 'white', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Are you absolutely sure?</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 13.5, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
            This will permanently delete <strong>{userName}</strong>'s account and all their data. This action cannot be undone.
          </div>
          {/* What gets deleted */}
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', textAlign: 'left', marginBottom: 20 }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>The following will be permanently removed:</div>
            <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.8 }}>
              ✗ Authentication account (login access revoked)<br/>
              ✗ Profile data, usage history, session records<br/>
              ✗ All tool usage and analytics data
            </div>
          </div>
          {/* Confirm input */}
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Type DELETE to confirm</label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type DELETE here" style={{ ...inputStyle, border: '1.5px solid #fecaca' }} />
          </div>
          {/* Footer */}
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
function EditUserModal({ user, email, onClose, onSave, onDelete, showToast }: {
  user: UserRow; email: string; onClose: () => void; onSave: () => void; onDelete: (id: string, name: string) => void; showToast: (msg: string, type?: string) => void;
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
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        access_tier: form.accessTier,
        payment_status: form.paymentStatus,
        payment_amount: form.paymentAmount || 0,
        is_beta_user: form.isBetaUser,
        notes: form.notes.trim(),
        updated_at: new Date().toISOString(),
      } as any).eq('id', user.id);

      if (form.email !== originalEmail) {
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
          body: { userId: user.id, newEmail: form.email.toLowerCase().trim() },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
      }

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
        await supabase.functions.invoke('admin-reset-password', {
          body: { user_id: user.id, new_password: tempPwd },
        });
        await supabase.functions.invoke('send-welcome-email', {
          body: { email: form.email, full_name: form.fullName, access_tier: form.accessTier, temp_password: tempPwd, login_url: 'https://app.shikshantaram.in' },
        });
      }
      setEmailSent(p => ({ ...p, [type]: true }));
      setTimeout(() => setEmailSent(p => ({ ...p, [type]: false })), 3000);
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
          {/* Header */}
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

          {/* Body */}
          <div style={{ background: 'white', padding: '24px 24px 8px', overflowY: 'auto', flex: 1 }}>
            {/* Section 1 — Personal Details */}
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
                    <span style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: '#92400e' }}>⚠ Changing email updates authentication. The user must use the new email to log in.</span>
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

            {/* Section 2 — Access & Payment */}
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
                <div onClick={() => setForm(f => ({ ...f, accessTier: 'revoked' }))} style={{ cursor: 'pointer', marginTop: 4, marginBottom: form.accessTier === 'revoked' ? 0 : 14 }}>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#ef4444' }}>🔒 Revoke access (block this user)</span>
                </div>
                {form.accessTier === 'revoked' && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginTop: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>This user will be immediately blocked from logging in.</span>
                  </div>
                )}

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
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Enter 0 for beta users or if not applicable.</div>
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

            {/* Section 3 — Send Notification */}
            <SectionHeader index={2} icon="🔔" iconBg="#fff7ed" iconColor="#ea580c" title="Send Email Notification"
              pill={<span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 10, padding: '2px 8px', borderRadius: 20, marginLeft: 6 }}>Optional</span>} />
            {sections[2] && (
              <div style={{ padding: '12px 0' }}>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>Send a notification email to this user about their access change.</div>
                <button onClick={() => sendEmail('access')} style={{ width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left', marginBottom: 10 }}>
                  📧 Send Access Updated Email {emailSent.access && <span style={{ marginLeft: 8, color: '#059669' }}>✅ Email sent!</span>}
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginTop: 2 }}>Notifies the user that their access tier has been changed.</div>
                </button>
                <button onClick={() => sendEmail('password')} style={{ width: '100%', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0891b2', borderRadius: 10, padding: '10px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  🔑 Send New Password Email {emailSent.password && <span style={{ marginLeft: 8, color: '#059669' }}>✅ Email sent!</span>}
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginTop: 2 }}>Generates a new password and sends login credentials to the user.</div>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setShowDelete(true)} style={{ background: 'none', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 10, padding: '9px 16px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              🗑 Delete User
            </button>
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

// ─── APPROVE ACCESS MODAL ────────────────────────────────────
function ApproveAccessModal({ request, onClose, onApproved, showToast }: {
  request: SignupRow; onClose: () => void; onApproved: () => void; showToast: (msg: string, type?: string) => void;
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
          email: request.email,
          full_name: request.full_name,
          phone: request.phone,
          temp_password: tempPassword,
          access_tier: selectedTier,
          payment_status: selectedTier === 'premium' ? 'paid' : selectedTier === 'beta' ? 'beta' : 'reserved',
          payment_amount: paymentAmount || 0,
          notes: approvalNotes,
          is_beta_user: selectedTier === 'beta',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error && !data?.already_exists) throw new Error(data.error);

      await supabase.from('signup_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', request.id);

      onClose();
      onApproved();
      showToast(`🎉 ${request.full_name} approved as ${selectedTier}! Email sent to ${request.email}`);
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '94%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ height: 64, background: 'linear-gradient(135deg,#059669,#10b981)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: 'white' }}>Approve Access</span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ background: 'white', padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* User summary */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: request.payment_type === 'full' ? tierGradients.premium : tierGradients.basic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 13, color: 'white' }}>
              {(request.full_name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{request.full_name}</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b' }}>{request.email}</div>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
              background: request.payment_type === 'full' ? '#ede9fe' : '#fef9c3',
              color: request.payment_type === 'full' ? '#7c3aed' : '#92400e',
            }}>{request.payment_type === 'full' ? 'Full Payment' : 'Reserve'}</span>
          </div>

          <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Choose Access Tier</div>
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>You decide what access to grant — regardless of what the user selected during signup.</div>

          {/* Tier cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { key: 'basic', icon: '🔓', label: 'Basic', desc: 'Niche Clarity + Product Navigator', badge: '2 of 8 tools', color: '#059669' },
              { key: 'premium', icon: '⚡', label: 'Premium', desc: 'All tools as they unlock', badge: 'Full access ✦', color: '#7c3aed' },
              { key: 'beta', icon: '🧪', label: 'Beta', desc: 'All tools + feedback widget', badge: 'Beta tester', color: '#ec4899' },
            ].map(t => (
              <div key={t.key} onClick={() => setSelectedTier(t.key)} style={{
                borderRadius: 12, padding: 14, cursor: 'pointer',
                border: `2px solid ${selectedTier === t.key ? t.color : '#e2e8f0'}`,
                background: selectedTier === t.key ? `${t.color}0F` : 'white',
                boxShadow: selectedTier === t.key ? `0 0 0 3px ${t.color}1F` : 'none',
              }}>
                <div style={{ fontSize: 20 }}>{t.icon}</div>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, color: '#0f172a', marginTop: 6 }}>{t.label}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', marginTop: 3 }}>{t.desc}</div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: t.color, marginTop: 4 }}>{t.badge}</div>
              </div>
            ))}
          </div>

          {/* Payment amount */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Payment Amount Received (₹)</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseInt(e.target.value) || 0)} placeholder="e.g. 999 or 4999" style={inputStyle} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Internal Notes (Optional)</label>
            <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="e.g. Paid on 7 March via UPI, referred by XYZ" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' } as React.CSSProperties} />
          </div>

          {/* Email preview */}
          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>📧 Confirmation email will be sent to:</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 2 }}>{request.email}</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Contains: login credentials + access details + app link</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '9px 18px', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirmApprove} disabled={approving} style={{
            background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none',
            borderRadius: 12, padding: '11px 22px', fontFamily: 'Sora', fontWeight: 800, fontSize: 14,
            boxShadow: '0 4px 14px rgba(5,150,105,0.35)', cursor: approving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, opacity: approving ? 0.7 : 1,
          }}>
            {approving && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
            {approving ? 'Creating account & sending email...' : '✅ Approve & Send Email →'}
          </button>
        </div>
      </div>
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
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [stats, setStats] = useState({ total: 0, activeToday: 0, basic: 0, premium: 0 });
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

  const tabs = ['📊 Overview', '👥 Users', '➕ Add User', '🔑 Reset Password', '💬 Feedback', '📝 Signups', '📋 Activity Log'];

  const logActivity = async (action_type: string, target_user_id: string | null, target_user_name: string | null, details: Record<string, any> = {}) => {
    if (!user) return;
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action_type,
      target_user_id,
      target_user_name,
      details,
    } as any);
  };

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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 24px', background: 'rgba(255,255,255,0.8)', borderBottom: '1px solid #f1f5f9' }}>
        {tabs.map(t => {
          const tabId = t.includes('Overview') ? 'overview' : t.includes('Users') ? 'users' : t.includes('Add') ? 'add' : t.includes('Reset') ? 'password' : t.includes('Signups') ? 'signups' : t.includes('Activity') ? 'activity' : 'feedback';
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
            {tab === 'overview' && <OverviewTab stats={stats} users={users} emailMap={emailMap} />}
            {tab === 'users' && <UsersTab users={users} emailMap={emailMap} onRefresh={loadData} showToast={showAdminToast} logActivity={logActivity} />}
            {tab === 'add' && <AddUserTab onSuccess={loadData} logActivity={logActivity} />}
            {tab === 'password' && <ResetPasswordTab users={users} logActivity={logActivity} />}
            {tab === 'feedback' && <FeedbackTab feedback={feedback} users={users} />}
            {tab === 'signups' && <SignupsTab onRefresh={loadData} showToast={showAdminToast} logActivity={logActivity} />}
            {tab === 'activity' && <ActivityLogTab users={users} emailMap={emailMap} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────
function OverviewTab({ stats, users, emailMap }: { stats: any; users: UserRow[]; emailMap: Record<string, string> }) {
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
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{emailMap[u.id] || '—'}</td>
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

// ─── USERS TAB ───────────────────────────────────────────────
function UsersTab({ users, emailMap, onRefresh, showToast, logActivity }: { users: UserRow[]; emailMap: Record<string, string>; onRefresh: () => void; showToast: (msg: string, type?: string) => void; logActivity: (a: string, id: string | null, name: string | null, d?: Record<string, any>) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = users.filter(u => {
    if (filter !== 'All' && u.access_tier !== filter.toLowerCase()) return false;
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: deleteUser.id } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
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
              {['Name', 'Email', 'Tier', 'Payment', 'Beta', 'Joined', 'Actions'].map(h => (
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
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: tierGradients[u.access_tier] || tierGradients.basic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: 10, color: 'white', flexShrink: 0 }}>
                        {(u.full_name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{emailMap[u.id] || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{u.access_tier}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#059669' }}>₹{u.payment_amount}</td>
                  <td style={{ padding: '10px 16px' }}>{u.is_beta_user ? '✅' : '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Edit */}
                      <button onClick={() => setEditUser(u)} style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#64748b' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#7c3aed'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                      >✏️</button>
                      {/* Delete */}
                      <button onClick={() => setDeleteUser(u)} style={{ width: 30, height: 30, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#64748b' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          email={emailMap[editUser.id] || ''}
          onClose={() => setEditUser(null)}
          onSave={() => { setEditUser(null); onRefresh(); }}
          onDelete={(id, name) => { onRefresh(); showToast(`🗑 ${name}'s account has been permanently deleted.`, 'warning'); }}
          showToast={showToast}
        />
      )}

      {deleteUser && (
        <DeleteConfirmModal
          userName={deleteUser.full_name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteUser(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// ─── ADD USER TAB (unchanged) ────────────────────────────────
function AddUserTab({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', tier: 'basic', paymentAmount: 0, notes: '', isBeta: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const normalizedEmail = form.email.toLowerCase().trim();
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email: normalizedEmail, full_name: form.fullName, phone: form.phone, access_tier: form.tier, payment_amount: form.paymentAmount, notes: form.notes, is_beta_user: form.isBeta },
      });
      if (error) throw new Error(error.message);
      if (data?.already_exists) {
        setResult({ success: false, message: `${normalizedEmail} already has an account. Use Reset Password if needed.` });
      } else {
        if (data?.error) throw new Error(data.error);
        await supabase.functions.invoke('send-welcome-email', {
          body: { email: normalizedEmail, full_name: form.fullName, access_tier: form.tier, temp_password: data.temp_password, login_url: 'https://app.shikshantaram.in' },
        });
        setResult({ success: true, message: `User added! Welcome email sent to ${normalizedEmail}` });
        onSuccess();
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to create user' });
    }
    setLoading(false);
  };

  const reset = () => { setForm({ fullName: '', email: '', phone: '', tier: 'basic', paymentAmount: 0, notes: '', isBeta: false }); setResult(null); };

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
            <button onClick={reset} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Add Another User</button>
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
                    background: form.tier === t ? '#7c3aed' : '#f1f5f9', color: form.tier === t ? 'white' : '#475569', textTransform: 'capitalize',
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
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' } as React.CSSProperties} placeholder="e.g. Referred by XYZ..." />
            </div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={form.isBeta} onChange={e => setForm({ ...form, isBeta: e.target.checked })} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Mark as Beta User</span>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Beta users see the feedback widget.</div>
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#15803d', fontSize: 12, marginBottom: 4 }}>✅ What happens next:</div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
                • An account is created with a temporary password<br/>
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

// ─── RESET PASSWORD TAB (unchanged) ──────────────────────────
function ResetPasswordTab({ users }: { users: UserRow[] }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()));

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', { body: { user_id: selectedUser, new_password: newPassword } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const userName = users.find(u => u.id === selectedUser)?.full_name || 'User';
      setResult({ success: true, message: `Password updated for ${userName}` });
      setNewPassword(''); setSelectedUser(''); setSearch('');
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to reset password' });
    }
    setLoading(false);
  };

  const generatePassword = () => { setNewPassword('Shk' + Math.random().toString(36).slice(2, 9).toUpperCase()); };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ ...glassCard, padding: '32px 28px' }}>
        <h2 style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 4 }}>Reset User Password</h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Select a user and set a new password for them.</p>
        {result && (
          <div style={{ background: result.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: result.success ? '#15803d' : '#991b1b', fontSize: 13 }}>{result.success ? '✅ ' : '❌ '}{result.message}</div>
          </div>
        )}
        <form onSubmit={handleReset}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Select User *</label>
            <input value={search} onChange={e => { setSearch(e.target.value); setSelectedUser(''); }} placeholder="Search by name..." style={inputStyle} />
            {search && !selectedUser && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, maxHeight: 180, overflow: 'auto', background: 'white' }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>No users found</div>
                ) : filteredUsers.map(u => {
                  const tc = tierColors[u.access_tier] || tierColors.basic;
                  return (
                    <div key={u.id} onClick={() => { setSelectedUser(u.id); setSearch(u.full_name); }} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}
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
                })}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>New Password *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input required value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Min 6 characters" minLength={6} />
              <button type="button" onClick={generatePassword} style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#f8fafc', color: '#7c3aed', whiteSpace: 'nowrap' }}>🎲 Generate</button>
            </div>
          </div>
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 12, marginBottom: 4 }}>⚠️ Important:</div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.8 }}>• The user will need to use this new password to log in<br/>• Make sure to communicate the new password securely</div>
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

// ─── FEEDBACK TAB (unchanged) ────────────────────────────────
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'niche-clarity', 'product-navigator', 'overall'].map(t => (
          <button key={t} onClick={() => setToolFilter(t)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: toolFilter === t ? '#7c3aed' : '#f1f5f9', color: toolFilter === t ? 'white' : '#64748b', textTransform: 'capitalize',
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

// ─── SIGNUPS TAB ─────────────────────────────────────────────
function SignupsTab({ onRefresh, showToast }: { onRefresh: () => void; showToast: (msg: string, type?: string) => void }) {
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [approveRequest, setApproveRequest] = useState<SignupRow | null>(null);

  useEffect(() => { fetchSignups(); }, []);

  const fetchSignups = async () => {
    setLoading(true);
    const { data } = await supabase.from('signup_requests').select('*').order('submitted_at', { ascending: false });
    setSignups((data || []) as unknown as SignupRow[]);
    setLoading(false);
  };

  const pendingCount = signups.filter(s => s.status === 'pending').length;
  const approvedCount = signups.filter(s => s.status === 'approved').length;
  const rejectedCount = signups.filter(s => s.status === 'rejected').length;
  const filtered = signups.filter(s => filter === 'all' || s.status === filter);

  const rejectSignup = async (requestId: string) => {
    await supabase.from('signup_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() } as any).eq('id', requestId);
    fetchSignups();
    showToast('Request rejected.', 'warning');
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#92400e' }}>⏳ {pendingCount} Pending</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>✅ {approvedCount} Approved</span>
        <span style={{ padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>❌ {rejectedCount} Rejected</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: 'transparent', color: filter === f ? '#7c3aed' : '#64748b',
            borderBottom: filter === f ? '2px solid #7c3aed' : '2px solid transparent', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ ...glassCard, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Email', 'Phone', 'Payment', 'Submitted', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{s.full_name}</td>
                <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{s.email}</td>
                <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#64748b' }}>{s.phone}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                    background: s.payment_type === 'full' ? '#ede9fe' : '#fef9c3',
                    color: s.payment_type === 'full' ? '#7c3aed' : '#92400e',
                  }}>{s.payment_type === 'full' ? 'FULL PAYMENT' : 'RESERVE'}</span>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{relativeTime(s.submitted_at)}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                    background: s.status === 'pending' ? '#fef9c3' : s.status === 'approved' ? '#dcfce7' : '#fee2e2',
                    color: s.status === 'pending' ? '#92400e' : s.status === 'approved' ? '#15803d' : '#991b1b',
                  }}>{s.status}</span>
                  {s.status !== 'pending' && s.reviewed_at && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.status === 'approved' ? 'Approved' : 'Rejected'} {relativeTime(s.reviewed_at)}</div>
                  )}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {s.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setApproveRequest(s)} style={{
                        background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                        borderRadius: 8, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700,
                        fontSize: 12, cursor: 'pointer', transition: 'all 0.18s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.color = '#15803d'; }}
                      >✅ Approve</button>
                      <button onClick={() => rejectSignup(s.id)} style={{
                        background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
                        borderRadius: 8, padding: '6px 14px', fontFamily: 'DM Sans', fontWeight: 700,
                        fontSize: 12, cursor: 'pointer', transition: 'all 0.18s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }}
                      >✗ Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>No signup requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {approveRequest && (
        <ApproveAccessModal
          request={approveRequest}
          onClose={() => setApproveRequest(null)}
          onApproved={() => { fetchSignups(); onRefresh(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
