import { supabase } from '@/integrations/supabase/client';

// ─── DEVICE DETECTION ───
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  return {
    browser:
      ua.includes('Edg/') ? 'Edge' :
      ua.includes('Chrome') ? 'Chrome' :
      ua.includes('Firefox') ? 'Firefox' :
      ua.includes('Safari') ? 'Safari' : 'Other',
    os:
      ua.includes('Windows') ? 'Windows' :
      ua.includes('Macintosh') ? 'macOS' :
      ua.includes('Android') ? 'Android' :
      (ua.includes('iPhone') || ua.includes('iPad')) ? 'iOS' :
      ua.includes('Linux') ? 'Linux' : 'Other',
    deviceType:
      /iPad|Tablet/i.test(ua) ? 'tablet' :
      /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop',
  };
};

// ─── MODULE DETECTION ───
const getModuleFromUrl = (url: string): string => {
  const path = url.toLowerCase();
  if (path.includes('niche')) return 'niche_clarity';
  if (path.includes('product')) return 'product_navigator';
  if (path.includes('offer')) return 'offer_creation';
  if (path.includes('funnel')) return 'funnel_builder';
  if (path.includes('copy')) return 'copywriting_suite';
  if (path.includes('ad')) return 'ai_ad_suite';
  if (path.includes('saved')) return 'my_saved';
  if (path.includes('profile')) return 'profile';
  if (path.includes('admin')) return 'admin';
  return 'dashboard';
};

// ─── MAIN LOG ERROR FUNCTION ───
export const logError = async (
  errorType: string,
  message: string,
  stackTrace?: string,
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    const device = getDeviceInfo();
    const pageUrl = window.location.href;
    const module = getModuleFromUrl(pageUrl);

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      userEmail = user?.email || null;
    } catch (_) {
      // User not logged in — log anonymously
    }

    const payload = {
      userId,
      userEmail,
      errorType,
      message: String(message).substring(0, 2000),
      stackTrace: stackTrace?.substring(0, 5000),
      module,
      pageUrl: pageUrl.substring(0, 500),
      browser: device.browser,
      os: device.os,
      deviceType: device.deviceType,
      additionalData: additionalData || {},
    };

    // ─── ATTEMPT 1: Via Edge Function (preferred — uses service role) ───
    try {
      const { error: fnError } = await supabase.functions.invoke('log-error', {
        body: payload,
      });
      if (!fnError) return; // Success
      console.warn('[ErrorTracker] Edge Function failed, trying direct insert:', fnError);
    } catch (fnCrash) {
      console.warn('[ErrorTracker] Edge Function crashed, trying direct insert:', fnCrash);
    }

    // ─── ATTEMPT 2: Direct Supabase insert (fallback) ───
    try {
      await supabase.from('error_logs').insert({
        user_id: userId,
        user_email: userEmail,
        error_type: errorType,
        severity: 'error',
        message: String(message).substring(0, 2000),
        stack_trace: stackTrace?.substring(0, 5000) || null,
        module,
        page_url: pageUrl.substring(0, 500),
        browser: device.browser,
        os: device.os,
        device_type: device.deviceType,
        additional_data: additionalData || {},
        is_resolved: false,
      });
    } catch (insertCrash) {
      console.warn('[ErrorTracker] Direct insert crashed:', insertCrash);
    }
  } catch (_) {
    // Absolute last resort — do nothing
  }
};

// ─── GLOBAL ERROR TRACKING SETUP ───
let isTrackerInitialized = false;

export const initGlobalErrorTracking = (): void => {
  if (isTrackerInitialized) return;
  isTrackerInitialized = true;

  // 1. Catch synchronous JS errors
  window.onerror = (message, source, lineno, colno, error) => {
    logError(
      'js_error',
      String(message),
      error?.stack,
      { source: String(source), lineno, colno }
    );
    return false;
  };

  // 2. Catch unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logError(
      'unhandled_rejection',
      reason?.message || String(reason) || 'Unhandled promise rejection',
      reason?.stack,
      { type: 'promise_rejection' }
    );
  });

  // 3. Catch network errors (fetch failures)
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (!response.ok && response.status >= 500) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'unknown';
        if (!url.includes('log-error')) {
          logError('api_error', `HTTP ${response.status} from ${url}`, undefined, { status: response.status, url });
        }
      }
      return response;
    } catch (fetchError: any) {
      const url = typeof args[0] === 'string' ? args[0] : 'unknown';
      if (!url.includes('log-error')) {
        logError('network_error', fetchError?.message || 'Network request failed', fetchError?.stack, { url });
      }
      throw fetchError;
    }
  };

  console.log('[ErrorTracker] Global error tracking initialized ✅');
};

// ─── CONVENIENCE SHORTCUTS ───
export const logApiError = (module: string, endpoint: string, errorMsg: string) =>
  logError('api_error', `${endpoint}: ${errorMsg}`, undefined, { module, endpoint });

export const logEdgeFunctionError = (functionName: string, errorMsg: string) =>
  logError('edge_function_error', `${functionName}: ${errorMsg}`, undefined, { functionName });
