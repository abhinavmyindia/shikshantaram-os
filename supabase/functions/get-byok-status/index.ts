import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCaller, unauthorized } from '../_shared/auth.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const caller = await verifyCaller(req);
  if (!caller) return unauthorized(cors);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const userId = caller.userId; // derived from verified JWT

    // Explicitly exclude encrypted_key and iv — NEVER return these
    // Use safe view — encrypted_key and iv are physically absent
    const { data: keys } = await supabase
      .from('user_byok_keys_safe')
      .select('provider, key_hint, is_active, is_valid, last_validated_at, last_used_at, created_at')
      .eq('user_id', userId);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('byok_preferred_provider')
      .eq('id', userId)
      .single();

    const status = ['anthropic', 'openai', 'gemini'].map(provider => {
      const keyRecord = (keys || []).find(k => k.provider === provider);
      return {
        provider,
        connected: !!keyRecord,
        isActive: keyRecord?.is_active || false,
        isValid: keyRecord?.is_valid || false,
        keyHint: keyRecord?.key_hint || null,
        lastValidated: keyRecord?.last_validated_at || null,
        lastUsed: keyRecord?.last_used_at || null,
        connectedSince: keyRecord?.created_at || null,
      };
    });

    return new Response(JSON.stringify({
      status,
      preferredProvider: profile?.byok_preferred_provider || null,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
