import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      userId, userEmail, errorType, severity = 'error',
      message, stackTrace, module, pageUrl,
      browser, os, deviceType, additionalData = {}
    } = await req.json();

    const isCritical = message?.toLowerCase().includes('chunk') ||
                       message?.toLowerCase().includes('network') ||
                       errorType === 'unhandled_rejection';
    const finalSeverity = isCritical ? 'critical' : severity;

    await supabase.from('error_logs').insert({
      user_id: userId || null,
      user_email: userEmail || null,
      error_type: errorType || 'js_error',
      severity: finalSeverity,
      message: message?.substring(0, 2000),
      stack_trace: stackTrace?.substring(0, 5000),
      module: module || 'unknown',
      page_url: pageUrl,
      browser,
      os,
      device_type: deviceType,
      additional_data: additionalData,
    });

    return new Response(JSON.stringify({ logged: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ logged: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
