import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { initSession } from '@/utils/sessionSecurity';
import SecurityBlockPopup from '@/components/SecurityBlockPopup';

const bg: CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(150deg, #f5f3ff 0%, #fdf4ff 20%, #fff7ed 45%, #f0fdf4 70%, #f0f9ff 100%)',
  padding: 20,
};

const card: CSSProperties = {
  width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
  borderRadius: 24, padding: '40px 36px', border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.1)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
};

const signupCard: CSSProperties = {
  ...card, maxWidth: 440,
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'DM Sans', color: '#0f172a', outline: 'none', boxSizing: 'border-box',
  background: '#f8fafc', transition: 'all 0.18s',
};

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
};

const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#7c3aed';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
  e.currentTarget.style.background = 'white';
};
const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#e2e8f0';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = '#f8fafc';
};

const LogoBlock = () => (
  <div style={{ textAlign: 'center' }}>
    <svg width="36" height="36" viewBox="0 0 50 50" fill="none" style={{ margin: '0 auto' }}>
      <path d="M25 4C16 4 11 10 11 16c0 3.5 1.5 6 4.5 7.5L9 28c-3 1.5-4 4.5-2 6.5L12 33l2 4.5 5-5c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5l5 5 2-4.5 4.5 1.5c2-2-.8-5-2.8-6.5l-6-9C36.5 22 38 19.5 38 16 38 10 34 4 25 4z" fill="#0f172a"/>
      <circle cx="21" cy="14" r="2" fill="white"/>
      <circle cx="29" cy="14" r="2" fill="white"/>
    </svg>
    <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a', letterSpacing: '-0.03em', marginTop: 10 }}>Shikshantaram OS</div>
    <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 28 }}>Your digital product universe</div>
  </div>
);

export default function LoginScreen() {
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  return (
    <div style={bg}>
      {authView === 'login' ? (
        <LoginForm onSwitchToSignup={() => setAuthView('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setAuthView('login')} />
      )}
    </div>
  );
}

/* ─── LOGIN FORM ─── */
function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [securityBlock, setSecurityBlock] = useState<{ reason: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    // After successful auth, check session security
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { allowed, reason, message } = await initSession(user.id, user.email || email);
      if (!allowed) {
        await supabase.auth.signOut();
        setSecurityBlock({ reason: reason || 'blocked', message: message || 'Access denied.' });
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: resetEmail.trim().toLowerCase() },
      });
      if (error || data?.sent === false) {
        setResetError('Failed to send reset email. Please try again or contact support.');
        return;
      }
      setResetSent(true);
    } catch (err) {
      setResetError('Something went wrong. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
    <div style={card}>
      <LogoBlock />
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 50, padding: '6px 16px', fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>
          🔒 Access by invitation only
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={inputStyle} placeholder="you@example.com" onFocus={focusInput} onBlur={blurInput} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={inputStyle} placeholder="••••••••" onFocus={focusInput} onBlur={blurInput} />
        </div>
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <span onClick={() => { setShowForgotPassword(true); setResetEmail(email); setResetSent(false); setResetError(''); }} style={{ fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontFamily: 'DM Sans' }}>Forgot password?</span>
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontFamily: 'Sora', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 16px rgba(124,58,237,0.4)', transition: 'all 0.18s', opacity: loading ? 0.7 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#991b1b', marginTop: 12 }}>
            {error}
          </div>
        )}
      </form>

      {/* Forgot Password Panel */}
      {showForgotPassword && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginTop: 16, animation: 'fadeIn 0.2s ease' }}>
          {resetSent ? (
          <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📧</div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>Check Your Email</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>If <strong>{resetEmail}</strong> has an approved account, a reset link has been sent from <strong>reset@shikshantaram.in</strong>.</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Check your inbox (and spam folder). Link expires in 1 hour.</div>
              <span onClick={() => setShowForgotPassword(false)} style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontWeight: 600, display: 'inline-block', marginTop: 12 }}>← Back to Login</span>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 12 }}>🔐 Reset Your Password</div>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                placeholder="Enter your email" style={{ ...inputStyle, marginBottom: 12 }} onFocus={focusInput} onBlur={blurInput} />
              {resetError && <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{resetError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleForgotPassword} disabled={resetLoading} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: resetLoading ? 'wait' : 'pointer',
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                  opacity: resetLoading ? 0.7 : 1,
                }}>
                  {resetLoading ? 'Sending...' : 'Send Reset Link →'}
                </button>
                <button onClick={() => setShowForgotPassword(false)} style={{
                  background: 'none', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px',
                  fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#64748b', cursor: 'pointer',
                }}>← Back</button>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
        Don't have access? Contact us<br />
        <span style={{ color: '#7c3aed', fontWeight: 600 }}>shikshantaram@gmail.com</span>
      </div>

      {/* Divider + Signup CTA */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '20px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b' }}>New to Shikshantaram OS?</span>
        <button onClick={onSwitchToSignup} style={{
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 50, padding: '6px 16px', fontFamily: 'DM Sans', fontWeight: 700,
          fontSize: 12.5, color: '#7c3aed', cursor: 'pointer', transition: 'all 0.18s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.08)')}
        >Request Access →</button>
      </div>
    </div>
    {securityBlock && (
      <SecurityBlockPopup
        reason={securityBlock.reason}
        message={securityBlock.message}
        onClose={() => setSecurityBlock(null)}
      />
    )}
    </>
  );
}

/* ─── SIGNUP FORM ─── */
function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [capReached, setCapReached] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(250);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [paymentType, setPaymentType] = useState<'reserve' | 'full' | ''>('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    checkCap();
  }, []);

  const checkCap = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_signup_count');
    const count = (data as number) || 0;
    if (count >= 250) setCapReached(true);
    setSpotsLeft(250 - count);
    setLoading(false);
  };

  const phoneDigits = phone.replace(/\D/g, '');
  const isFormValid = fullName.trim().length >= 2 && email.trim().length > 0 && phoneDigits.length >= 7 && phoneDigits.length <= 15 && countryCode.trim().length >= 2 && paymentType !== '' && agreed;

  const handleSignup = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      // Re-check cap
      const { data: countData } = await supabase.rpc('get_signup_count');
      if ((countData as number) >= 250) {
        setCapReached(true);
        return;
      }

      // Insert directly — handle duplicate via unique constraint error
      const { error } = await supabase
        .from('signup_requests')
        .insert({
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: `${countryCode} ${phoneDigits}`.trim(),
          payment_type: paymentType as string,
          status: 'pending',
        });

      if (error) {
        // Unique constraint on email — means they already signed up
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          setSubmitError('This email has already been registered. We will contact you once your access is verified.');
          return;
        }
        throw error;
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError('Something went wrong. Please try again or contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={signupCard}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (capReached) return <CapReachedScreen onSwitchToLogin={onSwitchToLogin} />;
  if (submitSuccess) return <SuccessScreen fullName={fullName} email={email} paymentType={paymentType as 'reserve' | 'full'} onSwitchToLogin={onSwitchToLogin} />;

  return (
    <div style={signupCard}>
      {/* Back link */}
      <div onClick={onSwitchToLogin} style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
        ← Back to Login
      </div>

      <LogoBlock />

      {/* Spots remaining */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)',
          borderRadius: 50, padding: '5px 16px',
          fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 700,
          color: spotsLeft <= 10 ? '#ef4444' : '#ea580c',
        }}>
          {spotsLeft <= 10 ? '⚠' : '🔥'} {spotsLeft <= 10 ? `Only ${spotsLeft} spots left!` : `${spotsLeft} spots remaining out of 250`}
        </span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a' }}>Request Access</div>
      </div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
        Fill in your details. Access will be activated once your payment is verified.
      </div>

      {/* Form */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Full Name *</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
          style={inputStyle} placeholder="e.g. Abhinav Sharma" onFocus={focusInput} onBlur={blurInput} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Email Address *</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          style={inputStyle} placeholder="yourname@gmail.com" onFocus={focusInput} onBlur={blurInput} />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Use the email where you want to receive your access credentials.</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Phone Number *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
          <select
            value={countryCode}
            onChange={e => setCountryCode(e.target.value)}
            style={{ ...inputStyle, padding: '11px 8px', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'><path fill=\'%2364748b\' d=\'M0 0l5 6 5-6z\'/></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 24 }}
            onFocus={focusInput}
            onBlur={blurInput}
          >
            <option value="+91">🇮🇳 +91</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+61">🇦🇺 +61</option>
            <option value="+971">🇦🇪 +971</option>
            <option value="+966">🇸🇦 +966</option>
            <option value="+65">🇸🇬 +65</option>
            <option value="+60">🇲🇾 +60</option>
            <option value="+64">🇳🇿 +64</option>
            <option value="+27">🇿🇦 +27</option>
            <option value="+49">🇩🇪 +49</option>
            <option value="+33">🇫🇷 +33</option>
            <option value="+39">🇮🇹 +39</option>
            <option value="+34">🇪🇸 +34</option>
            <option value="+31">🇳🇱 +31</option>
            <option value="+46">🇸🇪 +46</option>
            <option value="+41">🇨🇭 +41</option>
            <option value="+353">🇮🇪 +353</option>
            <option value="+7">🇷🇺 +7</option>
            <option value="+86">🇨🇳 +86</option>
            <option value="+81">🇯🇵 +81</option>
            <option value="+82">🇰🇷 +82</option>
            <option value="+852">🇭🇰 +852</option>
            <option value="+62">🇮🇩 +62</option>
            <option value="+63">🇵🇭 +63</option>
            <option value="+66">🇹🇭 +66</option>
            <option value="+84">🇻🇳 +84</option>
            <option value="+880">🇧🇩 +880</option>
            <option value="+92">🇵🇰 +92</option>
            <option value="+94">🇱🇰 +94</option>
            <option value="+977">🇳🇵 +977</option>
            <option value="+93">🇦🇫 +93</option>
            <option value="+90">🇹🇷 +90</option>
            <option value="+20">🇪🇬 +20</option>
            <option value="+234">🇳🇬 +234</option>
            <option value="+254">🇰🇪 +254</option>
            <option value="+55">🇧🇷 +55</option>
            <option value="+52">🇲🇽 +52</option>
            <option value="+54">🇦🇷 +54</option>
            <option value="+56">🇨🇱 +56</option>
            <option value="+57">🇨🇴 +57</option>
          </select>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
            required
            style={inputStyle}
            placeholder="98765 43210"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Pick your country code, then enter your number without the code.</div>
      </div>

      {/* Payment Type */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>I Have Paid For *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
          {/* Reserve */}
          <div onClick={() => setPaymentType('reserve')} style={{
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            border: `2px solid ${paymentType === 'reserve' ? '#059669' : '#e2e8f0'}`,
            background: paymentType === 'reserve' ? 'rgba(5,150,105,0.06)' : '#f8fafc',
            transition: 'all 0.18s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: `2px solid ${paymentType === 'reserve' ? '#059669' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {paymentType === 'reserve' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }} />}
              </div>
              <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Reserve Amount</span>
            </div>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#059669', marginTop: 4 }}>₹500 – ₹1,000</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', lineHeight: 1.5, marginTop: 4 }}>Get Basic Access — Niche Clarity + Product Navigator</div>
          </div>

          {/* Full */}
          <div onClick={() => setPaymentType('full')} style={{
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            border: `2px solid ${paymentType === 'full' ? '#7c3aed' : '#e2e8f0'}`,
            background: paymentType === 'full' ? 'rgba(124,58,237,0.06)' : '#f8fafc',
            transition: 'all 0.18s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: `2px solid ${paymentType === 'full' ? '#7c3aed' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {paymentType === 'full' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed' }} />}
              </div>
              <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Full Payment</span>
            </div>
            <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 16, color: '#7c3aed', marginTop: 4 }}>Full Amount</div>
            <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#64748b', lineHeight: 1.5, marginTop: 4 }}>Get Premium Access — All 8 tools as they unlock</div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16 }}>
        <div onClick={() => setAgreed(!agreed)} style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer', marginTop: 1,
          border: `1.5px solid ${agreed ? '#7c3aed' : '#e2e8f0'}`,
          background: agreed ? '#7c3aed' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s',
        }}>
          {agreed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          I confirm that I have made the payment and agree to the terms.
        </span>
      </div>

      {/* Submit */}
      <button onClick={handleSignup} disabled={!isFormValid || submitting} style={{
        width: '100%', padding: 13, borderRadius: 12, border: 'none', marginTop: 20,
        cursor: (!isFormValid || submitting) ? 'not-allowed' : 'pointer',
        background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white',
        fontFamily: 'Sora', fontWeight: 800, fontSize: 14,
        boxShadow: isFormValid && !submitting ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
        opacity: (!isFormValid || submitting) ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.18s',
      }}
        onMouseEnter={e => { if (isFormValid && !submitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {submitting && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }} />}
        {submitting ? 'Submitting...' : 'Request Access →'}
      </button>

      {submitError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#991b1b', marginTop: 12 }}>
          {submitError}
        </div>
      )}
    </div>
  );
}

/* ─── SUCCESS SCREEN ─── */
function SuccessScreen({ fullName, email, paymentType, onSwitchToLogin }: { fullName: string; email: string; paymentType: 'reserve' | 'full'; onSwitchToLogin: () => void }) {
  return (
    <div style={{ ...signupCard, textAlign: 'center', padding: '32px 28px' }}>
      {/* Animated checkmark */}
      <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,#059669,#10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(5,150,105,0.35)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 20, color: '#0f172a' }}>Registration Submitted! 🎉</div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#475569', marginTop: 8, lineHeight: 1.7 }}>
        Thank you, {fullName}! Your registration has been received.
      </div>

      {/* Info box */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginTop: 20, textAlign: 'left' }}>
        <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: '#15803d', marginBottom: 8 }}>📋 What happens next:</div>
        {[
          "We'll verify your payment details (usually within 24 hours).",
          "Once verified, you'll receive a confirmation email with your login credentials.",
          "Log in and access your tools based on your payment — Basic or Premium.",
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginTop: 6, flexShrink: 0 }} />
            <span style={{ fontFamily: 'DM Sans', fontSize: 12.5, color: '#374151', lineHeight: 1.6 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Payment type reminder */}
      <div style={{ marginTop: 16 }}>
        <span style={{
          display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 50,
          ...(paymentType === 'full'
            ? { background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe' }
            : { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }),
        }}>
          {paymentType === 'full' ? '⚡ Premium Access will be activated' : '📦 Basic Access will be activated'}
        </span>
      </div>

      <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', marginTop: 12 }}>Registered email: {email}</div>
      <div onClick={onSwitchToLogin} style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>
        Back to Login
      </div>
    </div>
  );
}

/* ─── CAP REACHED SCREEN ─── */
function CapReachedScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  return (
    <div style={{ ...signupCard, textAlign: 'center', padding: '40px 28px' }}>
      <div style={{ fontSize: 56, animation: 'float 3s ease-in-out infinite' }}>🔒</div>
      <div style={{ fontFamily: 'Sora', fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 16 }}>Registration Closed</div>
      <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 1.7 }}>
        All 250 founding member spots have been claimed.
      </div>

      <div style={{
        background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 12, padding: '16px 20px', marginTop: 20,
      }}>
        <div style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 4 }}>Already paid?</div>
        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>
          If you've made a payment, contact us directly and we'll get you set up.
        </div>
        <a href="mailto:support@shikshantaram.com?subject=Shikshantaram OS Access Request"
          style={{ display: 'block', fontWeight: 700, color: '#7c3aed', marginTop: 8, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>
          📩 support@shikshantaram.com
        </a>
      </div>

      <div onClick={onSwitchToLogin} style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', marginTop: 20 }}>
        Back to Login →
      </div>
    </div>
  );
}
