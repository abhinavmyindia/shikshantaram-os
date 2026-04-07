import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

  try {
    const {
      userId, filename, fileType,
      fileBase64, extractedText, fileSizeBytes,
    } = await req.json();

    if (!userId || !filename || !fileBase64)
      throw new Error('userId, filename, and fileBase64 are required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Upload to Storage
    const fileBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    const storageKey = `${userId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const mimeType = fileType === 'pdf'
      ? 'application/pdf'
      : fileType === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'text/plain';

    const { error: uploadError } = await supabase.storage
      .from('knowledge-documents')
      .upload(storageKey, fileBytes, { contentType: mimeType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Quick tag extraction with Haiku
    let tags: string[] = [];
    let summary = '';
    let detectedNiche = '';
    const textToAnalyse = (extractedText || '').slice(0, 8000);

    if (textToAnalyse.length > 100) {
      try {
        const tagResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: 'Extract expertise tags from documents. Respond with JSON only.',
            messages: [{
              role: 'user',
              content: `From this document excerpt, extract:
1. expertise_tags: array of 5-8 specific skill/knowledge keywords
2. summary: 2 sentences summarising what this person knows
3. detected_niche: the primary niche category

Document:
${textToAnalyse}

Return ONLY: { "expertise_tags": [...], "summary": "...", "detected_niche": "..." }`,
            }],
          }),
        });

        if (tagResponse.ok) {
          const tagData = await tagResponse.json();
          const tagRaw = tagData.content[0].text.replace(/```json|```/g, '').trim();
          const tagResult = JSON.parse(tagRaw);
          tags = tagResult.expertise_tags || [];
          summary = tagResult.summary || '';
          detectedNiche = tagResult.detected_niche || '';
        }
      } catch (_) {}
    }

    // Save to DB
    const { data: docRecord, error: dbError } = await supabase
      .from('user_knowledge_docs')
      .insert({
        user_id: userId,
        filename,
        storage_path: storageKey,
        file_type: fileType,
        file_size_bytes: fileSizeBytes || fileBytes.length,
        extracted_text: extractedText || null,
        expertise_tags: tags,
        detected_niche: detectedNiche,
        summary,
        is_active: true,
      })
      .select('id, filename, expertise_tags, detected_niche, summary, created_at')
      .single();

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

    return new Response(JSON.stringify({
      success: true, doc: docRecord, tags, summary, detectedNiche,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('save-knowledge-doc error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
