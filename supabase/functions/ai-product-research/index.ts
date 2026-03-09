import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── PRICING for Lovable AI Gateway models (per 1M tokens) ───
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-3-flash-preview':  { input: 0.10, output: 0.40 },
  'google/gemini-2.5-flash':        { input: 0.15, output: 0.60 },
  'google/gemini-2.5-flash-lite':   { input: 0.075, output: 0.30 },
  'google/gemini-2.5-pro':          { input: 1.25, output: 10.00 },
  'google/gemini-3.1-pro-preview':  { input: 1.25, output: 10.00 },
  'openai/gpt-5':                   { input: 2.50, output: 10.00 },
  'openai/gpt-5-mini':              { input: 0.40, output: 1.60 },
  'openai/gpt-5-nano':              { input: 0.10, output: 0.40 },
};

async function logAiUsage(
  supabaseAdmin: any,
  userId: string | null,
  userEmail: string | null,
  userName: string | null,
  module: string,
  callType: string,
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null
) {
  try {
    if (!usage) return;
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);
    const pricing = MODEL_PRICING[model] || { input: 0.50, output: 2.00 };
    const estimatedCost = (inputTokens / 1_000_000 * pricing.input) + (outputTokens / 1_000_000 * pricing.output);

    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId,
      user_email: userEmail || 'anonymous',
      user_name: userName || 'Unknown',
      module,
      call_type: callType,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
    });
  } catch (err) {
    console.warn('Usage logging failed:', err);
  }
}

// ─── PROMPTS ─────────────────────────────────────────────────

function buildGenerateIdeasPrompt(niche: string, country: string, productType: string): string {
  return `You are an expert digital product researcher and market analyst.

A creator wants to build a digital product with these parameters:
- NICHE: ${niche}
- TARGET COUNTRY: ${country}
- PRODUCT FORMAT: ${productType}

Your task: Generate exactly 30 unique, highly specific, market-validated digital product ideas.

For EACH of the 30 ideas, provide:
1. productName: A specific, compelling product name (not generic)
2. tagline: One punchy sentence describing who it's for and what it does
3. targetAudience: The exact type of person who would buy this (be very specific)
4. priceRange: Realistic price range for ${country} market (local currency)
5. buildTime: How long to create (e.g. "1 day", "3 days", "1 week")
6. marketSize: Brief market size indicator ("Massive", "Large", "Medium", "Niche")
7. demandScore: 1-10 score for current market demand
8. competitionLevel: "Low", "Medium", or "High"
9. impulseScore: "High", "Medium", or "Low" — how likely buyers purchase on impulse
10. primaryPain: The single biggest pain point this product solves (1 sentence, very specific)
11. searchKeyword: The top keyword people search to find solutions like this

CRITICAL REQUIREMENTS:
- All ideas must be SPECIFIC to ${country} market context, culture, and buying power
- Use local pricing that makes sense (e.g. ₹499 for India, $47 for US)
- Reference country-specific platforms, behaviors, and pain points
- Do NOT generate generic ideas — every idea must feel tailor-made
- Ideas should span different sub-niches within ${niche}
- Vary the demand scores and impulse scores — not everything should be 9/10
- Make the target audiences extremely specific

Return ONLY a valid JSON array of exactly 30 objects. No preamble, no markdown, no explanation.`;
}

function buildAnalyzeIdeaPrompt(ideaText: string, country: string): string {
  return `You are an expert product strategist and market analyst.

A creator has shared a raw business idea. Analyze it and help them understand its market potential.

RAW IDEA: "${ideaText}"
TARGET COUNTRY: ${country}

Analyze this idea and return ONLY a valid JSON object with this exact structure:

{
  "ideaSummary": "Restate their idea in one clear, sharp sentence (improve their wording if needed)",
  "detectedNiche": "The specific niche this falls into (e.g. 'Freelancing & Career Growth')",
  "detectedCategory": "One of: Health, Finance, Career, Business, Creativity, Education, Technology, Lifestyle, Relationships, Other",
  "coreProblem": "The real underlying problem this idea solves (1-2 sentences, be specific)",
  "targetBuyer": "The exact person who would pay for this (very specific, not generic)",
  "ideaStrengths": ["Strength 1 of their idea", "Strength 2", "Strength 3"],
  "ideaGaps": ["One thing missing or unclear", "One risk to consider"],
  "marketReadiness": "High",
  "marketReadinessReason": "Why the market is ready (or not) for this right now in ${country}",
  "angles": [
    {
      "angleId": "A",
      "angleName": "Name of this product angle (catchy, specific)",
      "angleDescription": "2-3 sentences on what this product would be and who buys it",
      "productFormat": "Best format (e.g. Ebook, Template, Micro-Course, Prompt Pack)",
      "priceRange": "Realistic price in ${country} currency",
      "buildTime": "e.g. 2 days",
      "whyThisWorks": "One sentence on why this specific angle is strong right now",
      "demandSignal": "High"
    },
    {
      "angleId": "B",
      "angleName": "Second angle name",
      "angleDescription": "2-3 sentences",
      "productFormat": "Format",
      "priceRange": "Price",
      "buildTime": "Time",
      "whyThisWorks": "Reason",
      "demandSignal": "Medium"
    },
    {
      "angleId": "C",
      "angleName": "Third angle name",
      "angleDescription": "2-3 sentences",
      "productFormat": "Format",
      "priceRange": "Price",
      "buildTime": "Time",
      "whyThisWorks": "Reason",
      "demandSignal": "Medium"
    }
  ],
  "recommendedAngle": "A",
  "recommendedAngleReason": "Why you recommend this specific angle over the others"
}

Be specific to ${country} context. No preamble, no markdown. Return only the JSON.`;
}

function buildRawIdeaIdeasPrompt(ideaText: string, analysis: any, chosenAngle: any, country: string): string {
  return `You are an expert digital product researcher.

A creator has a raw business idea and has chosen a specific product angle to explore.

ORIGINAL RAW IDEA: "${ideaText}"
DETECTED NICHE: ${analysis.detectedNiche}
CHOSEN ANGLE: ${chosenAngle.angleName}
ANGLE DESCRIPTION: ${chosenAngle.angleDescription}
PRODUCT FORMAT: ${chosenAngle.productFormat}
TARGET COUNTRY: ${country}
TARGET BUYER: ${analysis.targetBuyer}
CORE PROBLEM BEING SOLVED: ${analysis.coreProblem}

Your task: Generate exactly 30 unique digital product ideas that are DIRECT EXPANSIONS AND VARIATIONS of this specific angle and original idea. 

CRITICAL: 
- All 30 ideas must feel like natural variations of the creator's original concept
- Use their specific context, language, and target audience throughout
- Idea #1 should be the most direct execution of their idea
- Ideas #2-15 should be variations (different formats, different sub-audiences, different price points)
- Ideas #16-30 should be creative expansions (adjacent problems, complementary products, upsells/downsells)
- Price all products realistically for ${country}
- Reference ${country}-specific platforms, behaviors, and context

For EACH of the 30 ideas return this exact JSON structure in an array:
{"productName":"...","tagline":"...","targetAudience":"...","priceRange":"...","buildTime":"...","marketSize":"...","demandScore":8,"competitionLevel":"Low","impulseScore":"High","primaryPain":"...","searchKeyword":"...","ideaConnection":"One sentence explaining how this connects to their original idea"}

Return ONLY a valid JSON array of exactly 30 objects. No preamble, no markdown.`;
}

function buildDeepResearchPrompt(product: any, inputData: any): string {
  return `You are a world-class product researcher, market analyst, and consumer psychologist.

Generate a COMPREHENSIVE research report for this digital product:

PRODUCT: ${product.productName}
NICHE: ${inputData.niche}
FORMAT: ${inputData.productType}
TARGET COUNTRY: ${inputData.country}
TAGLINE: ${product.tagline}
PRIMARY PAIN: ${product.primaryPain}
SEARCH KEYWORD: ${product.searchKeyword}

Provide deep analysis covering:
1. Real demand data for "${product.searchKeyword} ${inputData.country}"
2. Existing products/solutions in this space
3. Real competitor examples and pricing
4. Social media discussions about this pain point
5. Available market size data

Return ONLY a valid JSON object with this EXACT structure (no markdown, no extra text):

{
  "marketOverview": {
    "totalAddressableMarket": "Specific market size with numbers",
    "growthRate": "e.g. '28% YoY growth'",
    "primaryAudience": "Very specific description of the ideal buyer",
    "audienceSize": "Estimated number of potential buyers in ${inputData.country}",
    "buyingPower": "Description of their financial capacity and willingness to pay",
    "platformsTheyUseToFind": ["platform1","platform2","platform3"]
  },
  "searchDemand": {
    "primaryKeyword": "${product.searchKeyword}",
    "estimatedMonthlySearches": "Estimated searches/month",
    "relatedKeywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
    "trendDirection": "Rising/Stable/Declining",
    "trendNote": "Brief explanation",
    "bestTimeToLaunch": "e.g. 'January-March'"
  },
  "painPoints": [
    {"rank":1,"title":"Pain point title","description":"2-3 sentence description","emotionalWeight":"High/Medium/Low","trigger":"What triggers this pain"},
    {"rank":2,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."},
    {"rank":3,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."},
    {"rank":4,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."},
    {"rank":5,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."}
  ],
  "transformation": {
    "beforeHeadline": "A short punchy headline capturing the before state",
    "beforeParagraph": "A rich, vivid 3-4 sentence narrative describing the buyer's current reality. Write in second person. Capture the emotion, the frustration, the specific daily struggle. Reference ${inputData.country} context.",
    "beforeMoments": ["Specific micro-moment 1","Micro-moment 2","Micro-moment 3"],
    "afterHeadline": "A short punchy headline capturing the after state",
    "afterParagraph": "A rich, vivid 3-4 sentence narrative describing the buyer's life AFTER. Same second person voice. Capture the new identity, the specific results, the emotional relief and pride.",
    "afterMoments": ["After micro-moment 1","After micro-moment 2","After micro-moment 3"],
    "transformationBridge": "ONE powerful sentence: 'From [before] to [after] — without [objection].'",
    "timeToTransformation": "Realistic timeframe",
    "identityShift": "The new identity label"
  },
  "deepestDesires": [
    {"desire":"What they REALLY want","underlyingBelief":"What they believe","emotionalDriver":"Core emotion"},
    {"desire":"...","underlyingBelief":"...","emotionalDriver":"..."},
    {"desire":"...","underlyingBelief":"...","emotionalDriver":"..."}
  ],
  "empathyMap": {
    "thinks": ["thought1","thought2","thought3"],
    "feels": ["feeling1","feeling2","feeling3"],
    "sees": ["observation1","observation2","observation3"],
    "hears": ["what they hear1","what they hear2"],
    "says": ["what they say1","what they say2"],
    "does": ["behavior1","behavior2","behavior3"]
  },
  "primarySolution": {
    "howProductSolvesIt": "2-3 sentences",
    "uniqueMechanism": "What makes this different",
    "quickWin": "First result within 24 hours",
    "transformationStatement": "Before to After",
    "priceJustification": "Why the price is fair"
  },
  "impulsePurchaseAnalysis": {
    "score": "${product.impulseScore}",
    "rating": 7,
    "whyTheyBuyNow": "Specific trigger",
    "purchaseTriggers": ["trigger1","trigger2","trigger3"],
    "objections": ["objection1","objection2","objection3"],
    "objectionHandlers": ["handler1","handler2","handler3"]
  },
  "competitorLandscape": {
    "directCompetitors": [
      {"name":"Competitor name","platform":"Where they sell","price":"Their price","weakness":"Their gap"}
    ],
    "marketGap": "The specific gap this product fills",
    "differentiationOpportunity": "How to stand out"
  },
  "nextSteps": [
    {"step":1,"action":"Specific action","timeframe":"e.g. Today","tool":"Tool to use","details":"How to do this"},
    {"step":2,"action":"...","timeframe":"...","tool":"...","details":"..."},
    {"step":3,"action":"...","timeframe":"...","tool":"...","details":"..."},
    {"step":4,"action":"...","timeframe":"...","tool":"...","details":"..."},
    {"step":5,"action":"...","timeframe":"...","tool":"...","details":"..."}
  ],
  "launchStrategy": {
    "recommendedPlatform": "Best platform to sell",
    "pricingStrategy": "Specific price recommendation with reasoning",
    "launchContent": ["Content idea 1","Content idea 2","Content idea 3"],
    "firstSaleIn": "Realistic timeframe to first sale"
  }
}`;
}

// ─── JSON PARSING ────────────────────────────────────────────

function sanitizeJsonString(s: string): string {
  let clean = s.replace(/```json|```/g, '').trim();
  const arrayStart = clean.indexOf('[');
  const objStart = clean.indexOf('{');
  let jsonStart = -1;
  if (arrayStart >= 0 && objStart >= 0) jsonStart = Math.min(arrayStart, objStart);
  else if (arrayStart >= 0) jsonStart = arrayStart;
  else if (objStart >= 0) jsonStart = objStart;
  if (jsonStart > 0) clean = clean.substring(jsonStart);

  const lastBracket = clean.lastIndexOf(']');
  const lastBrace = clean.lastIndexOf('}');
  const jsonEnd = Math.max(lastBracket, lastBrace);
  if (jsonEnd >= 0 && jsonEnd < clean.length - 1) clean = clean.substring(0, jsonEnd + 1);

  // Remove control characters
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  clean = clean.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n');

  let result = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (esc) { result += ch; esc = false; continue; }
    if (ch === '\\') { result += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; result += ch; continue; }
    if (inStr && ch === '\n') { result += '\\n'; continue; }
    if (inStr && ch === '\t') { result += '\\t'; continue; }
    result += ch;
  }
  result = result.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  return result;
}

function parseJsonResponse(text: string): any {
  const clean = sanitizeJsonString(text);
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.log("Initial parse failed, attempting repair...");
    if (clean.trimStart().startsWith('[')) {
      const lastCloseBrace = clean.lastIndexOf('}');
      if (lastCloseBrace > 0) {
        let candidate = clean.substring(0, lastCloseBrace + 1).replace(/,\s*$/, '') + ']';
        try {
          const items = JSON.parse(candidate);
          console.warn(`Recovered ${items.length} items from truncated array`);
          return items;
        } catch { /* fall through */ }
      }
    }
    if (clean.trimStart().startsWith('{')) {
      let repaired = clean;
      repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*"[^"]*":\s*\[?[^\]]*$/, '');
      repaired = repaired.replace(/,\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*$/, '');
      repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      let braces = 0, brackets = 0, inString = false, escape = false;
      for (const c of repaired) {
        if (escape) { escape = false; continue; }
        if (c === '\\') { escape = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (c === '{') braces++;
        if (c === '}') braces--;
        if (c === '[') brackets++;
        if (c === ']') brackets--;
      }
      if (inString) repaired += '"';
      while (brackets > 0) { repaired += ']'; brackets--; }
      while (braces > 0) { repaired += '}'; braces--; }
      try {
        return JSON.parse(repaired);
      } catch (e2) {
        const lastGoodBrace = repaired.lastIndexOf('}');
        if (lastGoodBrace > 0) {
          let aggressive = repaired.substring(0, lastGoodBrace + 1);
          aggressive = aggressive.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          let b2 = 0, k2 = 0, s2 = false, e3 = false;
          for (const c of aggressive) {
            if (e3) { e3 = false; continue; }
            if (c === '\\') { e3 = true; continue; }
            if (c === '"') { s2 = !s2; continue; }
            if (s2) continue;
            if (c === '{') b2++;
            if (c === '}') b2--;
            if (c === '[') k2++;
            if (c === ']') k2--;
          }
          while (k2 > 0) { aggressive += ']'; k2--; }
          while (b2 > 0) { aggressive += '}'; b2--; }
          return JSON.parse(aggressive);
        }
        throw e2;
      }
    }
    throw e;
  }
}

// ─── AI CALL ─────────────────────────────────────────────────

interface AIResult {
  content: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}

async function callLovableAI(prompt: string, model: string, maxTokens: number): Promise<AIResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 2000;
      console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
    });

    if (response.status === 429) { await response.text(); continue; }
    if (response.status === 402) { await response.text(); throw new Error("AI credits exhausted. Please add credits in your Lovable workspace settings."); }
    if (!response.ok) { const t = await response.text(); console.error("Lovable AI error:", response.status, t); throw new Error(`AI error: ${response.status}`); }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
    };
  }
  throw new Error("AI is busy right now. Please wait a moment and try again.");
}

// ─── Extract user info from auth header ──────────────────────

function extractUserFromAuth(authHeader: string | null): { userId: string | null; userEmail: string | null; userName: string | null } {
  if (!authHeader) return { userId: null, userEmail: null, userName: null };
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.sub || null,
      userEmail: payload.email || null,
      userName: payload.user_metadata?.full_name || payload.email?.split('@')[0] || null,
    };
  } catch {
    return { userId: null, userEmail: null, userName: null };
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get('authorization');
  const userInfo = extractUserFromAuth(authHeader);

  try {
    const body = await req.json();
    const { action } = body;

    let prompt: string;
    let model: string;
    let maxTokens: number;
    let callType: string;

    if (action === "generate-ideas") {
      const { niche, country, productType } = body;
      prompt = buildGenerateIdeasPrompt(niche, country, productType);
      model = "google/gemini-3-flash-preview";
      maxTokens = 24000;
      callType = "generate_30_ideas";
    } else if (action === "analyze-idea") {
      const { ideaText, country } = body;
      prompt = buildAnalyzeIdeaPrompt(ideaText, country);
      model = "google/gemini-3-flash-preview";
      maxTokens = 2000;
      callType = "idea_analysis";
    } else if (action === "generate-ideas-from-raw") {
      const { ideaText, analysis, chosenAngle, country } = body;
      prompt = buildRawIdeaIdeasPrompt(ideaText, analysis, chosenAngle, country);
      model = "google/gemini-3-flash-preview";
      maxTokens = 24000;
      callType = "generate_ideas_from_raw";
    } else if (action === "generate-more") {
      const { niche, country, productType, existingNames, moreCount, direction, rawIdea } = body;
      const directionInstructions: Record<string, string> = {
        'different-angle': 'Explore completely different sub-niches, audiences, and angles within this niche. Think laterally.',
        'more-specific': 'Go deeper and more specific within the same niche. Narrower audience, more targeted pain points.',
        'easier-to-build': 'Focus on products that can be created in 1-3 days maximum. Simple formats, low complexity.',
        'higher-ticket': 'Focus exclusively on premium products priced at the top end of the market.',
        'impulse-buy': 'Focus on products with high impulse purchase scores. The buyer sees it and wants it immediately.',
        'trending-now': 'Focus on products tied to current trends, viral topics, and rising demand in this market right now.'
      };
      const dirInstruction = directionInstructions[direction] || directionInstructions['different-angle'];
      const rawContext = rawIdea ? `\nORIGINAL RAW IDEA: "${rawIdea}"\nAll new ideas must stay relevant to this original concept.\n` : '';
      prompt = `You are an expert digital product researcher.

Generate exactly ${moreCount} NEW digital product ideas. These must be COMPLETELY DIFFERENT from the ideas already generated.

RESEARCH CONTEXT:
- Niche: ${niche}
- Country: ${country}
- Product Type: ${productType}
- Direction Focus: ${dirInstruction}
${rawContext}
ALREADY GENERATED — DO NOT REPEAT THESE:
${(existingNames || []).map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}

STRICT RULES:
1. None of your ${moreCount} ideas can be similar to ANY idea in the list above
2. Apply the direction focus strictly: ${dirInstruction}
3. All ideas must be specific to ${country} market context
4. Vary demand scores, build times, and impulse scores realistically
5. Every idea must feel genuinely fresh compared to what was already generated

For EACH idea return the EXACT same JSON structure:
{"productName":"...","tagline":"...","targetAudience":"...","priceRange":"...","buildTime":"...","marketSize":"...","demandScore":7,"competitionLevel":"Medium","impulseScore":"High","primaryPain":"...","searchKeyword":"..."}

Return ONLY a valid JSON array of exactly ${moreCount} objects. No preamble. No markdown.`;
      model = "google/gemini-3-flash-preview";
      maxTokens = Math.max(4000, Math.ceil(moreCount * 800));
      callType = "generate_more_ideas";
    } else if (action === "deep-research") {
      const { product, inputData } = body;
      prompt = buildDeepResearchPrompt(product, inputData);
      model = "google/gemini-2.5-flash";
      maxTokens = 16000;
      callType = "deep_research_report";
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI Product Research: action=${action}, model=${model}`);

    const aiResult = await callLovableAI(prompt, model, maxTokens);

    // Log usage (fire-and-forget)
    logAiUsage(supabaseAdmin, userInfo.userId, userInfo.userEmail, userInfo.userName, 'product_navigator', callType, model, aiResult.usage);

    try {
      const parsed = parseJsonResponse(aiResult.content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", aiResult.content.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: aiResult.content.substring(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Edge function error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabaseAdmin.from('error_logs').insert({
      error_type: 'edge_function_error', severity: 'error',
      message, stack_trace: err instanceof Error ? err.stack : undefined,
      module: 'product_navigator', additional_data: { function: 'ai-product-research' },
    }).catch(() => {});
    const status = message.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
