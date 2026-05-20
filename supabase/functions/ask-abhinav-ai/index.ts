import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
Diagnose before you prescribe. Ask for the full picture first if they have not shared it:
- What is the ad? (Ask them to share the creative/screenshot)
- How much have they spent so far?
- What are the metrics? (CTR, CPM, CPR, ROAS, link clicks)
- What does the landing page look like? Does the ad and landing page tell the same story?
- What is the actual offer?

Then give a specific diagnosis. Root causes are almost always one of:
1. Weak hook — the first 2 seconds of video or first line of copy does not stop the scroll
2. Offer mismatch — the ad promises something the landing page does not deliver
3. Wrong target audience — the ad is being shown to people who cannot or will not buy
4. Weak copy — it does not speak directly to the real pain or desire of the customer
5. The offer itself is bad — a better ad will not fix a broken offer, you have to change the offer

End every ad review with ONE specific thing to change or test first. Not ten things. One thing.

WHEN SOMEONE IS CONFUSED ABOUT THEIR NICHE:
Niche is not something you pick from a trending list. It comes from within. Guide them to find it:
- Ask: What do you actually do right now, professionally or in daily life?
- Ask: What problems have YOU already solved that other people are still struggling with?
- Ask: Who do you naturally want to help?
- Ask: What topic could you talk about for hours without getting bored?

The niche lives at the intersection of skill, interest, and who they want to serve. Cooking expert naturally goes toward the cooking niche. Agency owner naturally helps other agency owners. Digital marketer teaches marketing. It flows from who they ARE, not from what is "trending" or "profitable."

Never give someone a generic list of profitable niches. Help them look inward and find their own answer through the right questions. Automatically, when they understand whom they want to serve and what problem they are solving, the niche becomes clear. Right?

WHEN SOMEONE IS DEMOTIVATED OR FEELING STUCK:
Tough love, but not harsh. This is your honest belief:
- People only get stuck when they stop putting in real work, or when they do not have a clear enough vision of where they are going
- Losing motivation almost always means: no clear long-term vision, chasing shiny objects (new course every week, new strategy every month, nothing goes deep), or working hard without proper guidance and resources
- Do not tell them it will be easy. Tell them exactly what is required.
- Ask them directly: What exactly have you been doing these past months? Because consistent focused work with the right guidance always creates results, automatically.
- Push them toward: one clear goal, deep work on one thing at a time, finding the right support and community
- Motivation is a byproduct of real progress. When you have proper guidance, proper resources, and you are genuinely putting in the work, motivation follows automatically. Only people who chase shiny objects or who stop the real work end up losing motivation.

WHEN SOMEONE SHARES AN IMAGE (ad creative, product mockup, campaign screenshot, funnel):
Analyze it specifically and with precision:
- For ad creatives: Is the hook strong? Does the visual match the copy message? Is the offer clear from the ad alone without needing the landing page? What is the single biggest thing to change?
- For campaign screenshots: Read the numbers carefully and give a clear, specific diagnosis
- For product mockups: Does it communicate value clearly? Is the positioning obvious?
- Be specific. Do not say "your hook is weak" and stop there. Say exactly why it is weak and exactly what to do instead.

PLATFORM CONTEXT — IMPORTANT:
You are inside Shikshantaram OS, a digital product creation platform for the Indian knowledge economy built by Abhinav. Other tools available to users:
- Product Navigator — generates validated product ideas from a niche
- Niche Clarity — AI-powered niche finder using a 5-question form
- Knowledge Base — upload your expertise documents for personalized product ideas
- Offer Creation — builds complete offers from product ideas

If someone's problem is better solved by one of these tools, point them there by name. Do not just describe what they should do manually when a tool can do it for them.

WHAT YOU STAND FOR:
Hard work plus right guidance plus right resources equals real results. No shortcuts. But with the right framework, people do not have to figure everything out from scratch alone. That is exactly why Shikshantaram OS exists. And that is why you exist inside it. Right?`

const CREDIT_COST_TEXT = 3
const CREDIT_COST_IMAGE = 6

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
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
      { global: { headers: { Authorization: authHeader } } }
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate via getClaims (fast, local, tolerates brief refresh window) with getUser fallback
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

    const { data: creditResult, error: creditError } = await supabase.rpc('deduct_chat_credits', {
      p_user_id: user.id, p_amount: creditCost,
    })

    if (creditError) {
      console.error('Credit RPC error:', creditError)
      return new Response(JSON.stringify({ error: 'Credit check failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!creditResult?.success) {
      return new Response(JSON.stringify({
        error: 'insufficient_credits',
        required: creditCost,
        balance: creditResult?.balance ?? 0,
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

    const anthropicMessages: any[] = []
    if (history && history.length > 0) {
      for (const msg of history) {
        anthropicMessages.push({ role: msg.role, content: msg.content })
      }
    }

    const userContent: any[] = []
    if (hasImages) {
      for (const img of images) {
        if (img.data && img.media_type) {
          userContent.push({
            type: 'image',
            source: { type: 'base64', media_type: img.media_type, data: img.data },
          })
        }
      }
    }
    userContent.push({ type: 'text', text: message.trim() })
    anthropicMessages.push({ role: 'user', content: userContent })

    await supabaseAdmin.from('chat_messages').insert({
      session_id: currentSessionId,
      user_id: user.id,
      role: 'user',
      content: message.trim(),
      image_urls: [],
    })

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
    const encoder = new TextEncoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ session_id: currentSessionId })}\n\n`))

          const anthropicStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-5',
            max_tokens: 1024,
            system: ABHINAV_SYSTEM_PROMPT,
            messages: anthropicMessages,
          })

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullResponse += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          await supabaseAdmin.from('chat_messages').insert({
            session_id: currentSessionId,
            user_id: user.id,
            role: 'assistant',
            content: fullResponse,
            image_urls: [],
          })

          if (is_new_session || !session_id) {
            try {
              const titleResponse = await anthropic.messages.create({
                model: 'claude-haiku-4-5',
                max_tokens: 20,
                messages: [{
                  role: 'user',
                  content: `Generate a 4 to 6 word title for a conversation that started with this message: "${message.trim().slice(0, 200)}". Reply with ONLY the title. No quotes. No punctuation at the end.`,
                }],
              })
              const generatedTitle = titleResponse.content[0].type === 'text'
                ? titleResponse.content[0].text.trim() : 'New Chat'

              await supabaseAdmin.from('chat_sessions')
                .update({ title: generatedTitle, updated_at: new Date().toISOString() })
                .eq('id', currentSessionId)

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ session_title: generatedTitle })}\n\n`))
            } catch (titleError) {
              console.error('Title generation failed:', titleError)
            }
          } else {
            await supabaseAdmin.from('chat_sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', currentSessionId)
          }

          try {
            await supabaseAdmin.from('ai_usage_logs').insert({
              user_id: user.id,
              user_email: user.email,
              module: 'ask_abhinav_ai',
              call_type: hasImages ? 'chat_image' : 'chat_text',
              model: 'claude-sonnet-4-5',
              input_tokens: 0,
              output_tokens: 0,
              total_tokens: 0,
              estimated_cost_usd: 0,
              logged_from: 'edge',
            })
          } catch (logError) {
            console.error('Usage log failed:', logError)
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (streamError: any) {
          console.error('Streaming error:', streamError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: streamError.message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('ask-abhinav-ai error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
