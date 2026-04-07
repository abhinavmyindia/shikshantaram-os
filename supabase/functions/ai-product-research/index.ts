import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAIKey, callWithBYOK, logByokUsage, logUsage } from '../_shared/byok.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── DIVERSITY SYSTEM ────────────────────────────────────────
// Diversity operates WITHIN the niche — angle variety, not topic drift.
// The niche is the constant. These are the variables.

const AUDIENCE_SEGMENTS = [
  'complete beginners who have never tried this before and feel overwhelmed',
  'people who tried and failed once and need a smarter second attempt',
  'mid-level practitioners stuck at a plateau who need the next breakthrough',
  'advanced practitioners who want to systematize and scale what they know',
  'busy professionals with under 30 minutes a day who need fast, practical wins',
  'people in tier-2 and tier-3 Indian cities with limited access to mentors',
  'women navigating unique social and professional barriers in this space',
  'young Indians aged 18-25 who are digitally native but new to this field',
];

const PAIN_ANCHORS = [
  'information overload — too much conflicting advice, no clear starting point',
  'inconsistent results — things work sometimes but they cannot figure out why',
  'fear of judgment or failure — imposter syndrome holding them back',
  'lack of accountability — trying everything alone with no community or support',
  'wasted money on courses that didn\'t work — deep distrust of new solutions',
  'knowing exactly what to do but completely failing at consistent execution',
  'not being taken seriously because they lack credentials or visible proof',
  'too much theory from generic resources, zero practical implementation help',
];

const DELIVERY_FORMATS = [
  'done-for-you templates, swipe files, and plug-and-play systems',
  'a structured 7-day or 30-day challenge with daily micro-actions',
  'a toolkit or resource vault with 10+ reusable components',
  'a community plus accountability group with weekly check-ins',
  'a focused video training under 2 hours delivering one core skill',
  'a calculator, audit, or assessment tool that gives personalised output',
  'a WhatsApp or Telegram-based programme delivered over 21 days',
  'a printable or digital workbook with fill-in-the-blank exercises',
];

const EXPERT_PERSONAS = [
  'You are Rahul, a Mumbai-based digital product creator who has built and sold products across dozens of Indian niches. You are obsessive about finding the overlooked sub-segments and underserved pain points that most creators miss. You think in terms of what a middle-class professional in Pune would buy at 11pm after watching a Reel. You always stay exactly within the niche you are given. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Priya, a Bangalore-based product strategist who specialises in finding the specific product angle that only a certain type of person can credibly create. You understand that the best products come from lived experience, not generic research. You create ideas that are deeply rooted in the niche given to you — not adjacent topics. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Vikram, a Chennai-based educator and entrepreneur who thinks in systems and frameworks. You create products that deliver a clear, measurable transformation within the niche you are given. You never drift from the niche — you go deeper into it instead. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Meera, a Delhi-based growth consultant who specialises in finding "blue ocean" angles within any niche — the specific pain point everyone overlooks, the format nobody has tried, the sub-audience nobody is serving. You always work within the niche. You make the niche more specific, you never replace it. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Arjun, a Pune-based Gen-Z founder who understands Indian 20-somethings deeply. You create products that are brutally honest, specific, and unapologetically rooted in the niche given. You never suggest ideas from other categories. You find new angles within the one you are given. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Sunita, a Jaipur-based entrepreneur who builds products specifically for tier-2 and tier-3 India. You understand the real India — high ambitions, limited English, no access to big-city networks. You always stay locked to the exact niche given, finding angles that serve this specific audience within that niche. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Karan, a Hyderabad-based performance marketer who thinks entirely in buyer psychology. You find the emotional trigger, the exact moment of pain, the specific person who will buy — all within the niche you are given. You never wander into other topics. You go deeper into the given niche. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
  'You are Deepa, a Mumbai-based veteran of the Indian self-improvement industry. You identify long-term evergreen angles within any niche — sub-audiences that will always need help, problems that never go away. You stay within the niche. You do not suggest adjacent categories. You find the gold that is already there. Always respond with valid JSON only. No markdown, no explanation, no preamble.',
];

const pick = <T,>(arr: T[], n = 1): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const pickOne = <T,>(arr: T[]): T => pick(arr, 1)[0];

// Adjacent niche table — used for MECHANISM borrowing only, not topic drift.
// We borrow the STRUCTURE/FORMAT from adjacent fields, applied TO the user's niche.
const ADJACENT_MECHANISMS: Record<string, string[]> = {
  'freelancing':        ['client acquisition system from B2B sales', 'personal brand positioning from thought leadership'],
  'digital marketing':  ['case study format from consulting', 'ROI calculator from finance'],
  'performance marketing': ['testing framework from product management', 'attribution model from data analytics'],
  'entrepreneurship':   ['accountability structure from coaching', 'validation framework from lean startup'],
  'sales':              ['objection handling script from negotiation', 'follow-up sequence from email marketing'],
  'personal finance':   ['habit tracking from behaviour change', 'goal-setting framework from productivity'],
  'fitness':            ['progressive overload structure from sports science', 'habit stacking from behaviour design'],
  'content creation':   ['editorial calendar from journalism', 'audience persona from market research'],
  'career growth':      ['skills gap analysis from HR', 'networking system from business development'],
  'coaching':           ['transformation roadmap from therapy', 'accountability framework from mentoring'],
  'investing':          ['risk assessment from insurance', 'portfolio diversification from asset management'],
  'mental health':      ['journaling system from therapy', 'coping toolkit from CBT'],
  'productivity':       ['energy management from sports performance', 'batching system from manufacturing'],
  'leadership':         ['feedback framework from coaching', 'delegation system from project management'],
  'ecommerce':          ['customer journey map from UX design', 'retention playbook from SaaS'],
  'parenting':          ['age-appropriate milestone map from child psychology', 'communication script from family therapy'],
  'relationships':      ['communication framework from conflict resolution', 'values alignment tool from therapy'],
  'job search':         ['personal CRM from sales', 'portfolio system from design'],
  'copywriting':        ['psychology framework from behavioural science', 'testing methodology from CRO'],
  'public speaking':    ['rehearsal framework from performing arts', 'feedback loop from coaching'],
  'consulting':         ['productisation framework from SaaS', 'case study system from academia'],
  'stock market':       ['risk management framework from insurance', 'journaling system from trading psychology'],
  'real estate':        ['deal analysis framework from private equity', 'networking system from B2B sales'],
  'youtube':            ['editorial planning from journalism', 'audience retention from TV production'],
  'instagram':          ['visual storytelling from photography', 'engagement framework from community management'],
  'writing':            ['editing framework from publishing', 'accountability system from coaching'],
  'coding':             ['project-based learning from bootcamps', 'portfolio system from design'],
  'ai tools':           ['workflow automation from operations', 'prompt engineering from NLP research'],
};

const getMechanism = (niche: string): string => {
  const key = Object.keys(ADJACENT_MECHANISMS).find(k =>
    niche.toLowerCase().includes(k) || k.includes(niche.toLowerCase().split(' ')[0])
  );
  if (key) return pickOne(ADJACENT_MECHANISMS[key]);
  return 'structured accountability system from coaching';
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
  const audienceAngle = pickOne(AUDIENCE_SEGMENTS);
  const painAnchor = pickOne(PAIN_ANCHORS);
  const deliveryFormat = pickOne(DELIVERY_FORMATS);
  const persona = pickOne(EXPERT_PERSONAS);
  const mechanism = getMechanism(niche);

  const prompt = `Generate exactly 30 unique digital product ideas.

━━━ THE NICHE (NON-NEGOTIABLE) ━━━
Every single one of the 30 ideas MUST be directly and specifically about: ${niche}
Not adjacent to it. Not inspired by it. Not loosely related.
Directly about it. If an idea could exist without referencing ${niche}, it does not belong here.
This is the single most important rule. It overrides everything else.

━━━ MARKET ━━━
Target Country: ${country}
Product Type: ${productType}

━━━ ANGLE FOR THIS BATCH ━━━
Audience angle: ideas primarily serving ${audienceAngle}
Pain angle: ideas centred on the pain of ${painAnchor}
Product format bias: lean toward ${deliveryFormat}

━━━ INNOVATION INSTRUCTION ━━━
For 3 of your 30 ideas, apply the following mechanism to the ${niche} niche:
"${mechanism}"
These ideas must still be fully about ${niche} — you are borrowing the structure,
not the topic. e.g. if the mechanism is "ROI calculator" and the niche is
"performance marketing", the product is a "Performance Marketing ROI Calculator"
— not a finance product.

━━━ QUALITY STANDARD ━━━
Do not generate the first 10 ideas that come to mind for this niche.
Go past the obvious. Find the overlooked sub-segments, the underserved
pain points, the format nobody has built yet. Variety in angles and
formats is expected, but every idea must be rooted in ${niche}.

━━━ SCORE DISTRIBUTION (MANDATORY) ━━━
Across your 30 ideas, you MUST include a realistic spread of impulse scores:
- At least 8 ideas with impulseScore 8, 9, or 10 (high impulse — viral potential, quick win)
- At least 8 ideas with impulseScore 5, 6, or 7 (medium impulse — strong demand)
- The remaining ideas can be lower impulse (premium, evergreen, deeper transformation)
Do NOT cluster all ideas at the same score. Real markets have a full range.

impulseTag must match the score:
- Score 8-10 → "🔥 Viral Potential" or "⚡ Quick Win"
- Score 6-7 → "🎯 High Demand" or "💎 Premium"
- Score 3-5 → "🌟 Evergreen"

Also vary demandScore and competitionLevel across the 30 ideas.
Mix quick wins (high impulse, low competition) with premium plays (lower impulse, higher value).

━━━ FINAL CHECK (do this before returning) ━━━
Before outputting your JSON, review every idea and ask:
"Is this product specifically about ${niche}?"
If the answer for any idea is "not really" or "sort of" — replace it
with one that is unambiguously about ${niche}.

Return ONLY a JSON array of exactly 30 objects. Each object:
{
  "productName": "specific product name — must clearly relate to ${niche}",
  "tagline": "benefit-driven line under 12 words",
  "primaryPain": "exact pain this solves in 8 words — must be a ${niche} pain",
  "targetAudience": "specific buyer avatar in 10 words",
  "demandScore": <number 1-10>,
  "competitionLevel": "Low" | "Medium" | "High",
  "buildTime": "X-Y weeks" or "X-Y days",
  "impulseScore": <number 1-10>,
  "impulseTag": "🔥 Viral Potential" (score 9-10) | "⚡ Quick Win" (score 7-9) | "🎯 High Demand" (score 6-8) | "💎 Premium" (score 5-7) | "🌟 Evergreen" (score 3-5),
  "priceRange": "₹XXX–₹X,XXX",
  "searchKeyword": "most likely search term buyer uses",
  "productCategory": "${productType}",
  "whyUnique": "one sentence — what makes this different from obvious ${niche} products"
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
      mechanism,
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
      temperature = 0.9; // Enough diversity, eliminates topic drift
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

      // Apply diversity layers to generate-more — niche-anchored
      const audienceAngle = pickOne(AUDIENCE_SEGMENTS);
      const painAnchor = pickOne(PAIN_ANCHORS);
      const mechanism = getMechanism(niche);
      systemPrompt = pickOne(EXPERT_PERSONAS);
      temperature = 0.9;

      prompt = `Generate exactly ${moreCount} NEW digital product ideas. These must be COMPLETELY DIFFERENT from the ideas already generated.

━━━ THE NICHE (NON-NEGOTIABLE) ━━━
Every idea MUST be directly and specifically about: ${niche}
Not adjacent to it. Not inspired by it. Directly about it.
This rule overrides everything else.

━━━ CONTEXT ━━━
Country: ${country}
Product Type: ${productType}
Direction: ${dirInstruction}
${rawContext}
━━━ ANGLE FOR THIS BATCH ━━━
Audience: ${audienceAngle}
Pain: ${painAnchor}
For 1-2 ideas, borrow this mechanism and apply it to ${niche}: "${mechanism}"

ALREADY GENERATED — DO NOT REPEAT:
${(existingNames || []).map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}

RULES:
1. None of your ${moreCount} ideas can be similar to ANY idea above
2. Apply the direction focus strictly: ${dirInstruction}
3. All ideas must be specific to ${country} market context
4. Every idea must be unambiguously about ${niche}

━━━ FINAL CHECK ━━━
Before returning, review each idea: "Is this specifically about ${niche}?"
If not — replace it with one that is.

For EACH idea return:
{"productName":"...","tagline":"...","targetAudience":"...","priceRange":"...","buildTime":"...","marketSize":"...","demandScore":7,"competitionLevel":"Medium","impulseScore":7,"impulseTag":"...","primaryPain":"...","searchKeyword":"...","productCategory":"${productType}","whyUnique":"..."}

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
      const responseBody: any = { result: parsed, byok: false };
      if (diversityMeta) responseBody._diversity = diversityMeta;
      return new Response(JSON.stringify(responseBody), {
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
