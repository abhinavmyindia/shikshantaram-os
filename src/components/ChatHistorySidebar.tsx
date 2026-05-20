import { useEffect, useState, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SessionGroup {
  label: string;
  sessions: ChatSession[];
}

interface Props {
  onNavigateHome: () => void;
}

const SCROLL_CSS = `
.chat-history-list::-webkit-scrollbar { width: 3px; }
.chat-history-list::-webkit-scrollbar-track { background: transparent; }
.chat-history-list::-webkit-scrollbar-thumb { background: rgba(29,158,117,0.2); border-radius: 2px; }
.chat-history-list::-webkit-scrollbar-thumb:hover { background: rgba(29,158,117,0.4); }
.chat-history-row { position: relative; }
.chat-history-row .chat-history-trash { opacity: 0; transition: opacity 0.12s, color 0.12s; }
.chat-history-row:hover .chat-history-trash { opacity: 1; }
.chat-history-row .chat-history-trash:hover { color: #EF4444 !important; }
.chat-history-newbtn:hover { background: rgba(29,158,117,0.08) !important; color: #1D9E75 !important; }
.chat-history-session-btn:hover.not-active { background: rgba(29,158,117,0.05) !important; }
@keyframes chShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
.chat-history-skel { background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%); background-size: 400px 100%; animation: chShimmer 1.4s infinite; }
`;

function groupSessionsByDate(sessions: ChatSession[]): SessionGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOf7DaysAgo = startOfToday - 7 * 86_400_000;
  const startOf30DaysAgo = startOfToday - 30 * 86_400_000;

  const groups: SessionGroup[] = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'Previous 7 days', sessions: [] },
    { label: 'This month', sessions: [] },
    { label: 'Older', sessions: [] },
  ];

  for (const s of sessions) {
    const t = new Date(s.updated_at).getTime();
    if (t >= startOfToday) groups[0].sessions.push(s);
    else if (t >= startOfYesterday) groups[1].sessions.push(s);
    else if (t >= startOf7DaysAgo) groups[2].sessions.push(s);
    else if (t >= startOf30DaysAgo) groups[3].sessions.push(s);
    else groups[4].sessions.push(s);
  }

  return groups.filter(g => g.sessions.length > 0);
}

export default function ChatHistorySidebar({ onNavigateHome }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inject styles once
  useEffect(() => {
    const id = 'chat-history-sidebar-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = SCROLL_CSS;
    document.head.appendChild(s);
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chat-sessions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!response.ok) return;
      const { sessions: fetched } = await response.json();
      setSessions(fetched ?? []);
    } catch (e) {
      console.error('Failed to fetch chat sessions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const stored = localStorage.getItem('askabhinav_session_id');
    if (stored) setActiveSessionId(stored);

    const handleSessionUpdated = (e: Event) => {
      const { sessionId, title } = (e as CustomEvent).detail || {};
      if (!sessionId) return;
      setSessions(prev => {
        const exists = prev.find(s => s.id === sessionId);
        if (exists) {
          return [
            { ...exists, title: title ?? exists.title, updated_at: new Date().toISOString() },
            ...prev.filter(s => s.id !== sessionId),
          ];
        }
        return [{
          id: sessionId,
          title: title ?? 'New Chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, ...prev];
      });
      setActiveSessionId(sessionId);
    };

    const handleNewChat = () => setActiveSessionId(null);

    window.addEventListener('askabhinav:session_updated', handleSessionUpdated);
    window.addEventListener('askabhinav:new_chat', handleNewChat);
    return () => {
      window.removeEventListener('askabhinav:session_updated', handleSessionUpdated);
      window.removeEventListener('askabhinav:new_chat', handleNewChat);
    };
  }, []);

  const handleSessionClick = (sessionId: string) => {
    if (sessionId === activeSessionId) {
      onNavigateHome();
      return;
    }
    localStorage.setItem('askabhinav_session_id', sessionId);
    setActiveSessionId(sessionId);
    window.dispatchEvent(new CustomEvent('askabhinav:load_session', { detail: { sessionId } }));
    onNavigateHome();
  };

  const handleNewChat = () => {
    localStorage.removeItem('askabhinav_session_id');
    setActiveSessionId(null);
    window.dispatchEvent(new CustomEvent('askabhinav:request_new_chat'));
    window.dispatchEvent(new CustomEvent('askabhinav:new_chat'));
    onNavigateHome();
  };

  const handleDeleteSession = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setSessionToDelete(null);
    if (sessionId === activeSessionId) {
      localStorage.removeItem('askabhinav_session_id');
      setActiveSessionId(null);
      window.dispatchEvent(new CustomEvent('askabhinav:request_new_chat'));
      window.dispatchEvent(new CustomEvent('askabhinav:new_chat'));
    }
    try {
      await supabase.from('chat_sessions').delete().eq('id', sessionId);
    } catch (e) {
      console.error('Failed to delete session:', e);
      fetchSessions();
    }
  };

  const groups = groupSessionsByDate(sessions);

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxHeight: '45vh',
    overflow: 'hidden',
    paddingBottom: 8,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    marginBottom: 8,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 12px 6px 12px',
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#9CA3AF',
  };

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <span style={labelStyle}>Chats</span>
        <button
          className="chat-history-newbtn"
          onClick={handleNewChat}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#6B7280', fontFamily: 'DM Sans', fontSize: 12,
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          New
        </button>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 12px' }}>
          {['80%', '65%', '75%'].map((w, i) => (
            <div key={i} className="chat-history-skel" style={{ height: 28, borderRadius: 6, width: w }} />
          ))}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div style={{
          padding: '16px 12px', fontFamily: 'DM Sans', fontSize: 12,
          color: '#9CA3AF', textAlign: 'left', lineHeight: 1.5,
        }}>
          No chats yet. Start a conversation above.
        </div>
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="chat-history-list" style={{ overflowY: 'auto', flex: 1, padding: '0 6px' }}>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{
                padding: '8px 6px 2px 6px',
                fontFamily: 'DM Sans', fontSize: 10, fontWeight: 500,
                color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{group.label}</div>

              {group.sessions.map(s => {
                const isActive = s.id === activeSessionId;
                if (sessionToDelete === s.id) {
                  return (
                    <div key={s.id} style={{
                      background: 'rgba(254,226,226,0.5)', borderRadius: 8, padding: '6px 8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      margin: '2px 0',
                    }}>
                      <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#991B1B' }}>Delete this chat?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          style={{
                            fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, color: '#DC2626',
                            background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px',
                          }}
                        >Yes</button>
                        <button
                          onClick={() => setSessionToDelete(null)}
                          style={{
                            fontFamily: 'DM Sans', fontSize: 12, color: '#6B7280',
                            background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px',
                          }}
                        >No</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={s.id} className="chat-history-row" style={{
                    display: 'flex', alignItems: 'center', borderRadius: 8, margin: '1px 0',
                  }}>
                    <button
                      className={`chat-history-session-btn ${isActive ? '' : 'not-active'}`}
                      onClick={() => handleSessionClick(s.id)}
                      style={{
                        flex: 1, minWidth: 0,
                        display: 'flex', alignItems: 'center',
                        padding: isActive ? '6px 8px 6px 6px' : '6px 8px',
                        borderRadius: 8,
                        background: isActive ? 'rgba(29,158,117,0.10)' : 'transparent',
                        borderLeft: isActive ? '2px solid #1D9E75' : '2px solid transparent',
                        border: 'none',
                        borderLeftWidth: 2,
                        borderLeftStyle: 'solid',
                        borderLeftColor: isActive ? '#1D9E75' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s, border-color 0.12s',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{
                        fontFamily: 'DM Sans', fontSize: 13,
                        color: isActive ? '#0F6E56' : '#374151',
                        fontWeight: isActive ? 500 : 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '100%', display: 'block', width: '100%',
                      }}>{s.title}</span>
                    </button>
                    <button
                      className="chat-history-trash"
                      onClick={(e) => { e.stopPropagation(); setSessionToDelete(s.id); }}
                      style={{
                        width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 5, border: 'none', background: 'transparent',
                        color: '#D1D5DB', flexShrink: 0, cursor: 'pointer',
                      }}
                      aria-label="Delete chat"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
