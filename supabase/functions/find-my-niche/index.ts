import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAIKey, callWithBYOK, logByokUsage, logUsage } from '../_shared/byok.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERSONAS = [
  `You are Priya, a seasoned Indian niche strategist who has helped 300+ coaches and creators find their most profitable market position. You think deeply about the intersection of personal story, market demand, and monetisation potential in the Indian digital economy. Always respond with valid JSON only.`,
  `You are Vikram, an expert in identifying underserved niche opportunities in India's creator economy. You spot the exact micro-niche where a person's specific background creates an unfair advantage no generic competitor can replicate. Always respond with valid JSON only.`,
  `You are Deepa, a positioning consultant who specialises in finding niches with high emotional resonance — where buyers feel truly understood. You match a person's lived experience to the audience that desperately needs exactly what they've been through. Always respond with valid JSON only.`,
];

const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Sanitize user input — strip control chars and limit length
const sanitize = (input: string | undefined, maxLen = 2000): string => {
  if (!input) return '';
  return String(input)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .substring(0, maxLen);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ─── Request size guard ───
    const bodyText = await req.text();
    if (bodyText.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Request too large. Please reduce your input.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const body = JSON.parse(bodyText);

    // ─── Auth ───
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: { user } } = await anonClient.auth.getUser(token);
    const userId = user?.id || '';
    const userEmail = user?.email || '';

    // ─── Check blocked users ───
    if (userId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
      );
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('access_tier')
        .eq('id', userId)
        .single();
      if (profile?.access_tier === 'revoked') {
        return new Response(
          JSON.stringify({ error: 'Your access has been revoked. Contact support.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const {
      background: rawBg,
      skills: rawSkills,
      passions: rawPassions,
      experience: rawExp,
      goals: rawGoals,
      country = 'India',
    } = body;

    // ─── Sanitize inputs ───
    const background = sanitize(rawBg);
    const skills = sanitize(rawSkills);
    const passions = sanitize(rawPassions);
    const experience = sanitize(rawExp);
    const goals = sanitize(rawGoals);

    // ─── Input validation ───
    const hasContent = [background, skills, passions, experience, goals]
      .some(f => f && f.trim().length >= 10);

    if (!hasContent) {
      return new Response(
        JSON.stringify({ error: 'Please fill in at least one field with 10+ characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── API key check ───
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('[find-my-niche] CRITICAL: No ANTHROPIC_API_KEY found in secrets');
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable. Please try again later.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const buildField = (label: string, value: string) =>
      value?.trim() ? `${label}: ${value.trim()}` : '';

    const userContext = [
      buildField('Background & Story', background),
      buildField('Skills & Strengths', skills),
      buildField('Passions & Interests', passions),
      buildField('Experience & Achievements', experience),
      buildField('Goals & Ambitions', goals),
    ].filter(Boolean).join('\n\n');

    const systemPrompt = pickOne(PERSONAS);

    const prompt = `A person wants to find their perfect niche to build a digital product or coaching business. Here is everything they've shared about themselves:

${userContext}

Target Market: ${country}

Your job is to recommend exactly 5 niches that are:
1. A genuine fit for THIS SPECIFIC PERSON based on what they've shared — not generic suggestions
2. Commercially viable in ${country} with real buyer demand
3. Specific enough that they have a clear, differentiated position
4. Varied — don't give 5 versions of the same niche. Cover different angles, audiences, and formats.

For each niche, explain WHY this specific person (based on their background/skills/story) is the ideal person to serve this market. Make it personal — reference specific things they mentioned.

Return ONLY a JSON array of exactly 5 objects:
[
  {
    "nicheName": "Specific niche name (not generic — e.g. 'Financial recovery coaching for Indian women after divorce' not just 'personal finance')",
    "nicheCategory": "one of: Mental Health | Career & Business | Health & Fitness | Relationships | Parenting | Spirituality | Education | Finance | Productivity | Creative | Technology | Lifestyle",
    "tagline": "One-line positioning statement under 12 words — what transformation you deliver",
    "whyYouFit": "2-3 sentences — specifically referencing what THEY shared and why it makes them perfect for this niche. Be personal and specific, not generic.",
    "targetBuyer": "Specific buyer avatar — who exactly will pay for your help",
    "coreProblem": "The single most painful problem this niche has that you can solve",
    "marketDemand": "High" | "Medium" | "Growing",
    "competition": "Low" | "Medium" | "High",
    "monetisationPotential": "High" | "Medium" | "Strong",
    "earningPotential": "e.g. Rs.50,000-2,00,000/month at scale",
    "productIdea": "The first product this person should build — specific, not vague",
    "firstStep": "The single most important thing they should do in the next 7 days to validate this niche",
    "fitScore": <number 1-10, how well this matches their background/skills/passions>
  }
]`;

    // ─── BYOK routing ───
    if (userId) {
      try {
        const resolved = await resolveAIKey(userId);
        if (resolved.useByok) {
          const result = await callWithBYOK({
            provider: resolved.provider as any,
            apiKey: resolved.apiKey,
            model: resolved.model,
            system: systemPrompt,
            userMessage: prompt,
            maxTokens: 5000,
          });

          await logByokUsage(
            userId, userEmail, resolved.provider, resolved.model,
            'niche_clarity', 'find_niche',
            result.inputTokens, result.outputTokens, true
          );

          const raw = result.text.replace(/```json|```/g, '').trim();
          let niches;
          try {
            niches = JSON.parse(raw);
            if (!Array.isArray(niches) || niches.length === 0) throw new Error('Empty array');
          } catch (parseErr) {
            console.error('[find-my-niche] BYOK JSON parse failed:', (parseErr as Error).message);
            return new Response(
              JSON.stringify({ error: 'AI generated an unexpected format. Please try again.' }),
              { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(JSON.stringify({
            niches,
            usage: { input_tokens: result.inputTokens, output_tokens: result.outputTokens },
            byok: true,
            provider: resolved.provider,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (byokErr) {
        console.error('BYOK fallback to platform:', byokErr);
      }
    }

    // ─── Platform path (Anthropic) with retry + timeout ───
    let response: Response | null = null;
    let lastErr = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 5000,
            temperature: 0.9,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          if (attempt === 2) {
            return new Response(
              JSON.stringify({ error: 'AI request timed out. Please try again with shorter input.' }),
              { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.warn(`[find-my-niche] Timeout attempt ${attempt + 1}, retrying...`);
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw fetchErr;
      }

      if (response.ok) break;

      lastErr = await response.text();
      const isRetryable = response.status === 429 || response.status === 529
        || response.status === 500 || response.status === 503
        || lastErr.includes('overloaded');
      if (!isRetryable || attempt === 2) {
        throw new Error(`Anthropic API error: ${lastErr}`);
      }
      console.warn(`Anthropic attempt ${attempt + 1} failed (${response.status}), retrying...`);
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
    }

    const data = await response!.json();
    const rawText = data.content?.[0]?.text || '';

    // ─── Safe JSON parse ───
    let niches;
    try {
      const cleanText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      niches = JSON.parse(cleanText);
      if (!Array.isArray(niches) || niches.length === 0) {
        throw new Error('AI returned empty or non-array response');
      }
    } catch (parseError) {
      console.error('[find-my-niche] JSON parse failed:', (parseError as Error).message);
      console.error('[find-my-niche] Raw AI text:', rawText.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: 'AI generated an unexpected format. Please try again — results may vary.',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log platform usage
    if (userId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
      );
      await logUsage({
        supabaseAdmin, userId, userEmail,
        module: 'niche_clarity', callType: 'find_niche',
        model: 'claude-sonnet-4-20250514',
        usage: data.usage,
      });
    }

    return new Response(JSON.stringify({ niches, usage: data.usage, byok: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('find-my-niche error:', err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
