import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptKey, validateAnthropicKey, validateOpenAIKey, validateGeminiKey } from '../_shared/byok.ts';
import { verifyCaller, unauthorized, forbidden } from '../_shared/auth.ts';

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
    const { provider, rawKey } = await req.json();
    const userId = caller.userId; // derived from verified JWT

    if (!provider || !rawKey) {
      throw new Error('provider and rawKey are required');
    }

    if (!['anthropic', 'openai', 'gemini'].includes(provider)) {
      throw new Error('Invalid provider. Must be anthropic, openai, or gemini');
    }

    const trimmedKey = rawKey.trim();

    // Step 1: Validate the key with a real API call
    let isValid = false;
    let validationError = '';

    try {
      if (provider === 'anthropic') {
        isValid = await validateAnthropicKey(trimmedKey);
      } else if (provider === 'openai') {
        isValid = await validateOpenAIKey(trimmedKey);
      } else if (provider === 'gemini') {
        isValid = await validateGeminiKey(trimmedKey);
      }
    } catch (err: any) {
      validationError = err.message;
    }

    if (!isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: `API key validation failed for ${provider}. ${validationError || 'Please check the key and try again.'}`,
      }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Step 2: Encrypt the key
    const { encrypted, iv } = await encryptKey(trimmedKey);

    // Step 3: Build key hint (last 4 chars only)
    const keyHint = `...${trimmedKey.slice(-4)}`;

    // Step 4: Store encrypted key
    const { error: upsertError } = await supabase
      .from('user_byok_keys')
      .upsert({
        user_id: userId,
        provider,
        encrypted_key: encrypted,
        iv,
        key_hint: keyHint,
        is_active: true,
        is_valid: true,
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      success: true,
      provider,
      keyHint,
      message: `${provider} API key validated and saved successfully.`,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('save-byok-key error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
