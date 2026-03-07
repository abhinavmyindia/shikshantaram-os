import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function BetaFeedback({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [tool, setTool] = useState('Overall');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (!rating || !text.trim()) return;
    setLoading(true);
    await supabase.from('beta_feedback').insert({
      user_id: userId,
      rating,
      feedback_text: text.trim(),
      tool_used: tool.toLowerCase().replace(/\s/g, '-'),
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => { setOpen(false); setSuccess(false); setRating(0); setText(''); setTool('Overall'); }, 2000);
  };

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 300,
        background: 'linear-gradient(135deg,#ec4899,#c026d3)', color: 'white', borderRadius: 50,
        padding: '10px 18px', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, border: 'none',
        boxShadow: '0 4px 20px rgba(236,72,153,0.4)', cursor: 'pointer', transition: 'all 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
      >
        💬 Beta Feedback
      </button>

      {/* Modal */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.65)', backdropFilter: 'blur(12px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, overflow: 'hidden', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#ec4899,#c026d3)', padding: 20 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18, color: 'white', fontStyle: 'italic' }}>Share Your Feedback 💬</div>
            </div>

            <div style={{ padding: 20 }}>
              {success ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Thank you!</div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#64748b', marginTop: 4 }}>Your feedback makes us better.</div>
                </div>
              ) : (
                <>
                  {/* Stars */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>How would you rate your experience?</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setRating(s)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: s <= rating ? '#f59e0b' : '#cbd5e1', transition: 'all 0.1s' }}>
                          {s <= rating ? '★' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tool selector */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Which tool?</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['Niche Clarity', 'Product Navigator', 'Overall'].map(t => (
                        <button key={t} onClick={() => setTool(t)} style={{
                          padding: '5px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                          background: tool === t ? '#ec4899' : '#f8fafc', color: tool === t ? 'white' : '#475569',
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Your thoughts</label>
                    <textarea value={text} onChange={e => setText(e.target.value)}
                      placeholder="What's working? What can be better? Any feature requests?"
                      style={{
                        width: '100%', minHeight: 100, border: '1.5px solid #e2e8f0', borderRadius: 10,
                        padding: '10px 14px', fontSize: 13.5, fontFamily: 'DM Sans', resize: 'vertical',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236,72,153,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <button onClick={submit} disabled={loading || !rating || !text.trim()} style={{
                    width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#ec4899,#c026d3)', color: 'white', fontFamily: 'Sora',
                    fontWeight: 700, fontSize: 14, opacity: (!rating || !text.trim()) ? 0.5 : 1,
                  }}>
                    {loading ? 'Submitting...' : 'Submit Feedback →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
