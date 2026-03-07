import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify caller auth
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: adminRow } = await adminClient.from('admin_users').select('user_id').eq('user_id', caller.id).single();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Not an admin' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, full_name, phone, access_tier, payment_amount, notes, is_beta_user } = await req.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // Generate temp password
    const tempPassword = 'Shk' + Math.random().toString(36).slice(2, 9).toUpperCase();

    // Create user with service role
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      const isDuplicateEmail = authError.message?.toLowerCase().includes('already been registered');
      if (isDuplicateEmail) {
        return new Response(JSON.stringify({
          success: false,
          already_exists: true,
          error: 'A user with this email address has already been registered',
          email: normalizedEmail,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update the auto-created profile with full details
    await adminClient.from('user_profiles').update({
      full_name,
      phone: phone || '',
      access_tier,
      payment_status: access_tier === 'beta' ? 'beta' : access_tier === 'premium' ? 'paid' : 'reserved',
      payment_amount: payment_amount || 0,
      added_by: 'admin',
      notes: notes || '',
      is_beta_user: is_beta_user || false,
    }).eq('id', authData.user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: authData.user.id,
      temp_password: tempPassword,
      email 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
