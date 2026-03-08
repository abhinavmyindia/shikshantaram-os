import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    "bestTimeToLaunch": "e.g. 'January–March'"
  },
  "painPoints": [
    {"rank":1,"title":"Pain point title","description":"2-3 sentence description","emotionalWeight":"High/Medium/Low","trigger":"What triggers this pain"},
    {"rank":2,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."},
    {"rank":3,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."},
    {"rank":4,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."},
    {"rank":5,"title":"...","description":"...","emotionalWeight":"...","trigger":"..."}
  ],
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
    "transformationStatement": "Before → After",
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

function parseJsonResponse(text: string): any {
  let clean = text.replace(/```json|```/g, '').trim();

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

  // Fix common issues
  clean = clean
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : '');

  try {
    return JSON.parse(clean);
  } catch (e) {
    // Truncated JSON - try to repair by closing open braces/brackets
    console.log("Initial parse failed, attempting repair...");
    let repaired = clean;
    
    // Remove any trailing incomplete string value (e.g. `"key": "incomplete...`)
    repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
    repaired = repaired.replace(/,\s*"[^"]*$/, '');
    repaired = repaired.replace(/,\s*$/, '');
    
    // Count and close unbalanced braces/brackets
    let braces = 0, brackets = 0;
    let inString = false, escape = false;
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
    
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }
    
    console.log("Repaired JSON, attempting parse...");
    return JSON.parse(repaired);
  }
}

async function callLovableAI(prompt: string, model: string, maxTokens: number): Promise<string> {
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
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      }),
    });

    if (response.status === 429) {
      await response.text();
      console.log("Rate limited by Lovable AI Gateway");
      continue;
    }

    if (response.status === 402) {
      await response.text();
      throw new Error("AI credits exhausted. Please add credits in your Lovable workspace settings.");
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Lovable AI error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error("AI is busy right now. Please wait a moment and try again.");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, niche, country, productType, product, inputData } = await req.json();

    let prompt: string;
    let model: string;
    let maxTokens: number;

    if (action === "generate-ideas") {
      prompt = buildGenerateIdeasPrompt(niche, country, productType);
      model = "google/gemini-3-flash-preview"; // Fastest model for quick generation
      maxTokens = 16000;
    } else if (action === "deep-research") {
      prompt = buildDeepResearchPrompt(product, inputData);
      model = "google/gemini-2.5-flash"; // Balanced speed + quality for deep research
      maxTokens = 8000;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI Product Research: action=${action}, model=${model}, niche=${niche || inputData?.niche}`);

    const rawText = await callLovableAI(prompt, model, maxTokens);

    try {
      const parsed = parseJsonResponse(rawText);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", rawText.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: rawText.substring(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Edge function error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
