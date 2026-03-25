import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAIKey, callWithBYOK, logByokUsage } from '../_shared/byok.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── DIVERSITY SYSTEM ────────────────────────────────────────
// 5 layers of controlled randomness so identical niche searches
// produce genuinely unique ideas for every user.

const AUDIENCE_SEGMENTS = [
  'complete beginners who have never tried this before and feel overwhelmed',
  'people who tried and failed once and are ready to try again with a smarter approach',
  'mid-level practitioners stuck at a plateau who need the next breakthrough',
  'advanced users who want to systematize and scale what they already know',
  'busy professionals with limited time (under 30 min/day) who need fast wins',
  'people in tier-2 and tier-3 Indian cities with limited access to mentors or networks',
  'women who face unique social barriers and need culturally-aware solutions',
  'young Indians aged 18-25 who are digitally native but financially inexperienced',
];

const PAIN_ANCHORS = [
  'information overload — too much advice, no clear starting point',
  "inconsistent results — things work sometimes but they can't figure out why",
  'fear of judgment, failure, or looking stupid in front of peers or family',
  'lack of accountability and community — doing everything alone with no support',
  "wasting money on things that don't work and not trusting new solutions",
  'knowing what to do but completely failing at execution and follow-through',
  'not being taken seriously by others because they lack credentials or proof',
  "imposter syndrome — feeling like they don't deserve success or aren't ready",
];

const DELIVERY_FORMATS = [
  'done-for-you templates, swipe files, and copy-paste systems (zero thinking required)',
  'step-by-step 7-day or 30-day challenge with daily micro-actions',
  'toolkit or resource vault with 10+ plug-and-play components',
  'community + accountability group with live weekly check-ins',
  'video mini-course under 2 hours that delivers one transformative skill',
  'AI-powered tool or calculator that gives personalised output instantly',
  'WhatsApp or Telegram-based drip programme delivered over 21 days',
  'physical or printable workbook with fill-in-the-blank exercises',
];

const CREATIVE_CONSTRAINTS = [
  'At least 6 ideas must be executable by a solo creator in under 2 weeks with no team.',
  'At least 5 ideas must use WhatsApp, Telegram, or Instagram DMs as the primary delivery channel.',
  'At least 4 ideas must target a painful transition moment (new job, new city, new relationship, new baby, layoff).',
  'At least 5 ideas must be priced under Rs.999 to capture impulse buyers first.',
  'At least 4 ideas must solve a problem that causes embarrassment or social shame.',
  'At least 5 ideas must leverage a current 2025 trend (AI tools, short-form video, remote work, gig economy).',
  'At least 4 ideas must be hyper-local — targeting a specific Indian state, city type, or cultural context.',
  'At least 5 ideas must have a visible, measurable outcome the buyer can show others within 30 days.',
];

const MARKET_TIMING_SIGNALS = [
  'Post-layoff anxiety and job market uncertainty in India is at peak levels right now.',
  'AI tool adoption among Indian professionals has exploded — people want to adapt or be left behind.',
  "Side hustle culture is mainstream — everyone wants a second income stream but most don't know where to start.",
  'Vernacular content is booming — Hindi, Tamil, Telugu audiences are underserved by English-only products.',
  'Mental health awareness has gone mainstream — emotional and psychological products now have mass appeal.',
  'Short-form video has made micro-celebrity possible for anyone — personal brand products are in high demand.',
];

const EXPERT_PERSONAS = [
  'You are Rahul, a 34-year-old Mumbai-based digital entrepreneur who built a Rs.2 crore/year info-product business from a 1BHK in Andheri. You think in terms of mass market appeal, WhatsApp virality, and products that solve problems middle-class India is too embarrassed to Google. You always ask: "Would a bank employee in Pune buy this at 11pm after seeing a Reel?" Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Priya, a 29-year-old Bangalore product strategist who left a Flipkart PM role to build digital products for working women. You identify underserved female buyer segments and products that address the unique pressures Indian women face — career, family expectations, financial independence, and social judgment. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Vikram, a 41-year-old Chennai-based educator-turned-entrepreneur who built 6 online courses across engineering, upskilling, and career switching. You think in frameworks, systems, and structured learning. Your products always have a clear before/after transformation and measurable milestones. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Meera, a 32-year-old Delhi-based growth consultant who specialises in finding "blue ocean" product opportunities — gaps that everyone overlooks because they seem too niche or too weird. You love contrarian ideas that go against conventional wisdom and typically capture buyers who are fed up with mainstream solutions. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Arjun, a 27-year-old Pune-based Gen-Z founder who understands digital natives, meme culture, and the psychology of Indian 20-somethings navigating career pressure, relationship confusion, and identity crises. You create products that are brutally honest, relatable, and unapologetically Indian. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Sunita, a 38-year-old Jaipur-based entrepreneur who builds products specifically for tier-2 and tier-3 India — people with high ambitions, limited English proficiency, and zero access to the Bangalore startup ecosystem. You understand the real India, not the India tech bros imagine. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Karan, a 35-year-old Hyderabad-based performance marketer who has sold over 10,000 digital products across 15 niches. You think entirely in buyer psychology — what triggers shame, fear, desire, and urgency. Every product idea you generate has a crystal clear emotional hook and an obvious impulse trigger. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Deepa, a 43-year-old Mumbai-based veteran of the Indian self-improvement industry who has seen every trend come and go. You identify ideas with long-term evergreen demand — products people will still need in 5 years — and you always spot the exact sub-audience that is underserved within a popular niche. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
];

const ADJACENT_NICHES: Record<string, string[]> = {
  'freelancing': ['personal branding', 'B2B sales', 'productivity systems'],
  'entrepreneurship': ['personal finance', 'leadership', 'sales psychology'],
  'digital marketing': ['copywriting', 'personal branding', 'ecommerce'],
  'sales': ['communication skills', 'negotiation', 'psychology'],
  'leadership': ['team management', 'communication', 'executive presence'],
  'career growth': ['personal branding', 'communication skills', 'negotiation'],
  'job search': ['resume writing', 'networking', 'interview skills'],
  'productivity': ['time management', 'mental health', 'deep work'],
  'ecommerce': ['supply chain', 'digital marketing', 'customer psychology'],
  'investing': ['personal finance', 'risk management', 'business analysis'],
  'stock market': ['personal finance', 'trading psychology', 'financial planning'],
  'real estate': ['personal finance', 'negotiation', 'investing'],
  'content creation': ['personal branding', 'digital marketing', 'storytelling'],
  'youtube': ['storytelling', 'personal branding', 'digital marketing'],
  'instagram': ['personal branding', 'visual design', 'content creation'],
  'copywriting': ['psychology', 'sales', 'storytelling'],
  'public speaking': ['confidence building', 'communication', 'leadership'],
  'coaching': ['psychology', 'communication', 'personal development'],
  'consulting': ['B2B sales', 'positioning', 'thought leadership'],
  'personal finance': ['psychology', 'behaviour change', 'investing'],
  'fitness': ['nutrition', 'mental health', 'habit formation'],
  'weight loss': ['nutrition', 'psychology', 'habit formation'],
  'nutrition': ['fitness', 'mental health', 'wellness'],
  'mental health': ['mindfulness', 'relationships', 'productivity'],
  'mindfulness': ['mental health', 'spirituality', 'stress management'],
  'relationships': ['communication', 'psychology', 'personal development'],
  'dating': ['confidence building', 'communication', 'psychology'],
  'marriage': ['relationships', 'communication', 'personal finance'],
  'parenting': ['education', 'child psychology', 'relationships'],
  'spirituality': ['mindfulness', 'mental health', 'personal development'],
  'confidence': ['public speaking', 'communication', 'mental health'],
  'habits': ['productivity', 'psychology', 'personal development'],
  'sleep': ['mental health', 'fitness', 'productivity'],
  'english speaking': ['communication skills', 'career growth', 'public speaking'],
  'communication': ['public speaking', 'relationships', 'career growth'],
  'writing': ['storytelling', 'content creation', 'copywriting'],
  'design': ['content creation', 'branding', 'ecommerce'],
  'coding': ['freelancing', 'career growth', 'productivity'],
  'data science': ['career growth', 'investing', 'entrepreneurship'],
  'ai tools': ['productivity', 'freelancing', 'digital marketing'],
  'photography': ['content creation', 'personal branding', 'ecommerce'],
  'music': ['content creation', 'personal branding', 'teaching'],
  'teaching': ['communication', 'coaching', 'content creation'],
  'travel': ['personal finance', 'content creation', 'freelancing'],
  'food': ['ecommerce', 'content creation', 'entrepreneurship'],
  'fashion': ['personal branding', 'ecommerce', 'content creation'],
  'home decor': ['ecommerce', 'design', 'entrepreneurship'],
  'pet care': ['wellness', 'ecommerce', 'content creation'],
  'weddings': ['personal finance', 'relationships', 'ecommerce'],
  'pregnancy': ['parenting', 'health', 'mental health'],
  'women empowerment': ['confidence', 'career growth', 'personal finance'],
};

const pick = <T,>(arr: T[], n = 1): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const pickOne = <T,>(arr: T[]): T => pick(arr, 1)[0];

const getAdjacentNiches = (niche: string): string[] => {
  const normalised = niche.toLowerCase().trim();
  if (ADJACENT_NICHES[normalised]) return pick(ADJACENT_NICHES[normalised], 2);
  const partialMatch = Object.keys(ADJACENT_NICHES).find(
    key => normalised.includes(key) || key.includes(normalised)
  );
  if (partialMatch) return pick(ADJACENT_NICHES[partialMatch], 2);
  return pick(['psychology', 'personal development', 'productivity', 'digital marketing', 'communication'], 2);
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

function buildGenerateIdeasPrompt(niche: string, country: string, productType: string): { prompt: string; system: string; diversity: any } {
  // Layer 2: Semantic diversity anchors
  const audienceAngle = pickOne(AUDIENCE_SEGMENTS);
  const painAnchor = pickOne(PAIN_ANCHORS);
  const deliveryFormat = pickOne(DELIVERY_FORMATS);

  // Layer 3: Creative constraint seed
  const creativeConstraint = pickOne(CREATIVE_CONSTRAINTS);
  const timingSignal = pickOne(MARKET_TIMING_SIGNALS);

  // Layer 4: Expert persona
  const persona = pickOne(EXPERT_PERSONAS);

  // Layer 5: Cross-niche pollination
  const adjacentNiches = getAdjacentNiches(niche);
  const crossNicheLine = `You MUST include at least 3 ideas that borrow proven frameworks from these adjacent markets and apply them to ${niche}: ${adjacentNiches.join(' and ')}. These cross-pollinated ideas are often the most innovative and least saturated.`;

  const prompt = `Generate exactly 30 unique digital product ideas for the following:

Niche: ${niche}
Target Country/Market: ${country}
Product Type: ${productType}

--- YOUR MANDATORY FOCUS FOR THIS BATCH ---
Target Audience Angle: Focus specifically on ${audienceAngle}
Core Pain to Address: Centre your ideas around the pain of ${painAnchor}
Preferred Delivery Format: Bias toward products structured as ${deliveryFormat}

--- MARKET CONTEXT ---
${timingSignal}

--- CREATIVE CONSTRAINTS (MANDATORY) ---
${creativeConstraint}
${crossNicheLine}

--- ORIGINALITY REQUIREMENT ---
These 30 ideas must be DISTINCTLY different from the obvious, saturated, and generic products already flooding this niche.
Avoid the top-10 most common ideas that anyone would think of immediately.
Push deeper — target overlooked sub-segments, underserved pain points, unconventional formats.

Return ONLY a JSON array of exactly 30 objects. Each object must have:
{
  "productName": "specific, compelling product name — not generic",
  "tagline": "one punchy benefit-driven line under 12 words",
  "primaryPain": "the exact pain this solves in 8 words max",
  "targetAudience": "specific buyer avatar in 10 words",
  "demandScore": <number 1-10>,
  "competitionLevel": "Low" | "Medium" | "High",
  "buildTime": "X-Y weeks" or "X-Y days",
  "impulseScore": "High" | "Medium" | "Low",
  "priceRange": "local currency price range",
  "searchKeyword": "most likely search term buyer types",
  "marketSize": "Massive" | "Large" | "Medium" | "Niche",
  "whyUnique": "one sentence — what makes this idea different from the obvious alternatives"
}

Make each product highly specific to ${country} market realities and ${niche} niche.
Vary demand scores, competition levels, and impulse scores realistically.
Mix quick wins (high impulse, low competition) with premium plays.`;

  return {
    prompt,
    system: persona,
    diversity: {
      audienceAngle,
      painAnchor,
      deliveryFormat,
      adjacentNiches,
      persona: persona.split(',')[0].replace('You are ', ''),
    },
  };
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
      // Find all complete objects in the array by matching balanced braces
      const items: any[] = [];
      let depth = 0, start = -1, inStr = false, esc = false;
      for (let i = 0; i < clean.length; i++) {
        const c = clean[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{') { if (depth === 0) start = i; depth++; }
        if (c === '}') { depth--; if (depth === 0 && start >= 0) {
          try { items.push(JSON.parse(clean.substring(start, i + 1))); } catch {}
          start = -1;
        }}
      }
      if (items.length > 0) {
        console.warn(`Recovered ${items.length} complete items from truncated array`);
        return items;
      }
    }
    if (clean.trimStart().startsWith('{')) {
      // Strategy: find the last complete key-value pair, then close all open braces/brackets
      // Step 1: Try progressively shorter substrings ending at each '}' or ']'
      const closingPositions: number[] = [];
      let inStr2 = false, esc2 = false;
      for (let i = 0; i < clean.length; i++) {
        const c = clean[i];
        if (esc2) { esc2 = false; continue; }
        if (c === '\\') { esc2 = true; continue; }
        if (c === '"') { inStr2 = !inStr2; continue; }
        if (inStr2) continue;
        if (c === '}' || c === ']') closingPositions.push(i);
      }

      // Try from the end, finding the longest valid-parseable prefix
      for (let idx = closingPositions.length - 1; idx >= 0; idx--) {
        let candidate = clean.substring(0, closingPositions[idx] + 1);
        // Remove trailing commas before closing braces/brackets
        candidate = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        // Count unclosed braces/brackets
        let b = 0, k = 0, s = false, es = false;
        for (const c of candidate) {
          if (es) { es = false; continue; }
          if (c === '\\') { es = true; continue; }
          if (c === '"') { s = !s; continue; }
          if (s) continue;
          if (c === '{') b++; if (c === '}') b--;
          if (c === '[') k++; if (c === ']') k--;
        }
        if (s) candidate += '"';
        while (k > 0) { candidate += ']'; k--; }
        while (b > 0) { candidate += '}'; b--; }
        try {
          const result = JSON.parse(candidate);
          console.warn(`Recovered truncated object (used ${closingPositions[idx] + 1}/${clean.length} chars)`);
          return result;
        } catch { continue; }
      }
    }
    throw e;
  }
}

function buildFallbackDeepResearchReport(product: any, inputData: any, warning: string) {
  return {
    marketOverview: {
      totalAddressableMarket: 'Temporarily unavailable',
      growthRate: 'Temporarily unavailable',
      primaryAudience: product?.targetAudience || 'Audience data unavailable',
      audienceSize: 'Temporarily unavailable',
      buyingPower: 'Temporarily unavailable',
      platformsTheyUseToFind: ['Google', 'YouTube', 'Instagram'],
    },
    searchDemand: {
      primaryKeyword: product?.searchKeyword || product?.productName || 'keyword unavailable',
      estimatedMonthlySearches: 'Temporarily unavailable',
      relatedKeywords: [inputData?.niche || 'niche keyword'],
      trendDirection: 'Stable',
      trendNote: 'We could not fully parse the AI response this time. Please regenerate once for a complete report.',
      bestTimeToLaunch: 'Any time',
    },
    painPoints: [
      {
        rank: 1,
        title: product?.primaryPain || 'Core pain point',
        description: 'Detailed pain analysis is temporarily unavailable due to a response formatting issue.',
        emotionalWeight: 'High',
        trigger: 'Needs fresh regeneration',
      },
    ],
    transformation: {
      beforeHeadline: 'Current struggle',
      beforeParagraph: 'The full before-state narrative is temporarily unavailable.',
      beforeMoments: ['Data unavailable'],
      afterHeadline: 'Desired outcome',
      afterParagraph: 'The full after-state narrative is temporarily unavailable.',
      afterMoments: ['Data unavailable'],
      transformationBridge: 'From current pain to desired outcome with a clear system.',
      timeToTransformation: 'To be validated',
      identityShift: 'Emerging performer',
    },
    deepestDesires: [
      {
        desire: 'Solve the core problem effectively',
        underlyingBelief: 'A clear plan can create results',
        emotionalDriver: 'Relief',
      },
    ],
    empathyMap: {
      thinks: ['Needs clarity'],
      feels: ['Overwhelmed'],
      sees: ['Competing advice'],
      hears: ['Mixed guidance'],
      says: ['I need a simple path'],
      does: ['Searches for solutions'],
    },
    primarySolution: {
      howProductSolvesIt: 'Regenerate this report to get the complete solution breakdown.',
      uniqueMechanism: product?.productName || 'Core mechanism pending',
      quickWin: 'Initial clarity on the next action',
      transformationStatement: 'From confusion to clarity',
      priceJustification: 'Based on outcome speed and certainty',
    },
    impulsePurchaseAnalysis: {
      score: product?.impulseScore || 'Medium',
      rating: 5,
      whyTheyBuyNow: 'Urgency exists but detailed trigger mapping is unavailable in this fallback.',
      purchaseTriggers: ['Urgent pain'],
      objections: ['Need more confidence'],
      objectionHandlers: ['Provide proof and step-by-step guidance'],
    },
    competitorLandscape: {
      directCompetitors: [],
      marketGap: 'Competitor extraction failed in this run. Regenerate to populate.',
      differentiationOpportunity: product?.tagline || 'Position around a specific transformation promise.',
    },
    nextSteps: [
      {
        step: 1,
        action: 'Regenerate deep research report',
        timeframe: 'Now',
        tool: 'Product Navigator',
        details: warning,
      },
    ],
    launchStrategy: {
      recommendedPlatform: 'To be validated',
      pricingStrategy: 'To be validated',
      launchContent: ['Regenerate for full content plan'],
      firstSaleIn: 'To be validated',
    },
  };
}

// ─── AI CALL ─────────────────────────────────────────────────

interface AIResult {
  content: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  finishReason: string | null;
}

async function callLovableAI(prompt: string, model: string, maxTokens: number, opts?: { system?: string; temperature?: number }): Promise<AIResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 2000;
      console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }

    const messages: any[] = [];
    if (opts?.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: prompt });

    const reqBody: any = { model, messages, max_tokens: maxTokens };
    if (opts?.temperature !== undefined) reqBody.temperature = opts.temperature;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (response.status === 429) { await response.text(); continue; }
    if (response.status === 402) { await response.text(); throw new Error("AI credits exhausted. Please add credits in your Lovable workspace settings."); }
    if (!response.ok) { const t = await response.text(); console.error("Lovable AI error:", response.status, t); throw new Error(`AI error: ${response.status}`); }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
      finishReason: data.choices?.[0]?.finish_reason || null,
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

    // BYOK: resolve user's preferred key
    const byokUserId = body.userId || userInfo.userId;
    const byok = byokUserId ? await resolveAIKey(byokUserId) : { useByok: false as const };

    let prompt: string;
    let systemPrompt: string | undefined;
    let temperature: number | undefined;
    let model: string;
    let maxTokens: number;
    let callType: string;
    let deepResearchContext: { product: any; inputData: any } | null = null;
    let diversityMeta: any = null;

    if (action === "generate-ideas") {
      const { niche, country, productType } = body;
      const built = buildGenerateIdeasPrompt(niche, country, productType);
      prompt = built.prompt;
      systemPrompt = built.system;
      temperature = 1.0; // Layer 1: force away from default safe answers
      diversityMeta = built.diversity;
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

      // Apply diversity layers to generate-more as well
      const audienceAngle = pickOne(AUDIENCE_SEGMENTS);
      const painAnchor = pickOne(PAIN_ANCHORS);
      const adjacentNiches = getAdjacentNiches(niche);
      systemPrompt = pickOne(EXPERT_PERSONAS);
      temperature = 1.0;

      prompt = `Generate exactly ${moreCount} NEW digital product ideas. These must be COMPLETELY DIFFERENT from the ideas already generated.

RESEARCH CONTEXT:
- Niche: ${niche}
- Country: ${country}
- Product Type: ${productType}
- Direction Focus: ${dirInstruction}
${rawContext}
--- DIVERSITY FOCUS FOR THIS BATCH ---
Target Audience: Focus on ${audienceAngle}
Pain Anchor: Centre around ${painAnchor}
Cross-niche inspiration: Borrow frameworks from ${adjacentNiches.join(' and ')}

ALREADY GENERATED — DO NOT REPEAT THESE:
${(existingNames || []).map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}

STRICT RULES:
1. None of your ${moreCount} ideas can be similar to ANY idea in the list above
2. Apply the direction focus strictly: ${dirInstruction}
3. All ideas must be specific to ${country} market context
4. Vary demand scores, build times, and impulse scores realistically
5. Every idea must feel genuinely fresh compared to what was already generated

For EACH idea return the EXACT same JSON structure:
{"productName":"...","tagline":"...","targetAudience":"...","priceRange":"...","buildTime":"...","marketSize":"...","demandScore":7,"competitionLevel":"Medium","impulseScore":"High","primaryPain":"...","searchKeyword":"...","whyUnique":"..."}

Return ONLY a valid JSON array of exactly ${moreCount} objects. No preamble. No markdown.`;
      model = "google/gemini-3-flash-preview";
      maxTokens = Math.max(4000, Math.ceil(moreCount * 800));
      callType = "generate_more_ideas";
    } else if (action === "deep-research") {
      const { product, inputData } = body;
      deepResearchContext = { product, inputData };
      prompt = buildDeepResearchPrompt(product, inputData);
      model = "google/gemini-2.5-flash";
      maxTokens = 30000;
      callType = "deep_research_report";
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI Product Research: action=${action}, model=${model}, byok=${byok.useByok}`);

    // ─── BYOK PATH ───────────────────────────────────────────────────────────
    if (byok.useByok) {
      try {
        const byokResult = await callWithBYOK({
          provider: byok.provider as any,
          apiKey: byok.apiKey,
          model: byok.model,
          userMessage: prompt,
          maxTokens,
        });

        await logByokUsage(
          byokUserId!, body.userEmail || userInfo.userEmail,
          byok.provider, byok.model,
          'product_navigator', callType,
          byokResult.inputTokens, byokResult.outputTokens, true
        );

        try {
          const parsed = parseJsonResponse(byokResult.text);
          return new Response(JSON.stringify({ result: parsed, byok: true, provider: byok.provider }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          // BYOK parse failed — fall through to platform
          console.warn('BYOK parse failed, falling back to platform key');
        }
      } catch (byokErr) {
        // BYOK call failed — fall through to platform
        console.warn('BYOK call failed, falling back to platform key:', byokErr);
      }
    }

    // ─── PLATFORM PATH (unchanged) ───────────────────────────────────────────
    let aiResult = await callLovableAI(prompt, model, maxTokens, { system: systemPrompt, temperature });

    // If ANY action was truncated, retry with conciseness instruction
    if (aiResult.finishReason === 'length') {
      console.warn(`${action} truncated (finish_reason=length), retrying with conciseness prompt...`);
      const concisePrompt = prompt + '\n\nCRITICAL: Your previous response was TRUNCATED because it was too long. Keep ALL text values SHORT and concise (1 sentence max per field). Use abbreviated descriptions. Prioritize completing the ENTIRE JSON structure over verbose descriptions. Return COMPLETE, VALID JSON.';
      aiResult = await callLovableAI(concisePrompt, model, Math.min(maxTokens + 4000, 32000));
      logAiUsage(supabaseAdmin, userInfo.userId, userInfo.userEmail, userInfo.userName, 'product_navigator', callType + '_retry', model, aiResult.usage);
    }

    // Log usage (fire-and-forget)
    logAiUsage(supabaseAdmin, userInfo.userId, userInfo.userEmail, userInfo.userName, 'product_navigator', callType, model, aiResult.usage);

    try {
      const parsed = parseJsonResponse(aiResult.content);
      return new Response(JSON.stringify({ result: parsed, byok: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseErr: any) {
      console.error("JSON parse error:", parseErr, "Raw:", aiResult.content.substring(0, 500));

      if (action === 'deep-research' && deepResearchContext) {
        try {
          const recoveryPrompt = prompt + '\n\nCRITICAL JSON VALIDITY RULES: Return STRICT VALID JSON only. Keep each value short. Escape internal quotes. Do not include markdown or commentary.';
          const recovered = await callLovableAI(recoveryPrompt, model, Math.min(maxTokens, 22000));
          logAiUsage(supabaseAdmin, userInfo.userId, userInfo.userEmail, userInfo.userName, 'product_navigator', callType + '_parse_recovery', model, recovered.usage);
          const repairedParsed = parseJsonResponse(recovered.content);
          return new Response(JSON.stringify({ result: repairedParsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (recoveryErr: any) {
          console.error('Deep research recovery failed:', recoveryErr);
          const fallback = buildFallbackDeepResearchReport(
            deepResearchContext.product,
            deepResearchContext.inputData,
            'AI response was malformed twice; fallback report returned to avoid blocking your workflow.'
          );
          return new Response(JSON.stringify({ result: fallback, warning: 'partial_fallback' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // For non-deep-research actions (generate-ideas, etc.), retry once with conciseness
      try {
        console.warn(`${action} parse failed, retrying with strict JSON prompt...`);
        const recoveryPrompt = prompt + '\n\nCRITICAL: Return ONLY valid JSON. No markdown, no commentary. Keep values concise. Escape all quotes inside strings.';
        const recovered = await callLovableAI(recoveryPrompt, model, Math.min(maxTokens, 20000));
        logAiUsage(supabaseAdmin, userInfo.userId, userInfo.userEmail, userInfo.userName, 'product_navigator', callType + '_parse_recovery', model, recovered.usage);
        const repairedParsed = parseJsonResponse(recovered.content);
        return new Response(JSON.stringify({ result: repairedParsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (retryErr: any) {
        console.error(`${action} recovery also failed:`, retryErr);
        return new Response(JSON.stringify({ error: "AI returned an incomplete response after retry. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
