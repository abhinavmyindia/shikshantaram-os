import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CHAT_MODEL  = 'google/gemini-3.6-flash'
const TITLE_MODEL = 'google/gemini-3.1-flash-lite'
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const CREDIT_COST_TEXT  = 3
const CREDIT_COST_IMAGE = 6

const ABHINAV_SYSTEM_PROMPT = `You are AskAbhinavAI — the 24/7 AI version of Abhinav, founder of Shikshantaram OS. You help entrepreneurs and knowledge creators in the Indian knowledge economy build digital products, run better ads, find their niche, and grow their business.

WHO YOU ARE:
You are Abhinav. Direct. Practical. No fluff. You have built Shikshantaram OS to give people real guidance, not generic advice they can find anywhere. You have seen every kind of problem. You know exactly what makes ads work, why people struggle to pick a niche, and why most people lose motivation.

COMMUNICATION STYLE — STRICTLY FOLLOW EVERY POINT:
- Talk like a mentor having a real conversation, not a textbook or a generic AI assistant
- Hindi-English mix is natural when it feels right: use "bhai", "dekho", "yaar", "samjhe?", "bilkul sahi", "ekdum sahi baat hai" naturally
- NEVER start a response with "Great question!", "Certainly!", "Absolutely!", "Of course!" — these are AI tells, you never say these
- Use "Right?" naturally in conversation to check understanding and create connection — exactly like you do in real life
- Use "automatically" — it is a natural part of how you speak
- Use "exactly" when being specific and precise about something
- Responses are conversational paragraphs, not bullet lists. Use a list only when it genuinely adds clarity.
- Match response length to the complexity. Simple question = short, direct answer. Complex problem = detailed breakdown.
- Be honest. If someone's offer is weak, tell them the offer is weak. Do not soften it to the point of uselessness.
- When someone shares a problem, ask for full details BEFORE diagnosing. You cannot solve what you do not fully understand.

WHEN SOMEONE HAS AN AD PROBLEM (Facebook ads, Instagram ads, any paid campaign):
Diagnose before you prescribe. Ask for the full picture first if they have not shared it: the ad creative, spend, metrics (CTR, CPM, CPR, ROAS), landing page, and actual offer. Then give a specific diagnosis. Root causes are almost always: weak hook, offer mismatch with landing page, wrong target audience, weak copy, or the offer itself is bad. End every ad review with ONE specific thing to change or test first. Not ten things. One thing.

WHEN SOMEONE IS CONFUSED ABOUT THEIR NICHE:
Niche is not something you pick from a trending list. It comes from within. Ask what they actually do, what problems they have already solved, who they naturally want to help, and what they could talk about for hours. The niche lives at the intersection of skill, interest, and who they want to serve. Never give a generic list of profitable niches. Help them look inward.

WHEN SOMEONE IS DEMOTIVATED:
Tough love but not harsh. People get stuck when they stop putting in real work or when they have no clear vision. Push them toward one clear goal, deep work on one thing at a time, finding the right support. Motivation is a byproduct of real progress.

WHEN SOMEONE SHARES AN IMAGE:
Analyze it specifically. For ad creatives: is the hook strong? Does the visual match the copy message? Is the offer clear? What is the single biggest thing to change? Be specific.

PLATFORM CONTEXT:
You are inside Shikshantaram OS. Other tools: Product Navigator, Niche Clarity, Knowledge Base, Offer Creation, Funnel Builder, Copywriting Suite. If a problem is better solved by one of these tools, point them there by name.

LANGUAGE:
Respond in the same language the user writes in. If they write in Hindi, respond in Hindi (or natural Hindi-English mix). If English, English. Never switch unless the user does.

WHAT YOU STAND FOR:
Hard work plus right guidance plus right resources equals real results. No shortcuts. Right?`

async function callGatewayStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens = 1500,
): Promise<Response> {
  return await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Lovable-API-Key': apiKey,
      'X-Lovable-AIG-SDK': 'fetch',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })
}

async function callGatewaySync(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens = 60,
): Promise<string> {
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Lovable-API-Key': apiKey,
      'X-Lovable-AIG-SDK': 'fetch',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  })
  if (!response.ok) return 'New Chat'
  const data = await response.json()
  return data?.choices?.[0]?.message?.content?.trim()?.replace(/^"|"$/g, '') || 'New Chat'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY') ?? ''
    if (!apiKey) {
      console.error('LOVABLE_API_KEY is not set')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Validate via getClaims with getUser fallback
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const { data: claimsData } = await supabase.auth.getClaims(token)
      userId = (claimsData as any)?.claims?.sub ?? null
      userEmail = (claimsData as any)?.claims?.email ?? null
    } catch (_) {}
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser()
      userId = userData?.user?.id ?? null
      userEmail = userData?.user?.email ?? null
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const user = { id: userId, email: userEmail }

    const { session_id, message, images, is_new_session } = await req.json()
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hasImages = Array.isArray(images) && images.length > 0
    const creditCost = hasImages ? CREDIT_COST_IMAGE : CREDIT_COST_TEXT

    // Check credits (READ ONLY — no deduction until success)
    const { data: creditData, error: creditCheckError } = await supabaseAdmin
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (creditCheckError || !creditData) {
      console.error('Credit check error:', creditCheckError)
      return new Response(JSON.stringify({ error: 'Could not verify credit balance' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if ((creditData.balance ?? 0) < creditCost) {
      return new Response(JSON.stringify({
        error: 'insufficient_credits', required: creditCost, balance: creditData.balance,
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let currentSessionId = session_id
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title: 'New Chat' })
        .select('id').single()
      if (sessionError || !newSession) {
        console.error('Session creation error:', sessionError)
        return new Response(JSON.stringify({ error: 'Failed to create session' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      currentSessionId = newSession.id
    }

    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    const chatMessages: Array<{ role: string; content: unknown }> = []
    if (history && history.length > 0) {
      for (const msg of history) chatMessages.push({ role: msg.role, content: msg.content })
    }

    const userContent: Array<unknown> = []
    if (hasImages) {
      for (const img of images) {
        if (img.data && img.media_type) {
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:${img.media_type};base64,${img.data}` },
          })
        }
      }
    }
    userContent.push({ type: 'text', text: message.trim() })
    chatMessages.push({ role: 'user', content: hasImages ? userContent : message.trim() })

    await supabaseAdmin.from('chat_messages').insert({
      session_id: currentSessionId,
      user_id: user.id,
      role: 'user',
      content: message.trim(),
      image_urls: [],
    })

    const aiResponse = await callGatewayStream(
      apiKey, CHAT_MODEL, ABHINAV_SYSTEM_PROMPT, chatMessages,
    )

    if (!aiResponse.ok || !aiResponse.body) {
      const errorText = await aiResponse.text().catch(() => '')
      console.error(`AI gateway error: ${aiResponse.status}`, errorText)
      const msg = aiResponse.status === 429
        ? 'Too many requests right now. Please try again in a moment.'
        : aiResponse.status === 402
          ? 'AI credits exhausted. Please contact support.'
          : `AI service error (${aiResponse.status})`
      return new Response(
        JSON.stringify({ error: msg }),
        { status: aiResponse.status === 429 ? 429 : aiResponse.status === 402 ? 402 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const encoder = new TextEncoder()
    const reader = anthropicResponse.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullResponse = ''
    let creditDeducted = false

    const outStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ session_id: currentSessionId })}\n\n`))

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const dataStr = line.slice(6).trim()
              if (!dataStr || dataStr === '[DONE]') continue
              try {
                const event = JSON.parse(dataStr)
                if (
                  event.type === 'content_block_delta' &&
                  event.delta?.type === 'text_delta' &&
                  event.delta.text
                ) {
                  const text = event.delta.text
                  fullResponse += text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                }
              } catch { /* skip malformed event */ }
            }
          }

          // 1. Save assistant message
          await supabaseAdmin.from('chat_messages').insert({
            session_id: currentSessionId,
            user_id: user.id,
            role: 'assistant',
            content: fullResponse,
            image_urls: [],
          })

          // 2. Deduct credits via existing RPC (service role bypasses GRANT)
          const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
            'deduct_chat_credits',
            { p_user_id: user.id, p_amount: creditCost },
          )
          if (deductError) {
            console.error('Credit deduction failed:', deductError)
          } else if (deductResult?.success) {
            creditDeducted = true
          }

          // 3. Touch session timestamp
          await supabaseAdmin.from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentSessionId)

          // 4. Generate title for new sessions
          if (is_new_session || !session_id) {
            try {
              const title = await callAnthropicSync(apiKey, HAIKU_MODEL, [{
                role: 'user',
                content: `Generate a 4 to 6 word title for a chat that started with this message: "${message.trim().slice(0, 200)}". Reply with ONLY the title. No quotes. No full stop at the end.`,
              }])
              await supabaseAdmin.from('chat_sessions')
                .update({ title, updated_at: new Date().toISOString() })
                .eq('id', currentSessionId)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ session_title: title })}\n\n`))
            } catch (titleError) {
              console.error('Title generation failed:', titleError)
            }
          }

          // 5. Log to ai_usage_logs (existing schema)
          try {
            await supabaseAdmin.from('ai_usage_logs').insert({
              user_id: user.id,
              user_email: user.email,
              module: 'ask_abhinav_ai',
              call_type: hasImages ? 'chat_image' : 'chat_text',
              model: SONNET_MODEL,
              input_tokens: 0,
              output_tokens: 0,
              total_tokens: 0,
              estimated_cost_usd: 0,
              logged_from: 'edge',
            })
          } catch (logError) {
            console.error('ai_usage_logs failed:', logError)
          }

          if (!creditDeducted) {
            console.error('Response delivered but credits were NOT deducted for user', user.id)
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (streamError) {
          console.error('Streaming error:', streamError)
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (streamError as Error).message })}\n\n`))
          } catch {}
          controller.close()
        }
      },
    })

    return new Response(outStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('ask-abhinav-ai top-level error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
