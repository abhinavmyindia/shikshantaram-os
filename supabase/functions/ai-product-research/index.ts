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
    "beforeHeadline": "A short punchy headline capturing the before state (e.g. 'Stuck, Invisible, and Running Out of Time')",
    "beforeParagraph": "A rich, vivid 3-4 sentence narrative describing the buyer's current reality. Write in second person ('You wake up every morning...'). Capture the emotion, the frustration, the specific daily struggle. Make it feel so real that the buyer thinks 'this is literally me.' Reference the specific country context of ${inputData.country}.",
    "beforeMoments": [
      "A specific micro-moment that captures the before state (e.g. 'Refreshing your bank app at 11pm, watching the balance not move')",
      "Second micro-moment — a different angle of the same pain",
      "Third micro-moment — the emotional low point"
    ],
    "afterHeadline": "A short punchy headline capturing the after state (e.g. 'Confident, In Demand, and Finally Earning What You Deserve')",
    "afterParagraph": "A rich, vivid 3-4 sentence narrative describing the buyer's life AFTER they've used this product. Same second person voice. Capture the new identity, the specific results, the emotional relief and pride. Paint the exact life they've been wanting. Keep it realistic and believable, not fantasy.",
    "afterMoments": [
      "A specific micro-moment of the after state (e.g. 'Seeing a new client inquiry notification while having your morning chai')",
      "Second after micro-moment — a different dimension of success",
      "Third after micro-moment — the emotional high point"
    ],
    "transformationBridge": "ONE powerful sentence that captures the complete journey. Format: 'From [specific before] to [specific after] — without [common objection/fear].'",
    "timeToTransformation": "Realistic timeframe e.g. '30 days', '90 days'",
    "identityShift": "The new identity label e.g. 'from job-seeker to in-demand freelancer'"
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

function sanitizeJsonString(s: string): string {
  // Remove markdown fences
  let clean = s.replace(/```json|```/g, '').trim();

  // Find JSON start
  const arrayStart = clean.indexOf('[');
  const objStart = clean.indexOf('{');
  let jsonStart = -1;
  if (arrayStart >= 0 && objStart >= 0) jsonStart = Math.min(arrayStart, objStart);
  else if (arrayStart >= 0) jsonStart = arrayStart;
  else if (objStart >= 0) jsonStart = objStart;
  if (jsonStart > 0) clean = clean.substring(jsonStart);

  // Find JSON end
  const lastBracket = clean.lastIndexOf(']');
  const lastBrace = clean.lastIndexOf('}');
  const jsonEnd = Math.max(lastBracket, lastBrace);
  if (jsonEnd >= 0 && jsonEnd < clean.length - 1) clean = clean.substring(0, jsonEnd + 1);

  // Replace control characters inside strings with spaces (preserve \n \r \t)
  // Process character by character to handle control chars inside JSON strings
  let result = '';
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code < 32 && code !== 10 && code !== 13 && code !== 9) {
      result += ' ';
    } else if (code === 127) {
      result += ' ';
    } else {
      result += clean[i];
    }
  }

  // Fix trailing commas
  result = result.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  return result;
}

function parseJsonResponse(text: string): any {
  const clean = sanitizeJsonString(text);

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.log("Initial parse failed, attempting repair...");
    
    // For truncated arrays: find last complete object and close the array
    if (clean.trimStart().startsWith('[')) {
      const lastCloseBrace = clean.lastIndexOf('}');
      if (lastCloseBrace > 0) {
        let candidate = clean.substring(0, lastCloseBrace + 1);
        // Remove any trailing comma after the last complete object
        candidate = candidate.replace(/,\s*$/, '');
        candidate = candidate + ']';
        try {
          const items = JSON.parse(candidate);
          console.warn(`Recovered ${items.length} items from truncated array`);
          return items;
        } catch { /* fall through */ }
      }
    }

    // For truncated objects
    if (clean.trimStart().startsWith('{')) {
      let repaired = clean;
      // Remove trailing incomplete key-value
      repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*"[^"]*":\s*\[?[^\]]*$/, '');
      repaired = repaired.replace(/,\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*$/, '');
      repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      
      // Count and close unbalanced braces/brackets
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
        // Aggressive: truncate to last complete brace
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
    const body = await req.json();
    const { action } = body;

    let prompt: string;
    let model: string;
    let maxTokens: number;

    if (action === "generate-ideas") {
      const { niche, country, productType } = body;
      prompt = buildGenerateIdeasPrompt(niche, country, productType);
      model = "google/gemini-3-flash-preview";
      maxTokens = 24000;
    } else if (action === "analyze-idea") {
      const { ideaText, country } = body;
      prompt = buildAnalyzeIdeaPrompt(ideaText, country);
      model = "google/gemini-3-flash-preview"; // Fast model for analysis
      maxTokens = 2000;
    } else if (action === "generate-ideas-from-raw") {
      const { ideaText, analysis, chosenAngle, country } = body;
      prompt = buildRawIdeaIdeasPrompt(ideaText, analysis, chosenAngle, country);
      model = "google/gemini-3-flash-preview";
      maxTokens = 24000;
    } else if (action === "deep-research") {
      const { product, inputData } = body;
      prompt = buildDeepResearchPrompt(product, inputData);
      model = "google/gemini-2.5-flash";
      maxTokens = 8000;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI Product Research: action=${action}, model=${model}`);

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
