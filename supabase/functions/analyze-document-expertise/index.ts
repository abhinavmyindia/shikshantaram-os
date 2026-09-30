import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getVerifiedUser, unauthorized } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CREATIVE_CONSTRAINTS = [
  'At least 4 ideas must be executable by a solo creator in under 2 weeks.',
  'At least 4 ideas must use WhatsApp, Telegram, or Instagram as delivery channel.',
  'At least 3 ideas must target a painful transition moment (career change, new skill, pivot).',
  'At least 4 ideas must be priced under Rs.999 to capture impulse buyers first.',
  'At least 4 ideas must solve a problem that causes professional embarrassment.',
  'At least 4 ideas must have a visible, measurable outcome within 30 days.',
];

const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getVerifiedUser(req);
  if (!caller) return unauthorized(corsHeaders);

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

  try {
    const {
      country = 'India',
      fileBase64, fileType, filename, docId,
      extractedText, existingProducts = [],
    } = await req.json();

    const userId = caller.userId; // never trust a userId from the request body
    const userEmail = caller.userEmail;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Build document content for Anthropic
    let documentContent: any[];

    if (extractedText && extractedText.length > 0) {
      documentContent = [{ type: 'text', text: `DOCUMENT CONTENT:\n\n${extractedText.slice(0, 50000)}` }];
    } else if (fileBase64 && fileType === 'pdf') {
      documentContent = [{
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
      }];
    } else if (fileBase64) {
      const text = atob(fileBase64);
      documentContent = [{ type: 'text', text: `DOCUMENT CONTENT:\n\n${text.slice(0, 50000)}` }];
    } else {
      throw new Error('No document content provided.');
    }

    const existingList = existingProducts.length > 0
      ? `\nDo NOT repeat these:\n${existingProducts.join(', ')}`
      : '';
    const constraint = pickOne(CREATIVE_CONSTRAINTS);

    const extractionPrompt = `You are reading a document that belongs to someone who wants to create a digital product from their knowledge.

Your job is to:
1. Understand what this person KNOWS — their skills, experiences, frameworks, methods, tools
2. Identify what problems they have solved for others or themselves
3. Detect the underlying niche and expertise areas
4. Generate 15 highly specific, personalised digital product ideas based ONLY on what this document reveals

CRITICAL RULES:
- Only suggest products this specific person could authentically create
- Do NOT suggest generic ideas that anyone in this niche would generate
- Each idea must connect directly to a specific skill, experience, or insight found in the document
- Products should be buildable without hiring anyone or learning new skills
- Market: ${country}
${existingList}

CONSTRAINT FOR THIS BATCH: ${constraint}

Return ONLY a JSON object:
{
  "expertiseSummary": "2-3 sentences: what this person knows and what makes their knowledge valuable",
  "detectedNiche": "the primary niche this expertise belongs to",
  "expertiseTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "keyStrengths": ["specific strength from the doc 1", "strength 2", "strength 3"],
  "audienceClues": "who would pay for this person's knowledge based on the document",
  "ideas": [
    {
      "productName": "specific product name referencing their actual expertise",
      "tagline": "benefit-driven line under 12 words",
      "primaryPain": "exact pain this solves in 8 words",
      "targetAudience": "specific buyer in 10 words",
      "whyThisPersonCanBuildIt": "1 sentence: exactly what from their document qualifies them",
      "demandScore": "<number 1-10>",
      "competitionLevel": "Low|Medium|High",
      "buildTime": "X-Y weeks",
      "impulseScore": "<number 1-10>",
      "impulseTag": "🔥 Viral Potential|💎 Premium|⚡ Quick Win|🎯 High Demand|🌟 Evergreen",
      "priceRange": "₹XXX–₹X,XXX",
      "searchKeyword": "most likely search term",
      "productCategory": "Online Course|Template|Coaching|Community|Tool|Ebook|Workshop",
      "whyUnique": "what makes this different from generic products in this niche"
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        temperature: 0.9,
        system: `You are an expert at reading people's documents and uncovering the unique knowledge products hidden inside their experience. You always find the specific, authentic product angle that only THIS person could create. Always respond with valid JSON only. No markdown, no explanation.`,
        messages: [{
          role: 'user',
          content: [...documentContent, { type: 'text', text: extractionPrompt }],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const aiResponse = await response.json();
    const raw = aiResponse.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);

    // Increment use_count if from a saved doc
    if (docId) {
      await supabase.rpc('increment_knowledge_use', { doc_id: docId, doc_user_id: userId }).catch(() => {});
      // Fallback: direct update
      await supabase
        .from('user_knowledge_docs')
        .update({ use_count: (result.use_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', docId)
        .eq('user_id', userId)
        .catch(() => {});
    }

    // Log usage server-side
    if (aiResponse.usage) {
      try {
        const inputTokens = aiResponse.usage.input_tokens || 0;
        const outputTokens = aiResponse.usage.output_tokens || 0;
        await supabase.from('ai_usage_logs').insert({
          user_id: userId || null,
          user_email: userEmail || 'anonymous',
          module: 'product_navigator',
          call_type: 'analyze_expertise',
          model: 'claude-sonnet-4-20250514',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          estimated_cost_usd: (inputTokens / 1_000_000 * 3.00) + (outputTokens / 1_000_000 * 15.00),
          session_id: 'server',
          logged_from: 'edge_function',
        });
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      expertiseProfile: {
        summary: result.expertiseSummary,
        detectedNiche: result.detectedNiche,
        tags: result.expertiseTags,
        strengths: result.keyStrengths,
        audienceClues: result.audienceClues,
      },
      ideas: result.ideas || [],
      usage: aiResponse.usage,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('analyze-document-expertise error:', err);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
