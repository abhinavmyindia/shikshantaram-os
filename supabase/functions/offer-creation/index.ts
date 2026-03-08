import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function buildStructuresPrompt(brief: any): string {
  return `You are Alex Hormozi — the world's best offer builder. Your job is to design irresistible digital product offers.

PRODUCT BRIEF:
- Product: ${brief.productName}
- Target Audience: ${brief.audience}
- Transformation: From "${brief.beforeState}" → To "${brief.afterState}"
- Price Range: ${brief.priceRange}
- Selling On: ${brief.platforms.join(', ')}

Design exactly 3 offer structures at different levels of value and price:

Structure A — "The Essential" (entry-level, accessible, high volume)
Structure B — "The Complete" (mid-tier, best value, recommended)  
Structure C — "The Premium" (full package, highest transformation, lowest volume)

For EACH structure return a JSON object with:
structureId, structureName, tagline, price, originalPrice, coreProduct (name, description, perceivedValue), bonuses (array of name, description, perceivedValue, relevanceScore), guarantee (type, statement, strength), urgency (mechanism, statement, authenticity), totalPerceivedValue, valueMultiple, targetBuyer, positioningAngle, strengthScore (number 0-100), whyThisWorks.

Return ONLY a valid JSON array of 3 structure objects. No preamble. No markdown.`;
}

function buildOfferPrompt(brief: any, chosenStructure: any): string {
  return `You are the world's best direct response copywriter and offer strategist.

Build a COMPLETE, ready-to-use offer for this digital product.

PRODUCT: ${brief.productName}
AUDIENCE: ${brief.audience}
TRANSFORMATION: ${brief.beforeState} → ${brief.afterState}
CHOSEN STRUCTURE: ${JSON.stringify(chosenStructure)}
SELLING PLATFORM: ${brief.platforms.join(', ')}

Return ONLY a valid JSON object with this structure:

{
  "offerHeadline": "The main headline for this offer (transformation-focused, specific, compelling)",
  "offerSubheadline": "Supporting line that adds specificity or social proof element",
  "oneLinerPitch": "One sentence elevator pitch (format: I help [audience] achieve [result] in [timeframe] using [mechanism])",
  "hook": "Opening hook/attention-grabber (2-3 sentences)",
  "valueStack": [
    { "item": "Core Product name", "type": "core", "actualCost": "cost", "perceivedValue": "value", "description": "Why buyer perceives this as worth that much" },
    { "item": "Bonus name", "type": "bonus", "actualCost": "0", "perceivedValue": "value", "description": "Why valuable" },
    { "item": "Guarantee", "type": "guarantee", "actualCost": "0", "perceivedValue": "risk removal value", "description": "What risk this removes" }
  ],
  "totalPerceivedValue": "total",
  "yourPrice": "price",
  "valueSentence": "e.g. Everything above is worth X. Today, get it all for just Y.",
  "pricingPsychology": {
    "anchorPrice": "crossed-out price",
    "anchorReason": "Why anchor is believable",
    "charmPricing": "End in 7 or 9? reasoning",
    "splitOption": "Payment plan reasoning"
  },
  "guaranteeScript": "Full guarantee statement (3-4 sentences)",
  "urgencyScript": "Urgency/scarcity statement (2-3 sentences, believable)",
  "callToAction": "CTA button text",
  "offerDescription": "Complete offer description paragraph (5-7 sentences, sales copy ready to paste)",
  "dmScript": "A 3-message DM sequence. Format each as 'Message 1: ...' 'Message 2: ...' 'Message 3: ...'",
  "socialCaption": "Instagram/LinkedIn-ready caption with hook, value bullets, CTA, hashtags",
  "emailSubject": "Email subject line",
  "emailPitch": "Full email body copy",
  "offerScore": {
    "total": 78,
    "valuePriceRatio": 18,
    "bonusRelevance": 16,
    "guaranteeStrength": 15,
    "urgencyMechanism": 14,
    "positioningClarity": 15,
    "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
  }
}

Return ONLY valid JSON. No preamble. No markdown backticks.`;
}

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

  let result = '';
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code < 32 && code !== 10 && code !== 13 && code !== 9) result += ' ';
    else if (code === 127) result += ' ';
    else result += clean[i];
  }
  result = result.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  return result;
}

function parseJsonResponse(text: string): any {
  const clean = sanitizeJsonString(text);
  try {
    return JSON.parse(clean);
  } catch (e) {
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
}

async function callLovableAI(prompt: string, model: string, maxTokens: number): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 2000;
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
    if (response.status === 402) { await response.text(); throw new Error("AI credits exhausted. Please add credits."); }
    if (!response.ok) { const t = await response.text(); throw new Error(`AI error: ${response.status}`); }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  throw new Error("AI is busy. Please try again.");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    let prompt: string;
    let model: string;
    let maxTokens: number;

    if (action === 'generate-structures') {
      prompt = buildStructuresPrompt(body.brief);
      model = 'google/gemini-3-flash-preview';
      maxTokens = 6000;
    } else if (action === 'build-offer') {
      prompt = buildOfferPrompt(body.brief, body.chosenStructure);
      model = 'google/gemini-2.5-flash';
      maxTokens = 8000;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Offer Creation: action=${action}, model=${model}`);
    const rawText = await callLovableAI(prompt, model, maxTokens);

    try {
      const parsed = parseJsonResponse(rawText);
      return new Response(JSON.stringify({ result: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('offer-creation error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
