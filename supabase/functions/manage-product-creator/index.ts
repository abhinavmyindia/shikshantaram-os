import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MONTHLY_LIMIT = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;
    const yearMonth = new Date().toISOString().slice(0, 7);

    if (action === "get_config") {
      const { product_type } = body;
      if (!["ebook", "mindmap"].includes(product_type)) {
        return new Response(JSON.stringify({ error: "Invalid product_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: config, error: configError } = await supabase
        .from("product_creator_configs")
        .select("embed_url")
        .eq("product_type", product_type)
        .eq("is_active", true)
        .maybeSingle();

      if (configError || !config) {
        return new Response(JSON.stringify({ error: "Configuration not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: usage } = await supabase
        .from("product_creator_monthly_usage")
        .select("ebook_count, mindmap_count")
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      const countField = product_type === "ebook" ? "ebook_count" : "mindmap_count";
      const currentCount = (usage as any)?.[countField] ?? 0;

      if (currentCount >= MONTHLY_LIMIT) {
        return new Response(JSON.stringify({
          limit_reached: true,
          message: `You have used all ${MONTHLY_LIMIT} ${product_type === "ebook" ? "ebook" : "mind map"} creations for this month. Resets on the 1st.`,
          current_count: currentCount, limit: MONTHLY_LIMIT, remaining: 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        embed_url: config.embed_url,
        current_count: currentCount,
        limit: MONTHLY_LIMIT,
        remaining: MONTHLY_LIMIT - currentCount,
        limit_reached: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "start") {
      const { product_type, product_name, author_name, country, niche, source } = body;
      if (!["ebook", "mindmap"].includes(product_type) || !product_name) {
        return new Response(JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: usage } = await supabase
        .from("product_creator_monthly_usage")
        .select("ebook_count, mindmap_count")
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      const countField = product_type === "ebook" ? "ebook_count" : "mindmap_count";
      const currentCount = (usage as any)?.[countField] ?? 0;

      if (currentCount >= MONTHLY_LIMIT) {
        return new Response(JSON.stringify({
          error: "monthly_limit_reached",
          message: `You have used all ${MONTHLY_LIMIT} creations for ${product_type === "ebook" ? "ebooks" : "mind maps"} this month.`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: product, error: insertError } = await supabase
        .from("user_products")
        .insert({
          user_id: user.id,
          product_type,
          product_name,
          author_name: author_name || null,
          country: country || null,
          niche: niche || null,
          source: source || "manual",
          status: "in_progress",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      supabase.from("edge_function_logs").insert({
        function_name: "manage-product-creator",
        user_id: user.id,
        action: "start_product",
        metadata: { product_type, product_id: product.id },
      }).then(() => {}, () => {});

      return new Response(JSON.stringify({
        success: true,
        product_id: product.id,
        remaining: MONTHLY_LIMIT - currentCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "complete") {
      const { product_id } = body;
      if (!product_id) {
        return new Response(JSON.stringify({ error: "Missing product_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: product, error: fetchError } = await supabase
        .from("user_products")
        .select("*")
        .eq("id", product_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError || !product) {
        return new Response(JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (product.status === "completed") {
        return new Response(JSON.stringify({ success: true, message: "Already completed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase
        .from("user_products")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", product_id)
        .eq("user_id", user.id);

      const countField = product.product_type === "ebook" ? "ebook_count" : "mindmap_count";
      const { data: existingUsage } = await supabase
        .from("product_creator_monthly_usage")
        .select("id, ebook_count, mindmap_count")
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      if (existingUsage) {
        await supabase
          .from("product_creator_monthly_usage")
          .update({
            [countField]: (existingUsage as any)[countField] + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingUsage.id);
      } else {
        await supabase.from("product_creator_monthly_usage").insert({
          user_id: user.id,
          year_month: yearMonth,
          ebook_count: product.product_type === "ebook" ? 1 : 0,
          mindmap_count: product.product_type === "mindmap" ? 1 : 0,
        });
      }

      const { data: updatedUsage } = await supabase
        .from("product_creator_monthly_usage")
        .select("ebook_count, mindmap_count")
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      const newCount = (updatedUsage as any)?.[countField] ?? 1;

      supabase.from("edge_function_logs").insert({
        function_name: "manage-product-creator",
        user_id: user.id,
        action: "complete_product",
        metadata: { product_type: product.product_type, product_id },
      }).then(() => {}, () => {});

      return new Response(JSON.stringify({
        success: true,
        new_count: newCount,
        remaining: MONTHLY_LIMIT - newCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { product_id } = body;
      if (!product_id) {
        return new Response(JSON.stringify({ error: "Missing product_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("user_products").delete()
        .eq("id", product_id).eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
