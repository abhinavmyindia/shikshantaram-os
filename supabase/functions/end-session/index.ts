import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { sessionToken, reason = 'user_logout' } = await req.json();

    await supabase.from('login_sessions')
      .update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: reason })
      .eq('session_token', sessionToken);

    return new Response(JSON.stringify({ ended: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ended: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
