import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const { userId, provider } = await req.json();
    if (!userId || !provider) throw new Error('userId and provider required');

    const { error } = await supabase
      .from('user_byok_keys')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) throw error;

    // If this was their preferred provider, clear that preference
    await supabase
      .from('user_profiles')
      .update({ byok_preferred_provider: null })
      .eq('id', userId)
      .eq('byok_preferred_provider', provider);

    return new Response(JSON.stringify({ success: true, provider }),
      { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
