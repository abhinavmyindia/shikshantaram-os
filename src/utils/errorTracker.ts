import { supabase } from '@/integrations/supabase/client';

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  return {
    browser: ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Safari') ? 'Safari'
      : ua.includes('Edge') ? 'Edge' : 'Other',
    os: ua.includes('Windows') ? 'Windows'
      : ua.includes('Mac') ? 'macOS'
      : ua.includes('Android') ? 'Android'
      : (ua.includes('iPhone') || ua.includes('iPad')) ? 'iOS'
      : 'Linux',
    deviceType: /Mobile|Android|iPhone/i.test(ua) ? 'mobile'
      : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop',
  };
};

const getModule = (url: string): string => {
  if (url.includes('niche')) return 'niche_clarity';
  if (url.includes('product')) return 'product_navigator';
  if (url.includes('offer')) return 'offer_creation';
  if (url.includes('funnel')) return 'funnel_builder';
  if (url.includes('copy')) return 'copywriting_suite';
  return 'dashboard';
};

export const logError = async (
  errorType: string,
  message: string,
  stackTrace?: string,
  additionalData?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const device = getDeviceInfo();

    await supabase.functions.invoke('log-error', {
      body: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        errorType,
        message: String(message).substring(0, 2000),
        stackTrace: stackTrace?.substring(0, 5000),
        module: getModule(window.location.href),
        pageUrl: window.location.href,
        browser: device.browser,
        os: device.os,
        deviceType: device.deviceType,
        additionalData,
      }
    });
  } catch (_) {
    // Silently fail
  }
};

export const initGlobalErrorTracking = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    logError('js_error', String(message), error?.stack, { source, lineno, colno });
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    logError(
      'unhandled_rejection',
      event.reason?.message || String(event.reason),
      event.reason?.stack,
      { type: 'unhandled_promise_rejection' }
    );
  });
};
