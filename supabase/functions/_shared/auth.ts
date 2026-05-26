// Shared JWT auth helpers for edge functions.
// All Lovable-managed edge functions run with verify_jwt = false by default,
// so we validate the Bearer token ourselves using auth.getClaims().

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AuthCaller = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  isOwner: boolean;
};

/**
 * Verify the Authorization header and return the caller's identity.
 * Returns null when the token is missing/invalid.
 */
export async function verifyCaller(req: Request): Promise<AuthCaller | null> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  const userId = String(data.claims.sub);
  const email = (data.claims.email as string | undefined) ?? null;

  // Look up admin role using service role (read-only check).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  const { data: adminRow } = await admin
    .from('admin_users')
    .select('role, is_owner')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    userId,
    email,
    isAdmin: !!adminRow,
    adminRole: adminRow?.role ?? null,
    isOwner: !!adminRow?.is_owner,
  };
}

export const unauthorized = (corsHeaders: Record<string, string>, msg = 'Unauthorized') =>
  new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const forbidden = (corsHeaders: Record<string, string>, msg = 'Forbidden') =>
  new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
