import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getVerifiedUser, unauthorized } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getVerifiedUser(req);
  if (!caller) return unauthorized(corsHeaders);

  try {
    const { docId } = await req.json();
    const userId = caller.userId; // never trust a userId from the request body
    if (!docId) throw new Error('docId required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Get storage path before deleting DB record
    const { data: doc } = await supabase
      .from('user_knowledge_docs')
      .select('storage_path')
      .eq('id', docId)
      .eq('user_id', userId)
      .single();

    // Delete from Storage
    if (doc?.storage_path) {
      await supabase.storage
        .from('knowledge-documents')
        .remove([doc.storage_path]);
    }

    // Delete DB record
    await supabase
      .from('user_knowledge_docs')
      .delete()
      .eq('id', docId)
      .eq('user_id', userId);

    return new Response(JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
