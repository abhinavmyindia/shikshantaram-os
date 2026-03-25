// ─── ENCRYPTION HELPERS ───────────────────────────────────────────────────────

const ENCRYPTION_KEY = Deno.env.get('BYOK_ENCRYPTION_KEY') || '';

const getKey = async (): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return keyMaterial;
};

export const encryptKey = async (rawKey: string): Promise<{ encrypted: string; iv: string }> => {
  const key = await getKey();
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(rawKey);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encoded
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...ivBytes)),
  };
};

export const decryptKey = async (encrypted: string, iv: string): Promise<string> => {
  const key = await getKey();
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(plaintext);
};

// ─── KEY VALIDATION ──────────────────────────────────────────────────────────

export const validateAnthropicKey = async (apiKey: string): Promise<boolean> => {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    return res.status === 200 || res.status === 529;
  } catch {
    return false;
  }
};

export const validateOpenAIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return res.status === 200;
  } catch {
    return false;
  }
};

export const validateGeminiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    return res.status === 200;
  } catch {
    return false;
  }
};

// ─── NORMALIZED AI CALL INTERFACE ────────────────────────────────────────────

export interface AICallParams {
  provider: 'anthropic' | 'openai' | 'gemini';
  apiKey: string;
  model?: string;
  system?: string;
  userMessage: string;
  maxTokens?: number;
  tools?: any[];
  responseFormat?: 'json' | 'text';
}

export interface AICallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
};

export const callWithBYOK = async (params: AICallParams): Promise<AICallResult> => {
  const { provider, apiKey, system, userMessage, maxTokens = 4000, tools, model } = params;
  const resolvedModel = model || DEFAULT_MODELS[provider];

  if (provider === 'anthropic') {
    return callAnthropic(apiKey, resolvedModel, system, userMessage, maxTokens, tools);
  } else if (provider === 'openai') {
    return callOpenAI(apiKey, resolvedModel, system, userMessage, maxTokens);
  } else if (provider === 'gemini') {
    return callGemini(apiKey, resolvedModel, system, userMessage, maxTokens);
  }

  throw new Error(`Unknown provider: ${provider}`);
};

// ─── PROVIDER: ANTHROPIC ─────────────────────────────────────────────────────
const callAnthropic = async (
  apiKey: string, model: string, system: string | undefined,
  userMessage: string, maxTokens: number, tools?: any[]
): Promise<AICallResult> => {
  const body: any = { model, max_tokens: maxTokens, messages: [{ role: 'user', content: userMessage }] };
  if (system) body.system = system;
  if (tools) body.tools = tools;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  return {
    text,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
    model,
    provider: 'anthropic',
  };
};

// ─── PROVIDER: OPENAI ────────────────────────────────────────────────────────
const callOpenAI = async (
  apiKey: string, model: string, system: string | undefined,
  userMessage: string, maxTokens: number
): Promise<AICallResult> => {
  const messages: any[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userMessage });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    model,
    provider: 'openai',
  };
};

// ─── PROVIDER: GEMINI ────────────────────────────────────────────────────────
const callGemini = async (
  apiKey: string, model: string, system: string | undefined,
  userMessage: string, maxTokens: number
): Promise<AICallResult> => {
  const body: any = {
    contents: [{ parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    model,
    provider: 'gemini',
  };
};

// ─── BYOK RESOLVER ──────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const resolveAIKey = async (
  userId: string,
  preferredProvider?: string
): Promise<
  | { useByok: true; provider: string; apiKey: string; model: string }
  | { useByok: false }
> => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    let provider = preferredProvider;
    if (!provider) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('byok_preferred_provider')
        .eq('id', userId)
        .single();
      provider = profile?.byok_preferred_provider;
    }

    if (!provider) return { useByok: false };

    const { data: keyRecord } = await supabase
      .from('user_byok_keys')
      .select('encrypted_key, iv, provider')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .eq('is_valid', true)
      .single();

    if (!keyRecord) return { useByok: false };

    const rawKey = await decryptKey(keyRecord.encrypted_key, keyRecord.iv);

    await supabase
      .from('user_byok_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider);

    return {
      useByok: true,
      provider: keyRecord.provider,
      apiKey: rawKey,
      model: DEFAULT_MODELS[provider],
    };
  } catch {
    return { useByok: false };
  }
};

export const logByokUsage = async (
  userId: string, userEmail: string | null,
  provider: string, model: string,
  module: string, callType: string,
  inputTokens: number, outputTokens: number,
  success: boolean, errorMessage?: string
): Promise<void> => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    await supabase.from('byok_usage_logs').insert({
      user_id: userId, user_email: userEmail,
      provider, model, module, call_type: callType,
      input_tokens: inputTokens, output_tokens: outputTokens,
      success, error_message: errorMessage || null,
    });
  } catch (_) { /* Never block AI call due to logging failure */ }
};
