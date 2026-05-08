import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PAYMENT_LINK = 'https://rzp.io/rzp/osaccess';

const bg: CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
};

const card: CSSProperties = {
  width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
  borderRadius: 24, padding: '36px 32px', border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.1)', animation: 'tpopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#0f172a', outline: 'none', boxSizing: 'border-box',
  background: '#f8fafc', transition: 'all 0.18s',
};

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontFamily: 'DM Sans, sans-serif',
};

const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#7c3aed';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
  e.currentTarget.style.background = 'white';
};
const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#e2e8f0';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = '#f8fafc';
};

const Logo = () => (
  <div style={{ textAlign: 'center', marginBottom: 8 }}>
    <svg width="40" height="40" viewBox="0 0 50 50" fill="none" style={{ margin: '0 auto' }}>
      <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
      <circle cx="21" cy="14" r="2" fill="white"/>
      <circle cx="29" cy="14" r="2" fill="white"/>
    </svg>
    <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 20, color: '#0f172a', letterSpacing: '-0.03em', marginTop: 10 }}>Shikshantaram OS</div>
    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748b', marginTop: 4 }}>Limited 7-Day Trial Access</div>
  </div>
);

type Step = 'form' | 'otp' | 'success';

export default function TrialPage() {
  const [step, setStep] = useState<Step>('form');
  const [trialRequestId, setTrialRequestId] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0); // # of resends used (excludes initial send)
  const MAX_RESENDS = 3;
  const COOLDOWN_LADDER = [60, 120, 300]; // seconds: 1st=60s, 2nd=120s, 3rd=300s

  // SEO: noindex + page title
  useEffect(() => {
    document.title = 'Free 7-Day Trial — Shikshantaram OS';
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => { meta?.setAttribute('content', 'index, follow'); };
  }, []);

  // Resend OTP cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const phoneDigits = phone.replace(/\D/g, '');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameValid = fullName.trim().length >= 2;
  const phoneValid = phoneDigits.length >= 7 && phoneDigits.length <= 15;
  const formValid = nameValid && emailValid && phoneValid && agreed;

  const submitForm = async () => {
    setError('');
    if (!formValid) { setError('Please fill all fields and agree to the terms.'); return; }
    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('submit-trial-request', {
        body: {
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: `${countryCode} ${phoneDigits}`.trim(),
        },
      });
      if (fnError) {
        // Try to extract the real error message from the function response body
        let realMsg = fnError.message || 'Could not submit. Please try again.';
        try {
          const ctxResp: Response | undefined = (fnError as any).context?.response ?? (fnError as any).context;
          if (ctxResp && typeof ctxResp.json === 'function') {
            const body = await ctxResp.clone().json();
            if (body?.error) realMsg = body.error;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(realMsg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setTrialRequestId((data as any).trial_request_id);
      setResendCooldown(60);
      setStep('otp');
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    setOtpError('');
    if (otp.length !== 6) { setOtpError('Enter the 6-digit code we sent.'); return; }
    if (!trialRequestId) { setOtpError('Session expired. Please start over.'); return; }
    setVerifying(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-trial-otp', {
        body: { trial_request_id: trialRequestId, otp_code: otp.trim() },
      });
      if (fnError) {
        let realMsg = fnError.message || 'Verification failed.';
        try {
          const ctxResp: Response | undefined = (fnError as any).context?.response ?? (fnError as any).context;
          if (ctxResp && typeof ctxResp.json === 'function') {
            const body = await ctxResp.clone().json();
            if (body?.error) realMsg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(realMsg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setStep('success');
    } catch (e: any) {
      setOtpError(e.message || 'Invalid or expired code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    if (resendCount >= MAX_RESENDS) {
      setOtpError(`Resend limit reached (${MAX_RESENDS}/${MAX_RESENDS}). Please start over with a different email.`);
      return;
    }
    setOtpError('');
    try {
      await supabase.functions.invoke('submit-trial-request', {
        body: {
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: `${countryCode} ${phoneDigits}`.trim(),
          resend: true,
        },
      });
      const nextCount = resendCount + 1;
      setResendCount(nextCount);
      const nextCooldown = COOLDOWN_LADDER[Math.min(nextCount - 1, COOLDOWN_LADDER.length - 1)];
      setResendCooldown(nextCooldown);
    } catch {
      setOtpError('Could not resend. Please try again in a moment.');
    }
  };

  return (
    <div style={bg}>
      <style>{`@keyframes tpopIn { from { opacity:0; transform:scale(0.94) translateY(12px);} to { opacity:1; transform:scale(1) translateY(0);} }`}</style>
      <div style={card}>
        <Logo />

        {step === 'form' && (
          <>
            {/* Trust strip */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14, marginBottom: 18 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 50, padding: '5px 14px',
                fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, fontWeight: 700, color: '#047857',
              }}>✨ 100 free credits · 7 days · No card required</span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 22, color: '#0f172a', letterSpacing: '-0.02em' }}>Start Your Free Trial</div>
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#64748b', textAlign: 'center', marginBottom: 22, lineHeight: 1.55 }}>
              Get 7 days of access to test the platform. Verify your email to lock in your spot.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                style={inputStyle} placeholder="e.g. Abhinav Sharma" onFocus={focusInput} onBlur={blurInput} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="yourname@gmail.com" onFocus={focusInput} onBlur={blurInput} />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>We'll send your verification code here.</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Phone Number *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  style={{ ...inputStyle, padding: '12px 8px', cursor: 'pointer', appearance: 'none', paddingRight: 24 } as any}>
                  <option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option><option value="+61">🇦🇺 +61</option>
                  <option value="+971">🇦🇪 +971</option><option value="+65">🇸🇬 +65</option>
                  <option value="+60">🇲🇾 +60</option><option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option><option value="+81">🇯🇵 +81</option>
                </select>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                  style={inputStyle} placeholder="98765 43210" onFocus={focusInput} onBlur={blurInput} />
              </div>
            </div>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: '#7c3aed', cursor: 'pointer' }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>
                I agree to receive my trial access details by email and understand my access expires after 7 days.
              </span>
            </label>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button onClick={submitForm} disabled={submitting || !formValid}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                background: submitting || !formValid ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: 'white', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14,
                cursor: submitting || !formValid ? 'not-allowed' : 'pointer',
                boxShadow: submitting || !formValid ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}>
              {submitting ? 'Sending Code...' : 'Send Verification Code →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#94a3b8' }}>
              Already have an account? <a href="/" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>Sign in →</a>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginTop: 18, marginBottom: 6 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 22, color: '#0f172a' }}>Check Your Email</div>
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#64748b', textAlign: 'center', marginBottom: 22, lineHeight: 1.55 }}>
              We sent a 6-digit code to <strong style={{ color: '#0f172a' }}>{email}</strong>. Enter it below to confirm your trial.
            </div>

            <input type="text" inputMode="numeric" maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...inputStyle, fontSize: 24, fontWeight: 800, textAlign: 'center', letterSpacing: '0.5em', padding: '16px 14px' }}
              placeholder="••••••"
              onFocus={focusInput as any} onBlur={blurInput as any}
            />

            {otpError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', marginTop: 14 }}>
                {otpError}
              </div>
            )}

            <button onClick={verifyOtp} disabled={verifying || otp.length !== 6}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', marginTop: 18,
                background: verifying || otp.length !== 6 ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: 'white', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14,
                cursor: verifying || otp.length !== 6 ? 'not-allowed' : 'pointer',
                boxShadow: verifying || otp.length !== 6 ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
              }}>
              {verifying ? 'Verifying...' : 'Verify & Continue →'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>
              <button onClick={() => { setStep('form'); setOtp(''); setOtpError(''); setResendCount(0); setResendCooldown(0); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                ← Use different email
              </button>
              {(() => {
                const exhausted = resendCount >= MAX_RESENDS;
                const disabled = resendCooldown > 0 || exhausted;
                let label: string;
                if (exhausted) label = `Limit reached (${MAX_RESENDS}/${MAX_RESENDS})`;
                else if (resendCooldown > 0) {
                  const mm = Math.floor(resendCooldown / 60);
                  const ss = resendCooldown % 60;
                  label = mm > 0 ? `Resend in ${mm}m ${ss}s` : `Resend in ${ss}s`;
                } else {
                  label = `Resend code (${MAX_RESENDS - resendCount} left)`;
                }
                return (
                  <button onClick={resendOtp} disabled={disabled}
                    style={{ background: 'none', border: 'none', color: disabled ? '#cbd5e1' : '#7c3aed', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12 }}
                    title={exhausted ? 'Maximum resends reached for this session' : ''}>
                    {label}
                  </button>
                );
              })()}
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
                <span style={{ fontSize: 32 }}>✓</span>
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 22, color: '#0f172a', marginBottom: 8 }}>You're On The List!</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 22 }}>
                Your registration is confirmed. We'll review your request and send your trial access details to <strong style={{ color: '#0f172a' }}>{email}</strong> within 24 hours.
              </div>

              <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 14, padding: 16, marginBottom: 18, textAlign: 'left' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>What you'll get:</div>
                {[
                  '🎁 100 free trial credits',
                  '⏱ 7 days of access',
                  '🛠 2 live tools: Niche Clarity & Product Navigator',
                  '📧 Login credentials by email',
                ].map(t => (
                  <div key={t} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#475569', padding: '4px 0' }}>{t}</div>
                ))}
              </div>

              <a href="https://wa.me/918933966250?text=Hi%2C%20I%20just%20submitted%20a%20trial%20request%20for%20Shikshantaram%20OS."
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '13px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white',
                  fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
                💬 Message us on WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
