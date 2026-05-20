import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("[upsert-presence] Auth error:", userErr?.message);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const email = userData.user.email;

    const { current_page, user_name, session_start } = await req.json();

    // Use service role to bypass RLS — server-validated write
    const adminClient = createClient(supabaseUrl, serviceRole);

    const { error: upsertErr } = await adminClient
      .from("user_presence")
      .upsert(
        {
          user_id: userId,
          user_email: email || null,
          user_name: user_name || email?.split("@")[0] || "Unknown",
          last_seen: new Date().toISOString(),
          current_page: current_page || "dashboard",
          session_start: session_start || new Date().toISOString(),
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      );

    if (upsertErr) {
      console.error("[upsert-presence] DB error:", upsertErr.message);
      return new Response(
        JSON.stringify({ success: false, error: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[upsert-presence] Crash:", err.message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
