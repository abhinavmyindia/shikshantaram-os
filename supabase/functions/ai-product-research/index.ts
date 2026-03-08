import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, niche, country, productType, product, inputData } = await req.json();

    let prompt = "";
    let maxTokens = 8000;

    if (action === "generate-ideas") {
      prompt = `You are an expert digital product researcher and market analyst.

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

Use your web search capability to find current trends, trending topics, and market opportunities in ${country} for ${niche} before generating ideas.

Return ONLY a valid JSON array of exactly 30 objects. No preamble, no markdown, no explanation.
Format: [{"productName":"...","tagline":"...","targetAudience":"...","priceRange":"...","buildTime":"...","marketSize":"...","demandScore":8,"competitionLevel":"Low","impulseScore":"High","primaryPain":"...","searchKeyword":"..."},...]`;
    } else if (action === "deep-research") {
      maxTokens = 6000;
      prompt = `You are a world-class product researcher, market analyst, and consumer psychologist.

Generate a COMPREHENSIVE research report for this digital product:

PRODUCT: ${product.productName}
NICHE: ${inputData.niche}
FORMAT: ${inputData.productType}
TARGET COUNTRY: ${inputData.country}
TAGLINE: ${product.tagline}
PRIMARY PAIN: ${product.primaryPain}
SEARCH KEYWORD: ${product.searchKeyword}

Use your web search capability to:
1. Search for "${product.searchKeyword} ${inputData.country}" to find real demand data
2. Search for existing products/solutions in this space
3. Find real competitor examples and pricing
4. Look for Reddit/Quora/social media discussions about this pain point
5. Find any available market size data

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
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI Product Research: action=${action}, niche=${niche || inputData?.niche}`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `AI API error: ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Anthropic response stop_reason:", data.stop_reason);

    // Extract text content from response
    const textContent = data.content
      ?.filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('') || '';

    // Parse JSON — strip any markdown fences and extract JSON portion
    let clean = textContent.replace(/```json|```/g, '').trim();
    
    // Find the first [ or { to skip any preamble text
    const arrayStart = clean.indexOf('[');
    const objStart = clean.indexOf('{');
    let jsonStart = -1;
    if (arrayStart >= 0 && objStart >= 0) jsonStart = Math.min(arrayStart, objStart);
    else if (arrayStart >= 0) jsonStart = arrayStart;
    else if (objStart >= 0) jsonStart = objStart;
    
    if (jsonStart > 0) {
      clean = clean.substring(jsonStart);
    }
    
    // Also trim any trailing text after the last ] or }
    const lastBracket = clean.lastIndexOf(']');
    const lastBrace = clean.lastIndexOf('}');
    const jsonEnd = Math.max(lastBracket, lastBrace);
    if (jsonEnd >= 0 && jsonEnd < clean.length - 1) {
      clean = clean.substring(0, jsonEnd + 1);
    }
    
    try {
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw text:", clean.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: clean.substring(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
