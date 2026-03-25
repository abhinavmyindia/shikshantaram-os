import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const { error, count } = await supabase
    .from('recent_work')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date().toISOString());

  console.log(`Cleaned up ${count || 0} expired recent_work records`);

  return new Response(
    JSON.stringify({ success: !error, deleted: count || 0, error: error?.message }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
