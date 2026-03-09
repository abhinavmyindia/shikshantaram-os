import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ logged: false, error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const body = await req.json();

    const {
      userId = null,
      userEmail = null,
      errorType = 'js_error',
      severity = 'error',
      message = 'Unknown error',
      stackTrace = null,
      module = 'unknown',
      pageUrl = null,
      browser = null,
      os = null,
      deviceType = 'desktop',
      additionalData = {},
    } = body;

    // Auto-elevate severity for critical patterns
    const messageStr = String(message).toLowerCase();
    const isCritical =
      messageStr.includes('chunkloaderror') ||
      messageStr.includes('networkerror') ||
      messageStr.includes('failed to fetch') ||
      messageStr.includes('cannot read propert') ||
      messageStr.includes('is not a function') ||
      errorType === 'unhandled_rejection' ||
      errorType === 'react_error_boundary';

    const finalSeverity = isCritical ? 'critical' : severity;

    const { error: insertError } = await supabase.from('error_logs').insert({
      user_id: userId || null,
      user_email: userEmail || null,
      error_type: errorType,
      severity: finalSeverity,
      message: String(message).substring(0, 2000),
      stack_trace: stackTrace ? String(stackTrace).substring(0, 5000) : null,
      module,
      page_url: pageUrl ? String(pageUrl).substring(0, 500) : null,
      browser,
      os,
      device_type: deviceType,
      additional_data: additionalData,
      is_resolved: false,
    });

    if (insertError) {
      console.error('Supabase insert error:', JSON.stringify(insertError));
      return new Response(
        JSON.stringify({ logged: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ logged: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('log-error function crashed:', err);
    // Return 200 even on crash — never let error logging cause UI issues
    return new Response(
      JSON.stringify({ logged: false, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
