import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(corsHeaders);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      eventType, module,
      eventData = {}, sessionId, ipAddress, durationMs
    } = await req.json();
    // Identity is derived from verified JWT — never trust client-supplied values.
    const userId = caller.userId;
    const userEmail = caller.email;

    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      event_type: eventType,
      module,
      event_data: eventData,
      session_id: sessionId,
      ip_address: ipAddress,
      duration_ms: durationMs,
    });

    return new Response(JSON.stringify({ tracked: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ tracked: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
