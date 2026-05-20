import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TopUpModal from '@/components/TopUpModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  isError?: boolean;
}

interface SelectedImage {
  previewUrl: string;
  base64Data: string;
  mediaType: string;
  fileName: string;
}

interface Props {
  userId: string;
  userEmail: string;
  userName: string;
}

const ASKABHINAV_CSS = `
@keyframes askAbhinav-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}
@keyframes askAbhinav-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.askabhinav-dot { animation: askAbhinav-bounce 1s infinite; }
.askabhinav-cursor { animation: askAbhinav-blink 0.8s infinite; }
.askabhinav-chip { outline: none !important; }
.askabhinav-chip:focus, .askabhinav-chip:focus-visible, .askabhinav-chip:active { outline: none !important; box-shadow: none !important; }
.askabhinav-chip:hover { border-color: rgba(29, 158, 117, 0.4) !important; border-left-color: #1D9E75 !important; background: rgba(29, 158, 117, 0.04) !important; color: #0F6E56 !important; }
.askabhinav-input-wrap:focus-within { border-color: #1D9E75 !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.08); }
.askabhinav-upload-btn:hover:not(:disabled) { background: rgba(29,158,117,0.08) !important; color: #1D9E75 !important; }
`;

const QUICK_STARTS = [
  { icon: '📊', label: 'Review my Facebook ad', prompt: "I want you to review my Facebook ad. Let me share the details." },
  { icon: '🎯', label: 'Help me find my niche', prompt: "I'm confused about which niche to pick. Help me find the right one for me." },
  { icon: '💡', label: 'Analyze my product idea', prompt: "I have a digital product idea I want to validate. Can you help me analyze it?" },
  { icon: '🚀', label: "I'm stuck, guide me", prompt: "I feel stuck and don't know where to go from here. Can you guide me?" },
];

const renderMarkdown = (text: string) => {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
};

export default function AskAbhinavAI({ userId, userEmail, userName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [showLowCreditsWarning, setShowLowCreditsWarning] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpRequired, setTopUpRequired] = useState<number | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inject CSS once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = ASKABHINAV_CSS;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Fetch balance
  const refreshBalance = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsLoadingBalance(false); return; }
    const { data } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const balance = (data as any)?.balance ?? 0;
    setCreditBalance(balance);
    setShowLowCreditsWarning(balance < 10);
    setIsLoadingBalance(false);
  }, []);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);

  // Restore session
  useEffect(() => {
    const savedSessionId = localStorage.getItem('askabhinav_session_id');
    if (savedSessionId) {
      setCurrentSessionId(savedSessionId);
      loadSessionMessages(savedSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chat-messages?session_id=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!response.ok) return;
      const json = await response.json();
      const savedMessages = json.messages ?? [];
      if (savedMessages.length > 0) {
        setMessages(savedMessages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          imageUrls: m.image_urls ?? [],
        })));
      }
    } catch (e) {
      console.error('loadSessionMessages error:', e);
    }
  };

  // Auto-scroll
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };
  useEffect(() => { scrollToBottom(); }, [messages.length]);
  useEffect(() => {
    if (isStreaming) scrollToBottom('auto');
  }, [messages, isStreaming]);

  // Textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Listen for new chat event (from sidebar in Part C)
  useEffect(() => {
    const handler = () => startNewChat();
    window.addEventListener('askabhinav:request_new_chat', handler);
    return () => window.removeEventListener('askabhinav:request_new_chat', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Part C — load a past session when sidebar fires the event
  useEffect(() => {
    const handleLoadSession = async (e: Event) => {
      const { sessionId } = (e as CustomEvent).detail || {};
      if (!sessionId || sessionId === currentSessionId) return;
      setMessages([]);
      setIsStreaming(false);
      setInputText('');
      setSelectedImages([]);
      setCurrentSessionId(sessionId);
      localStorage.setItem('askabhinav_session_id', sessionId);
      await loadSessionMessages(sessionId);
    };
    window.addEventListener('askabhinav:load_session', handleLoadSession);
    return () => window.removeEventListener('askabhinav:load_session', handleLoadSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInputText('');
    setSelectedImages([]);
    setIsStreaming(false);
    localStorage.removeItem('askabhinav_session_id');
    window.dispatchEvent(new CustomEvent('askabhinav:new_chat'));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 3 - selectedImages.length;
    const filesToProcess = files.slice(0, remaining);

    filesToProcess.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per image.`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImages(prev => [...prev, {
          previewUrl,
          base64Data: base64,
          mediaType: file.type,
          fileName: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isStreaming) return;

    const cost = selectedImages.length > 0 ? 6 : 3;
    if (creditBalance < cost) {
      setTopUpRequired(cost);
      setShowTopUp(true);
      return;
    }

    const userMessageId = crypto.randomUUID();
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmedText,
      imageUrls: selectedImages.map(img => img.previewUrl),
    };
    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, userMessage, {
      id: assistantMessageId, role: 'assistant', content: '',
    }]);

    const imagesToSend = [...selectedImages];
    setInputText('');
    setSelectedImages([]);
    setIsStreaming(true);

    const isNewSession = !currentSessionId;
    const payload = {
      session_id: currentSessionId,
      message: trimmedText,
      images: imagesToSend.map(img => ({
        data: img.base64Data,
        media_type: img.mediaType,
      })),
      is_new_session: isNewSession,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-abhinav-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          setMessages(prev => prev.filter(m => m.id !== assistantMessageId && m.id !== userMessageId));
          setInputText(trimmedText);
          setTopUpRequired(errorData.required ?? cost);
          setShowTopUp(true);
          toast.error(`Not enough credits. Need ${errorData.required ?? cost}, have ${errorData.balance ?? creditBalance}.`);
        } else {
          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: 'Something went wrong. Please try again.', isError: true }
              : m
          ));
        }
        setIsStreaming(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let newSessionId = currentSessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.session_id && parsed.session_id !== currentSessionId) {
              newSessionId = parsed.session_id;
              setCurrentSessionId(parsed.session_id);
              localStorage.setItem('askabhinav_session_id', parsed.session_id);
            }
            if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId ? { ...m, content: fullText } : m
              ));
            }
            if (parsed.session_title) {
              window.dispatchEvent(new CustomEvent('askabhinav:session_updated', {
                detail: { sessionId: newSessionId, title: parsed.session_title }
              }));
            }
            if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: 'Something went wrong. Please try again.', isError: true }
                  : m
              ));
            }
          } catch {
            /* ignore */
          }
        }
      }

      const newBalance = creditBalance - cost;
      setCreditBalance(newBalance);
      setShowLowCreditsWarning(newBalance < 10);
    } catch (error) {
      console.error('sendMessage error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: 'Connection error. Please try again.', isError: true }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  const canSend = inputText.trim().length > 0 && !isStreaming;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    }}>
      {/* Header */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.7)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
          <span style={{ fontFamily: 'Sora', fontSize: 14, fontWeight: 600, color: '#1D9E75' }}>AskAbhinavAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {messages.length > 0 && (
            <button onClick={startNewChat} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans', fontSize: 12, color: '#6b7280',
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New Chat
            </button>
          )}
        </div>
      </div>

      {/* Low credits banner */}
      {showLowCreditsWarning && !isLoadingBalance && (
        <div style={{
          background: '#FEF3C7', borderBottom: '1px solid #F59E0B',
          padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#92400E' }}>
            ⚠️ You're running low on credits ({creditBalance} remaining)
          </span>
          <button
            onClick={() => { setTopUpRequired(undefined); setShowTopUp(true); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: '#92400E', textDecoration: 'underline' }}
          >
            Top Up
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          maxWidth: 760, margin: '0 auto', width: '100%',
          padding: '20px 16px 8px 16px',
          display: 'flex', flexDirection: 'column', gap: 16,
          minHeight: '100%',
        }}>
          {messages.length === 0 && !isStreaming ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'flex-start',
              paddingTop: '15vh', width: '100%',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Sora', fontSize: 28, fontWeight: 700, color: 'white',
                boxShadow: '0 0 0 4px rgba(29, 158, 117, 0.15)',
              }}>A</div>
              <div style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 600, color: '#111', marginTop: 16 }}>
                AskAbhinavAI
              </div>
              <div style={{
                fontFamily: 'DM Sans', fontSize: 14, color: '#6B7280',
                marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap',
              }}>
                Your 24/7 guide to building digital products
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                marginTop: 28, maxWidth: 480, width: '100%',
              }}>
                {QUICK_STARTS.map(chip => (
                  <button
                    key={chip.label}
                    className="askabhinav-chip"
                    onClick={() => {
                      setInputText(chip.prompt);
                      textareaRef.current?.focus();
                    }}
                    style={{
                      background: 'white',
                      border: '1px solid rgba(29, 158, 117, 0.2)',
                      borderLeft: '2px solid #1D9E75',
                      borderRadius: 10, padding: '10px 14px 10px 12px',
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontFamily: 'DM Sans', fontSize: 13, color: '#374151',
                      display: 'flex', alignItems: 'center', gap: 8,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} style={{
                    alignSelf: 'flex-end', maxWidth: '70%',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
                  }}>
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {msg.imageUrls.map((url, i) => (
                          <img key={i} src={url} alt="" style={{
                            width: 80, height: 80, objectFit: 'cover',
                            borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
                          }} />
                        ))}
                      </div>
                    )}
                    <div style={{
                      background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                      color: 'white', padding: '10px 14px',
                      borderRadius: '18px 18px 4px 18px',
                      fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.55,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{msg.content}</div>
                  </div>
                );
              }
              // assistant
              const isStreamingThis = isStreaming && msg.id === lastAssistantId;
              return (
                <div key={msg.id} style={{
                  alignSelf: 'flex-start', maxWidth: '80%',
                  display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Sora', fontSize: 13, fontWeight: 700, color: 'white',
                    flexShrink: 0, marginTop: 2,
                  }}>A</div>
                  {msg.content === '' ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.7)',
                      borderRadius: '18px 18px 18px 4px',
                      padding: '12px 16px',
                      display: 'flex', gap: 5, alignItems: 'center',
                    }}>
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="askabhinav-dot" style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#1D9E75', display: 'inline-block',
                          animationDelay: `${delay}ms`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      background: msg.isError ? 'rgba(254, 242, 242, 0.9)' : 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: msg.isError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.7)',
                      color: msg.isError ? '#991B1B' : '#111827',
                      borderRadius: '18px 18px 18px 4px',
                      padding: '12px 16px',
                      fontFamily: 'DM Sans', fontSize: msg.isError ? 13 : 14, lineHeight: 1.65,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      {isStreamingThis && (
                        <span className="askabhinav-cursor" style={{ marginLeft: 1, color: '#1D9E75', fontWeight: 600 }}>|</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Image preview row */}
      {selectedImages.length > 0 && (
        <div style={{
          padding: '8px 16px 0 16px',
          maxWidth: 760, margin: '0 auto', width: '100%',
          display: 'flex', flexDirection: 'row', gap: 8,
          flexShrink: 0,
        }}>
          {selectedImages.map((img, i) => (
            <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'visible' }}>
              <img src={img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={() => removeImage(i)} style={{
                position: 'absolute', top: -6, right: -6,
                width: 18, height: 18, borderRadius: '50%',
                background: '#374151', color: 'white', border: 'none',
                fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0, lineHeight: 1,
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.7)',
        padding: '10px 16px 14px 16px', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className="askabhinav-input-wrap" style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            background: 'white',
            border: '1.5px solid rgba(29, 158, 117, 0.3)',
            borderRadius: 16,
            padding: '8px 8px 8px 12px',
            transition: 'border-color 0.15s',
          }}>
            <button
              className="askabhinav-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedImages.length >= 3 || isStreaming}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'transparent',
                cursor: selectedImages.length >= 3 || isStreaming ? 'not-allowed' : 'pointer',
                color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: selectedImages.length >= 3 || isStreaming ? 0.4 : 1,
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Ask Abhinav anything..."
              rows={1}
              style={{
                flex: 1, minHeight: 40, maxHeight: 120,
                border: 'none', outline: 'none', resize: 'none',
                background: 'transparent',
                fontFamily: 'DM Sans', fontSize: 14, color: '#111827', lineHeight: 1.5,
                padding: '8px 4px',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!canSend}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: canSend ? '#1D9E75' : '#E5E7EB',
                color: canSend ? 'white' : '#9CA3AF',
                cursor: canSend ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
            </button>
          </div>
          <div style={{
            fontFamily: 'DM Sans', fontSize: 11, color: '#9CA3AF',
            textAlign: 'center', marginTop: 6,
          }}>
            3 credits per message · 6 with image
          </div>
        </div>
      </div>

      {showTopUp && (
        <TopUpModal
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          currentBalance={creditBalance}
          requiredCredits={topUpRequired}
          onClose={() => setShowTopUp(false)}
          onSuccess={(newBalance) => {
            setCreditBalance(newBalance);
            setShowLowCreditsWarning(newBalance < 10);
            setShowTopUp(false);
          }}
        />
      )}
    </div>
  );
}
