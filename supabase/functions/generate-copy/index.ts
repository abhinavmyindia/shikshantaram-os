import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAIKey, callWithBYOK, logByokUsage, logUsage } from '../_shared/byok.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'google/gemini-3-flash-preview': { input: 0.10, output: 0.40 },
};

function extractUserFromAuth(authHeader: string | null) {
  if (!authHeader) return { userId: null, userEmail: null, userName: null };
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return { userId: payload.sub || null, userEmail: payload.email || null, userName: payload.user_metadata?.full_name || payload.email?.split('@')[0] || null };
  } catch { return { userId: null, userEmail: null, userName: null }; }
}

async function logAiUsage(supabaseAdmin: any, userId: string | null, userEmail: string | null, userName: string | null, callType: string, model: string, usage: any) {
  try {
    if (!usage) return;
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const pricing = MODEL_PRICING[model] || { input: 0.15, output: 0.60 };
    const estimatedCost = (inputTokens / 1_000_000 * pricing.input) + (outputTokens / 1_000_000 * pricing.output);
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId, user_email: userEmail || 'anonymous', user_name: userName || 'Unknown',
      module: 'copy_suite', call_type: callType, model, input_tokens: inputTokens, output_tokens: outputTokens,
      total_tokens: usage.total_tokens || (inputTokens + outputTokens), estimated_cost_usd: estimatedCost,
    });
  } catch (err) { console.warn('Usage logging failed:', err); }
}

interface AIResult { content: string; usage: any; }

async function callLovableAI(prompt: string, systemPrompt: string, model: string, maxTokens: number): Promise<AIResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 2000));
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
      }),
    });
    if (response.status === 429) { await response.text(); continue; }
    if (response.status === 402) { await response.text(); throw new Error("AI credits exhausted."); }
    if (!response.ok) { await response.text(); throw new Error(`AI error: ${response.status}`); }
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || '', usage: data.usage || null };
  }
  throw new Error("AI is busy. Please try again.");
}

function sanitizeJsonString(s: string): string {
  let clean = s.replace(/```json|```/g, '').trim();
  const objStart = clean.indexOf('{');
  if (objStart > 0) clean = clean.substring(objStart);
  const lastBrace = clean.lastIndexOf('}');
  if (lastBrace >= 0 && lastBrace < clean.length - 1) clean = clean.substring(0, lastBrace + 1);
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
    let repaired = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
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
    return JSON.parse(repaired);
  }
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: 'Write in a clean, authoritative, trust-building voice. No slang. Confident and credible.',
  conversational: 'Write like a knowledgeable Indian friend recommending something. Warm, relatable, culturally aware. Use "you" naturally.',
  bold: 'Write with high energy and urgency. Direct. FOMO-driven. Short punchy sentences. Make them feel they are missing out RIGHT NOW.',
  empathetic: 'Write with deep understanding of their pain. Validate their struggle before offering the solution. Warm, human, emotional.',
};

const SECTION_GUIDES: Record<string, string> = {
  landing_page: `Generate these 5 sections:
1. hero_headline (icon: 🎯, name: "Hero Headline"): Main headline (curiosity + promise) + subheadline (specificity + credibility)
2. why_this (icon: ✨, name: "Why This Changes Everything"): 3 bullet benefits (bold label + 1-2 sentence explanation each)
3. social_proof (icon: 👥, name: "Social Proof Block"): 2-3 testimonial-style placeholder structures + one credibility statement
4. cta_section (icon: 🔘, name: "CTA Section"): Opt-in button text + below-button reassurance line
5. full_page_copy (icon: 📄, name: "Full Page Copy"): Complete formatted landing page combining all above (500-700 words)`,

  sales_page: `Generate these 9 sections:
1. hero_headline (icon: 🎯, name: "Hero Headline"): Power headline + subheadline + 2-sentence opening hook
2. the_story (icon: 📖, name: "The Story"): Problem-agitation-solution narrative (4-5 paragraphs, personal and specific)
3. solution_reveal (icon: 💡, name: "The Solution Reveal"): Introduce the product as THE solution (2-3 paragraphs)
4. features_benefits (icon: ✅, name: "Features → Benefits"): 5 items in format "Feature: [X] → So you can: [Y]"
5. testimonial_placeholders (icon: 👥, name: "Testimonial Placeholders"): 3 structured testimonials with [NAME], [RESULT], [TIMEFRAME] placeholders
6. offer_stack (icon: 🎁, name: "The Offer Stack"): Complete offer stack with all inclusions and values
7. guarantee_block (icon: 🛡, name: "Guarantee Block"): Risk-reversal guarantee statement (3-4 sentences)
8. faq (icon: ❓, name: "FAQ"): 5 most common objections as Q&A
9. final_cta_ps (icon: 🔘, name: "Final CTA + PS"): Urgency paragraph + CTA button text + strong PS line`,

  order_bump: `Generate these 4 sections:
1. bump_headline (icon: ⚡, name: "Bump Headline"): "Yes! Add [specific offer] to my order for just ₹[price]!" — specific and exciting
2. three_line_pitch (icon: 📝, name: "The 3-Line Pitch"): Exactly 3 punchy benefit lines (each max 15 words)
3. value_justification (icon: 💰, name: "Why It's Worth It"): 2-3 sentences explaining why this is a no-brainer at this price
4. checkbox_cta (icon: ☑️, name: "Checkbox CTA Text"): Exact checkbox label text (max 20 words, starts with "Yes, add...")`,

  upsell: `Generate these 5 sections:
1. congratulations_opener (icon: 🎉, name: "Congratulations Opener"): Celebrate their purchase, build excitement (2-3 sentences)
2. upsell_headline (icon: 🚀, name: "The Upsell Headline"): "Wait — One More Thing Before You Access [product]" style
3. bridge (icon: 🌉, name: "The Bridge"): "You just got X. Now imagine Y." connection (3-4 sentences)
4. whats_included (icon: 📦, name: "What's Included"): Upsell offer details with value points
5. one_time_offer (icon: ⏰, name: "One-Time Offer Block"): Urgency statement (this page only) + "YES, Add This!" + "No thanks, I'll pass" text`,

  downsell: `Generate these 4 sections:
1. wait_headline (icon: 🛑, name: "Wait Headline"): "Before You Go..." or "Wait — I Have One More Option" opener
2. empathy_bridge (icon: 💙, name: "The Empathy Bridge"): Acknowledge their hesitation warmly, no pressure (2-3 sentences)
3. stripped_offer (icon: 📦, name: "The Stripped Offer"): The reduced offer, clearly presented, why still valuable
4. accept_cta (icon: 🔘, name: "Accept CTA"): Yes button text + dismiss link text`,

  thank_you_page: `Generate these 5 sections:
1. confirmation_headline (icon: 🎉, name: "Confirmation Headline"): Celebrate + confirm their great decision (headline + 2 sentences)
2. what_happens_next (icon: 📋, name: "What Happens Next"): 3 numbered steps with icon, title, and 1-sentence description each
3. surprise_bonus (icon: 🎁, name: "Surprise Bonus"): Unexpected extra value to delight and reduce buyer's remorse
4. community_invite (icon: 👥, name: "Community Invite"): Join community/group CTA (warm, benefit-focused)
5. share_ask (icon: 📣, name: "The Share Ask"): "Know someone who needs this?" referral ask (friendly, not pushy)`,

  followup_email: `Generate these 4 sections:
1. subject_lines (icon: 📬, name: "Subject Lines"): 3 subject line variations labeled A (curiosity), B (benefit), C (direct)
2. preview_texts (icon: 👁, name: "Preview Text"): Matching preview text for each subject line
3. email_body (icon: 📧, name: "Email Body"): Complete email (280-350 words), conversational, signed with "[Your Name]"
4. ps_line (icon: 💬, name: "PS Line"): One P.S. that creates curiosity or urgency to click`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userInfo = extractUserFromAuth(req.headers.get('authorization'));

  try {
    const body = await req.json();
    const { copyType, baseBrief, typeSpecificInputs, tone } = body;

    // BYOK resolution
    const byokUserId = body.userId || userInfo.userId;
    const byok = byokUserId ? await resolveAIKey(byokUserId) : { useByok: false as const };

    const copyTypeKey = copyType.replace(/\s+/g, '_').toLowerCase();
    const toneGuide = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.conversational;
    const sectionGuide = SECTION_GUIDES[copyTypeKey] || SECTION_GUIDES.sales_page;

    const system = `You are a world-class direct response copywriter specializing in digital products for the Indian market. You write copy that converts — combining proven frameworks (PAS, AIDA, PASTOR) with cultural nuance for Indian buyers. ${toneGuide} Always respond with valid JSON only. No markdown, no preamble.`;

    const typeSpecificStr = Object.entries(typeSpecificInputs || {})
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const prompt = `Write ${copyType} copy for:

Product: ${baseBrief.productName}
Target Audience: ${baseBrief.audience}
Before State (pain): ${baseBrief.beforeState}
After State (transformation): ${baseBrief.afterState}
Price: ${baseBrief.currency === 'usd' ? '$' : baseBrief.currency === 'gbp' ? '£' : '₹'}${baseBrief.price}
Tone: ${tone}
${typeSpecificStr}

${sectionGuide}

Return ONLY a JSON object:
{
  "sections": [
    {
      "id": "section_id",
      "name": "Section Display Name",
      "icon": "emoji",
      "content": "the full copy for this section"
    }
  ],
  "score": {
    "overall": <0-100>,
    "hookPower": <0-25>,
    "clarity": <0-25>,
    "emotionalPull": <0-25>,
    "ctaStrength": <0-25>,
    "tips": [
      "specific improvement tip 1",
      "specific improvement tip 2"
    ]
  }
}`;

    const model = 'google/gemini-2.5-flash';
    console.log(`Copywriting Suite: type=${copyType}, tone=${tone}, model=${model}, byok=${byok.useByok}`);

    // ─── BYOK PATH ───────────────────────────────────────────────────────────
    if (byok.useByok) {
      try {
        const byokResult = await callWithBYOK({
          provider: byok.provider as any, apiKey: byok.apiKey, model: byok.model,
          system, userMessage: prompt, maxTokens: 8000,
        });
        await logByokUsage(byokUserId!, body.userEmail || userInfo.userEmail, byok.provider, byok.model,
          'copywriting_suite', `generate_${copyTypeKey}`, byokResult.inputTokens, byokResult.outputTokens, true);
        try {
          const parsed = parseJsonResponse(byokResult.text);
          return new Response(JSON.stringify({ ...parsed, byok: true, provider: byok.provider }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch { console.warn('BYOK parse failed, falling back to platform'); }
      } catch (byokErr) { console.warn('BYOK call failed, falling back:', byokErr); }
    }

    // ─── PLATFORM PATH (unchanged) ───────────────────────────────────────────
    const aiResult = await callLovableAI(prompt, system, model, 8000);

    // Log usage
    logAiUsage(supabaseAdmin, userInfo.userId, userInfo.userEmail, userInfo.userName, `generate_${copyTypeKey}`, model, aiResult.usage);

    const parsed = parseJsonResponse(aiResult.content);
    return new Response(JSON.stringify({ ...parsed, usage: aiResult.usage, byok: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-copy error:', e);
    await supabaseAdmin.from('error_logs').insert({
      error_type: 'edge_function_error', severity: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
      stack_trace: e instanceof Error ? e.stack : undefined,
      module: 'copywriting_suite', additional_data: { function: 'generate-copy' },
    }).catch(() => {});
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
