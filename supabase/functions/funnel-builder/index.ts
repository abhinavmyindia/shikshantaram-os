import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAIKey, callWithBYOK, logByokUsage, logUsage } from '../_shared/byok.ts';
import { getVerifiedUser, unauthorized } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-3-flash-preview':  { input: 0.10, output: 0.40 },
  'google/gemini-2.5-flash':        { input: 0.15, output: 0.60 },
  'google/gemini-2.5-pro':          { input: 1.25, output: 10.00 },
};

// logAiUsage replaced by shared logUsage from _shared/byok.ts


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
  try { return JSON.parse(clean); } catch {
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
      if (c === '{') braces++; if (c === '}') braces--;
      if (c === '[') brackets++; if (c === ']') brackets--;
    }
    if (inString) repaired += '"';
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }
    try { return JSON.parse(repaired); } catch (e2) {
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
          if (c === '{') b2++; if (c === '}') b2--;
          if (c === '[') k2++; if (c === ']') k2--;
        }
        while (k2 > 0) { aggressive += ']'; k2--; }
        while (b2 > 0) { aggressive += '}'; b2--; }
        return JSON.parse(aggressive);
      }
      throw e2;
    }
  }
}

interface AIResult { content: string; usage: any; }

async function callLovableAI(prompt: string, model: string, maxTokens: number): Promise<AIResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) { await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 2000)); }
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
    });
    if (response.status === 429) { await response.text(); continue; }
    if (response.status === 402) { await response.text(); throw new Error("AI credits exhausted. Please add credits."); }
    if (!response.ok) { await response.text(); throw new Error(`AI error: ${response.status}`); }
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || '', usage: data.usage || null };
  }
  throw new Error("AI is busy. Please try again.");
}

function buildFunnelPrompt(brief: any, funnelType: any): string {
  return `You are a world-class digital marketing funnel strategist.

Design a complete ${funnelType.name} for this digital product:

PRODUCT: ${brief.productName}
OFFER: ${brief.offer}
AUDIENCE: ${brief.audience}
PRIMARY GOAL: ${brief.goal}
TRAFFIC SOURCES: ${(brief.trafficSources || []).join(', ')}
FUNNEL TYPE: ${funnelType.name} (${funnelType.stepCount} steps)

Design exactly ${funnelType.stepCount} funnel steps. For EACH step return:
{
  "stepId": "step_1",
  "stepNumber": 1,
  "stepType": "opt-in | sales-page | email | order | upsell | thank-you | webinar | content | dm | waitlist | other",
  "stepName": "Specific name for this step",
  "stepIcon": "single relevant emoji",
  "accentColor": "hex color matching step type",
  "goal": "The ONE thing this step must achieve",
  "pageTitle": "If it's a page — the headline/title for this page",
  "whatHappensHere": "2-3 sentences describing exactly what the user experiences at this step",
  "keyMessage": "The core message to communicate at this step",
  "primaryCTA": "The exact call-to-action text",
  "conversionBenchmark": "Expected conversion rate e.g. '30-45% of visitors'",
  "timeOnStep": "How long visitor typically spends e.g. '2-5 minutes'",
  "emailTriggered": true or false,
  "emailSubject": "If emailTriggered — the subject line of the automated email sent",
  "platformRecommendation": "Best tool/platform to build this specific step",
  "copyFramework": "The persuasion framework to use e.g. 'AIDA', 'PAS', 'Before-After-Bridge'",
  "mistakesToAvoid": ["Common mistake 1 at this step", "Common mistake 2"],
  "successMetric": "How to know this step is working"
}

Also return a top-level funnel summary:
{
  "funnelName": "A name for this specific funnel",
  "funnelTagline": "One sentence describing what this funnel does",
  "estimatedConversionRate": "End-to-end conversion estimate",
  "estimatedTimeToLaunch": "How long to build and launch",
  "estimatedMonthlyRevenue": "Revenue estimate if 1000 visitors/month at stated price",
  "steps": [ ...all steps... ],
  "quickWins": ["Quick win 1", "Quick win 2", "Quick win 3"],
  "toolStack": [
    { "purpose": "Page builder", "recommended": "Tool name", "alternative": "Alternative tool", "cost": "Free/₹XXX/month" }
  ]
}

Return ONLY valid JSON. No preamble. No markdown.`;
}

function buildStepCopyPrompt(step: any, brief: any): string {
  return `You are an expert direct response copywriter.

Write complete, conversion-optimized copy for this funnel step:

STEP: ${step.stepName} (${step.stepType})
PRODUCT: ${brief.productName}
OFFER: ${brief.offer}
AUDIENCE: ${brief.audience}
STEP GOAL: ${step.goal}
KEY MESSAGE: ${step.keyMessage}
COPY FRAMEWORK: ${step.copyFramework}
PRIMARY CTA: ${step.primaryCTA}

Return ONLY valid JSON:
{
  "headline": "Main headline for this step",
  "subheadline": "Supporting headline",
  "openingHook": "First 2-3 sentences — the hook that stops them from leaving",
  "bodyParagraphs": ["Paragraph 1", "Paragraph 2", "Paragraph 3"],
  "bulletPoints": ["Benefit bullet 1", "Benefit bullet 2", "Benefit bullet 3", "Benefit bullet 4", "Benefit bullet 5"],
  "ctaText": "Exact CTA button text",
  "ctaSupportingLine": "Text below the button",
  "closingStatement": "Final statement before they leave",
  "emailCopy": {
    "subject": "Email subject line (if email step)",
    "previewText": "Email preview text",
    "body": "Full email body"
  },
  "platformNotes": "Specific tips for writing this copy on ${step.platformRecommendation || 'the web'}"
}

Return ONLY valid JSON. No preamble. No markdown.`;
}

function buildEmailSequencePrompt(brief: any, funnelData: any): string {
  const emailSteps = (funnelData.steps || []).filter((s: any) => s.emailTriggered);
  return `You are an email marketing expert who writes high-converting email sequences.

Write a complete email sequence for this funnel:

PRODUCT: ${brief.productName}
OFFER: ${brief.offer}
AUDIENCE: ${brief.audience}
FUNNEL TYPE: ${funnelData.funnelName}
EMAIL TRIGGER STEPS: ${emailSteps.map((s: any) => s.stepName).join(', ')}

Write these email series:
1. Welcome Series (3 emails): Day 0, Day 1, Day 3
2. Sales Series (3 emails): Day 5, Day 7, Day 9 (last chance)
3. Post-Purchase Series (2 emails): Day 0 (delivery), Day 3 (check-in)

For EACH email return:
{
  "seriesName": "Welcome Series",
  "emailNumber": 1,
  "day": 0,
  "triggerEvent": "When this email sends",
  "subject": "Email subject line",
  "previewText": "Preview text (40 chars)",
  "fromName": "Suggested sender name",
  "headline": "Email headline/opening",
  "body": "Full email body",
  "cta": "CTA button text",
  "ctaUrl": "[YOUR LINK]",
  "ps": "P.S. line",
  "toneNotes": "Brief note on the tone used and why"
}

Return a JSON object:
{
  "welcomeSeries": [...3 emails...],
  "salesSeries": [...3 emails...],
  "postPurchaseSeries": [...2 emails...],
  "sequenceSummary": "Overview of the full sequence strategy"
}

Return ONLY valid JSON. No preamble. No markdown.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userInfo = await getVerifiedUser(req);
  if (!userInfo) return unauthorized(corsHeaders);

  try {
    const body = await req.json();
    const { action } = body;

    // BYOK resolution
    const byokUserId = userInfo.userId;
    const byok = byokUserId ? await resolveAIKey(byokUserId) : { useByok: false as const };

    let prompt: string;
    let model: string;
    let maxTokens: number;
    let callType: string;

    if (action === 'generate-funnel') {
      prompt = buildFunnelPrompt(body.brief, body.funnelType);
      model = 'google/gemini-2.5-flash';
      maxTokens = 8000;
      callType = 'generate_funnel_architecture';
    } else if (action === 'generate-step-copy') {
      prompt = buildStepCopyPrompt(body.step, body.brief);
      model = 'google/gemini-3-flash-preview';
      maxTokens = 4000;
      callType = 'generate_step_copy';
    } else if (action === 'generate-emails') {
      prompt = buildEmailSequencePrompt(body.brief, body.funnelData);
      model = 'google/gemini-2.5-flash';
      maxTokens = 8000;
      callType = 'generate_email_sequence';
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Funnel Builder: action=${action}, model=${model}, byok=${byok.useByok}`);

    // ─── BYOK PATH ───────────────────────────────────────────────────────────
    if (byok.useByok) {
      try {
        const byokResult = await callWithBYOK({
          provider: byok.provider as any, apiKey: byok.apiKey, model: byok.model,
          userMessage: prompt, maxTokens,
        });
        await logByokUsage(byokUserId!, userInfo.userEmail, byok.provider, byok.model,
          'funnel_builder', callType, byokResult.inputTokens, byokResult.outputTokens, true);
        try {
          const parsed = parseJsonResponse(byokResult.text);
          return new Response(JSON.stringify({ result: parsed, byok: true, provider: byok.provider }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch { console.warn('BYOK parse failed, falling back to platform'); }
      } catch (byokErr) { console.warn('BYOK call failed, falling back:', byokErr); }
    }

    // ─── PLATFORM PATH (unchanged) ───────────────────────────────────────────
    const aiResult = await callLovableAI(prompt, model, maxTokens);

    // Log usage (awaited so the insert completes before the response closes the runtime)
    await logUsage({ supabaseAdmin, userId: userInfo.userId, userEmail: userInfo.userEmail, userName: userInfo.userName, module: 'funnel_builder', callType, model, usage: aiResult.usage });

    try {
      const parsed = parseJsonResponse(aiResult.content);
      return new Response(JSON.stringify({ result: parsed, byok: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('funnel-builder error:', e);
    try {
      await supabaseAdmin.from('error_logs').insert({
        error_type: 'edge_function_error', severity: 'error',
        message: e instanceof Error ? e.message : 'Unknown error',
        stack_trace: e instanceof Error ? e.stack : undefined,
        module: 'funnel_builder', additional_data: { function: 'funnel-builder' },
      });
    } catch (_) { /* ignore logging failure */ }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
