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
    if (!userId) throw new Error('userId required');

    if (provider && !['anthropic', 'openai', 'gemini'].includes(provider)) {
      throw new Error('Invalid provider');
    }

    // Verify the user has a valid key for this provider
    if (provider) {
      const { data: keyRecord } = await supabase
        .from('user_byok_keys')
        .select('is_valid, is_active')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (!keyRecord?.is_valid || !keyRecord?.is_active) {
        throw new Error(`No valid ${provider} key found. Please add and validate your key first.`);
      }
    }

    await supabase
      .from('user_profiles')
      .update({ byok_preferred_provider: provider || null })
      .eq('id', userId);

    return new Response(JSON.stringify({ success: true, preferredProvider: provider || null }),
      { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
