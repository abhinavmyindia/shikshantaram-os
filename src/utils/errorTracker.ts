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

// ─── DEDUPLICATION CACHE ───
const recentErrors = new Map<string, number>();

// ─── CACHED AUTH (prevents concurrent getUser() lock stealing) ───
let cachedUserId: string | null = null;
let cachedUserEmail: string | null = null;
let authCacheTime = 0;
const AUTH_CACHE_TTL = 60000; // 1 minute

const getCachedAuth = async (): Promise<{ userId: string | null; userEmail: string | null }> => {
  if (Date.now() - authCacheTime < AUTH_CACHE_TTL && cachedUserId) {
    return { userId: cachedUserId, userEmail: cachedUserEmail };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    cachedUserId = session?.user?.id || null;
    cachedUserEmail = session?.user?.email || null;
    authCacheTime = Date.now();
  } catch (_) {
    // Auth unavailable — log anonymously
  }
  return { userId: cachedUserId, userEmail: cachedUserEmail };
};

// ─── ERRORS TO ALWAYS SUPPRESS (never worth logging) ───
const SUPPRESS_MESSAGES = [
  'lock broken',
  'lock was not granted',
  'navigator.locks',
  'the operation was aborted',
];

const shouldSuppressError = (message: string): boolean => {
  const msg = String(message).toLowerCase();
  return SUPPRESS_MESSAGES.some(s => msg.includes(s));
};

// ─── MAIN LOG ERROR FUNCTION ───
export const logError = async (
  errorType: string,
  message: string,
  stackTrace?: string,
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    // Suppress known harmless errors (e.g. auth lock contention)
    if (shouldSuppressError(message)) {
      console.debug('[ErrorTracker] Suppressed harmless error:', message.substring(0, 80));
      return;
    }

    // Dedup check — same error type + message within 10 seconds = skip
    const dedupKey = `${errorType}::${String(message).substring(0, 100)}`;
    const lastLogged = recentErrors.get(dedupKey);
    if (lastLogged && Date.now() - lastLogged < 10000) {
      return; // Skip duplicate
    }
    recentErrors.set(dedupKey, Date.now());

    // Clean old entries every 100 calls
    if (recentErrors.size > 100) {
      const cutoff = Date.now() - 30000;
      recentErrors.forEach((time, key) => { if (time < cutoff) recentErrors.delete(key); });
    }

    const device = getDeviceInfo();
    const pageUrl = window.location.href;
    const module = getModuleFromUrl(pageUrl);

    // Use cached auth to avoid concurrent getUser() lock contention
    const { userId, userEmail } = await getCachedAuth();

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

// URLs that should NEVER be logged (prevents infinite loops)
const NEVER_LOG_URLS = [
  'log-error',
  'track-activity',
  'log-session',
  'end-session',
  'user_presence',
  'supabase.co/functions/v1/log-error',
  '/token',       // auth token refresh — never log
  '/auth/v1/',    // auth endpoints — lock contention noise
];

const shouldLogUrl = (url: string): boolean => {
  const urlStr = String(url).toLowerCase();
  return !NEVER_LOG_URLS.some(skip => urlStr.includes(skip));
};

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

  // 3. Catch network errors (fetch failures) — with infinite loop guard
  const originalFetch = window.fetch;

  window.fetch = async (...args): Promise<Response> => {
    const url = typeof args[0] === 'string' ? args[0]
      : args[0] instanceof URL ? args[0].href
      : (args[0] as Request)?.url || 'unknown';

    // GUARD: Never intercept our own logging calls
    if (!shouldLogUrl(url)) {
      return originalFetch(...args);
    }

    try {
      const response = await originalFetch(...args);
      if (!response.ok && response.status >= 500) {
        logError(
          'api_error',
          `HTTP ${response.status} from ${url}`,
          undefined,
          { status: response.status, url }
        );
      }
      return response;
    } catch (fetchError: any) {
      logError(
        'network_error',
        fetchError?.message || 'Network request failed',
        fetchError?.stack,
        { url }
      );
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
