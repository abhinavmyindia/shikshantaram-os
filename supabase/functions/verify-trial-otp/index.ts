import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId ?? '').trim();
    const otp = String(body.otp ?? '').trim();

    if (!requestId || !otp) throw new Error('requestId and otp are required.');
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) throw new Error('OTP must be a 6-digit number.');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: record, error } = await supabase
      .from('trial_requests')
      .select('id, otp_code, otp_expires_at, otp_verified')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !record) throw new Error('Request not found.');

    if (record.otp_verified) {
      return new Response(JSON.stringify({ success: true, alreadyVerified: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!record.otp_expires_at || new Date(record.otp_expires_at) < new Date()) {
      throw new Error('OTP has expired. Please start over.');
    }
    if (record.otp_code !== otp) throw new Error('Incorrect OTP. Please try again.');

    await supabase
      .from('trial_requests')
      .update({ otp_verified: true, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
