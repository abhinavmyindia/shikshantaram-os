import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Auto-diagnosis engine
const diagnose = (message: string, errorType: string, module: string): { diagnosis: string; fix: string } => {
  const msg = message.toLowerCase();

  if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return {
      diagnosis: 'Network request failed — Edge Function may be down or user has no internet',
      fix: 'Check Supabase Edge Function logs. Verify API keys are set in secrets.',
    };
  }
  if (msg.includes('http 500')) {
    return {
      diagnosis: 'Edge Function returned 500 — server-side crash in the function',
      fix: `Check Edge Functions → ${module} → Logs for the actual error. Most likely: missing API key or code error.`,
    };
  }
  if (msg.includes('api key') || msg.includes('401') || msg.includes('403')) {
    return {
      diagnosis: 'API authentication failed — API key may be missing or invalid',
      fix: 'Verify API keys are set correctly in Edge Function secrets.',
    };
  }
  if (msg.includes('chunkloaderror') || msg.includes('loading chunk')) {
    return {
      diagnosis: 'React code chunk failed to load — usually a deploy/cache issue',
      fix: 'Ask user to hard refresh (Ctrl+Shift+R). If widespread, redeploy the app.',
    };
  }
  if (msg.includes('cannot read prop') || msg.includes('is not a function') || msg.includes('undefined')) {
    return {
      diagnosis: 'JavaScript runtime error — accessing a property on undefined/null',
      fix: `Add null checks in the ${module} component. Check the stack trace for the exact line.`,
    };
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return {
      diagnosis: 'Request timed out — Edge Function took too long',
      fix: 'Optimize the Edge Function prompt length or switch to streaming.',
    };
  }
  if (errorType === 'react_error_boundary') {
    return {
      diagnosis: 'React component crashed and triggered the Error Boundary',
      fix: `Check the component stack trace. The ${module} component has a render error.`,
    };
  }
  if (msg.includes('lock broken') || msg.includes('lock was not granted')) {
    return {
      diagnosis: 'Auth lock contention — multiple concurrent auth requests raced',
      fix: 'Harmless race condition. Use getSession() instead of getUser() to avoid lock stealing.',
    };
  }
  if (msg.includes('supabase') || msg.includes('postgrest')) {
    return {
      diagnosis: 'Database query failed',
      fix: 'Check RLS policies and table schema. Query may be hitting a missing column or policy block.',
    };
  }

  return {
    diagnosis: 'Unclassified error — review stack trace for details',
    fix: 'Check the full stack trace and additional data for clues.',
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    // Auto-elevate severity
    const msgLower = String(message).toLowerCase();
    const isCritical =
      msgLower.includes('chunkloaderror') ||
      msgLower.includes('failed to fetch') ||
      msgLower.includes('http 500') ||
      errorType === 'react_error_boundary' ||
      errorType === 'unhandled_rejection';
    const finalSeverity = isCritical ? 'critical' : severity;

    // Generate fingerprint for deduplication
    const fingerprintRaw = `${errorType}::${String(message).substring(0, 100)}::${module}`;
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(fingerprintRaw)
    );
    const fingerprint = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32);

    // Auto-diagnose
    const { diagnosis, fix } = diagnose(message, errorType, module);

    // Check if this fingerprint was logged in the last 10 seconds (server-side dedup)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recent } = await supabase
      .from('error_logs')
      .select('id, occurrence_count')
      .eq('fingerprint', fingerprint)
      .gte('last_seen_at', tenSecondsAgo)
      .limit(1)
      .single();

    if (recent) {
      // Increment occurrence count on existing record
      await supabase
        .from('error_logs')
        .update({
          occurrence_count: ((recent as any).occurrence_count || 1) + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', (recent as any).id);

      return new Response(
        JSON.stringify({ logged: true, type: 'incremented', id: (recent as any).id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new error record
    const { data: inserted, error: insertError } = await supabase
      .from('error_logs')
      .insert({
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
        fingerprint,
        occurrence_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        auto_diagnosis: diagnosis,
        suggested_fix: fix,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert failed:', JSON.stringify(insertError));
      return new Response(
        JSON.stringify({ logged: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── ALERT: If critical error, send email alert to owner ───
    if (finalSeverity === 'critical') {
      try {
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count } = await supabase
          .from('error_logs')
          .select('*', { count: 'exact', head: true })
          .eq('severity', 'critical')
          .gte('created_at', oneHourAgo);

        const shouldAlert = count === 1 || (count !== null && count % 10 === 0);

        if (shouldAlert) {
          const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
          const OWNER_EMAIL = Deno.env.get('OWNER_ALERT_EMAIL') || 'abhinavpvt03@outlook.com';

          if (RESEND_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'alerts@shikshantaram.in',
                to: OWNER_EMAIL,
                subject: `🚨 [Shikshantaram OS] Critical Error: ${String(message).substring(0, 60)}`,
                html: `
                  <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#7c3aed,#ef4444);padding:24px 32px;">
                      <h1 style="color:white;font-size:20px;margin:0;">🚨 Critical Error Alert</h1>
                      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;">Shikshantaram OS — Auto Alert</p>
                    </div>
                    <div style="padding:24px 32px;">
                      <table style="width:100%;font-size:13px;border-collapse:collapse;">
                        <tr><td style="padding:8px 0;color:#64748b;width:120px;">Module</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${module}</td></tr>
                        <tr><td style="padding:8px 0;color:#64748b;">Error</td><td style="padding:8px 0;color:#0f172a;">${String(message).substring(0, 200)}</td></tr>
                        <tr><td style="padding:8px 0;color:#64748b;">User</td><td style="padding:8px 0;color:#0f172a;">${userEmail || 'Unknown'}</td></tr>
                        <tr><td style="padding:8px 0;color:#64748b;">Critical this hour</td><td style="padding:8px 0;color:#ef4444;font-weight:700;">${count} errors</td></tr>
                      </table>
                      <div style="margin-top:16px;padding:12px;background:#f5f3ff;border-radius:8px;">
                        <p style="font-size:12px;font-weight:700;color:#7c3aed;margin:0 0 4px;">🔍 Auto Diagnosis</p>
                        <p style="font-size:13px;color:#1e1b4b;margin:0;">${diagnosis}</p>
                      </div>
                      <div style="margin-top:12px;padding:12px;background:#f0fdf4;border-radius:8px;">
                        <p style="font-size:12px;font-weight:700;color:#059669;margin:0 0 4px;">✅ Suggested Fix</p>
                        <p style="font-size:13px;color:#064e3b;margin:0;">${fix}</p>
                      </div>
                    </div>
                  </div>
                `,
              }),
            });
          }
        }
      } catch (_) {
        // Alert failure should never block error logging
      }
    }

    return new Response(
      JSON.stringify({ logged: true, type: 'new', id: (inserted as any)?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('log-error function error:', err);
    return new Response(
      JSON.stringify({ logged: false, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
