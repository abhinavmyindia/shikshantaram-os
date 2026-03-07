import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTracking(userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const pagesVisitedRef = useRef<Array<{ page: string; at: string }>>([]);
  const toolUsageIdRef = useRef<string | null>(null);
  const toolOpenTimeRef = useRef<number>(0);

  const startSession = useCallback(async () => {
    if (!userId) return;
    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const { data } = await supabase.from('user_sessions').insert({
      user_id: userId,
      session_start: new Date().toISOString(),
      device_type: deviceType,
      pages_visited: [],
    }).select('id').single();
    if (data) {
      sessionIdRef.current = data.id;
      sessionStartRef.current = Date.now();
    }
  }, [userId]);

  const endSession = useCallback(() => {
    if (!sessionIdRef.current || !userId) return;
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const body = JSON.stringify({
      session_end: new Date().toISOString(),
      duration_seconds: duration,
      pages_visited: pagesVisitedRef.current,
    });
    // Use sendBeacon for reliability
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`;
    try {
      navigator.sendBeacon(url); // fallback - won't work with auth but at least tries
    } catch { /* ignore */ }
    // Also try regular update
    supabase.from('user_sessions').update({
      session_end: new Date().toISOString(),
      duration_seconds: duration,
      pages_visited: pagesVisitedRef.current as any,
    }).eq('id', sessionIdRef.current).then(() => {});
  }, [userId]);

  const trackPageVisit = useCallback((page: string) => {
    pagesVisitedRef.current.push({ page, at: new Date().toISOString() });
  }, []);

  const trackToolOpen = useCallback(async (toolId: string) => {
    if (!userId || !sessionIdRef.current) return;
    toolOpenTimeRef.current = Date.now();
    const { data } = await supabase.from('tool_usage').insert({
      user_id: userId,
      session_id: sessionIdRef.current,
      tool_id: toolId,
      opened_at: new Date().toISOString(),
    }).select('id').single();
    if (data) toolUsageIdRef.current = data.id;
  }, [userId]);

  const trackToolAction = useCallback(async () => {
    if (!toolUsageIdRef.current) return;
    supabase.rpc('increment_tool_actions', { row_id: toolUsageIdRef.current }).then(() => {});
  }, []);

  const closeToolTracking = useCallback(async () => {
    if (!toolUsageIdRef.current) return;
    const spent = Math.round((Date.now() - toolOpenTimeRef.current) / 1000);
    supabase.from('tool_usage').update({ time_spent_secs: spent }).eq('id', toolUsageIdRef.current).then(() => {});
    toolUsageIdRef.current = null;
  }, []);

  // Update session pages every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionIdRef.current) {
        supabase.from('user_sessions').update({
          pages_visited: pagesVisitedRef.current as any,
        }).eq('id', sessionIdRef.current).then(() => {});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // End session on unload
  useEffect(() => {
    window.addEventListener('beforeunload', endSession);
    return () => window.removeEventListener('beforeunload', endSession);
  }, [endSession]);

  return { startSession, endSession, trackPageVisit, trackToolOpen, trackToolAction, closeToolTracking, sessionId: sessionIdRef };
}
