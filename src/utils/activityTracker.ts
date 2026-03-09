import { supabase } from '@/integrations/supabase/client';

let sessionId = sessionStorage.getItem('tracking_session_id');
if (!sessionId) {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem('tracking_session_id', sessionId);
}

export const trackEvent = async (
  eventType: string,
  module?: string,
  eventData?: Record<string, any>,
  durationMs?: number
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.functions.invoke('track-activity', {
      body: {
        userId: user.id,
        userEmail: user.email,
        eventType,
        module: module || 'unknown',
        eventData: eventData || {},
        sessionId,
        durationMs,
      }
    });
  } catch (_) {}
};

export const trackPageView = (page: string) => trackEvent('page_view', page);
export const trackToolOpen = (tool: string) => trackEvent('tool_open', tool);
export const trackAICall = (tool: string, callType: string) => trackEvent('ai_call_start', tool, { callType });
export const trackSave = (tool: string, itemType: string) => trackEvent('save_item', tool, { itemType });
export const trackCopy = (tool: string, section: string) => trackEvent('copy_output', tool, { section });
export const trackError = (module: string, errorMsg: string) => trackEvent('error_occurred', module, { error: errorMsg });
