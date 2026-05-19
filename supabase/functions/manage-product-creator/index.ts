import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MONTHLY_LIMIT = 5;
const VALID_TYPES = ["nonfiction_book", "mindmap", "fiction_book", "course", "checklist", "colouring_book"];

const LABEL_MAP: Record<string, string> = {
  nonfiction_book: "Non Fiction Books",
  mindmap: "Mind Maps",
  fiction_book: "Fiction Books",
  course: "Courses",
  checklist: "Checklists",
  colouring_book: "Colouring Books",
};

function countFieldFor(product_type: string): string {
  switch (product_type) {
    case "nonfiction_book": return "nonfiction_book_count";
    case "fiction_book":    return "fiction_book_count";
    case "course":          return "course_count";
    case "checklist":       return "checklist_count";
    case "colouring_book":  return "colouring_book_count";
    default:                return "mindmap_count";
  }
}

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
      if (!VALID_TYPES.includes(product_type)) {
        return new Response(JSON.stringify({ error: "Invalid product_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: config, error: configError } = await supabase
        .from("product_creator_configs")
        .select("embed_url, is_active")
        .eq("product_type", product_type)
        .eq("is_active", true)
        .maybeSingle();

      if (configError || !config || !config.embed_url) {
        return new Response(JSON.stringify({ error: "coming_soon", message: `${LABEL_MAP[product_type]} is coming soon.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const countField = countFieldFor(product_type);
      const { data: usage } = await supabase
        .from("product_creator_monthly_usage")
        .select(countField)
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      const currentCount = (usage as any)?.[countField] ?? 0;
      const label = LABEL_MAP[product_type];

      if (currentCount >= MONTHLY_LIMIT) {
        return new Response(JSON.stringify({
          limit_reached: true,
          label,
          message: `You have used all ${MONTHLY_LIMIT} ${label} creations for this month. Resets on the 1st.`,
          current_count: currentCount, limit: MONTHLY_LIMIT, remaining: 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        embed_url: config.embed_url,
        label,
        current_count: currentCount,
        limit: MONTHLY_LIMIT,
        remaining: MONTHLY_LIMIT - currentCount,
        limit_reached: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "start") {
      const { product_type, product_name, author_name, country, niche, source } = body;
      if (!VALID_TYPES.includes(product_type) || !product_name) {
        return new Response(JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: cfg } = await supabase
        .from("product_creator_configs")
        .select("is_active, embed_url")
        .eq("product_type", product_type)
        .maybeSingle();
      if (!cfg?.is_active || !cfg?.embed_url) {
        return new Response(JSON.stringify({ error: "coming_soon", message: `${LABEL_MAP[product_type]} is coming soon.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const countField = countFieldFor(product_type);
      const { data: usage } = await supabase
        .from("product_creator_monthly_usage")
        .select(countField)
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      const currentCount = (usage as any)?.[countField] ?? 0;

      if (currentCount >= MONTHLY_LIMIT) {
        return new Response(JSON.stringify({
          error: "monthly_limit_reached",
          message: `You have used all ${MONTHLY_LIMIT} creations for ${LABEL_MAP[product_type]} this month.`,
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

      const countField = countFieldFor(product.product_type);
      const { data: existingUsage } = await supabase
        .from("product_creator_monthly_usage")
        .select(`id, ${countField}`)
        .eq("user_id", user.id)
        .eq("year_month", yearMonth)
        .maybeSingle();

      if (existingUsage) {
        await supabase
          .from("product_creator_monthly_usage")
          .update({
            [countField]: ((existingUsage as any)[countField] ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existingUsage as any).id);
      } else {
        await supabase.from("product_creator_monthly_usage").insert({
          user_id: user.id,
          year_month: yearMonth,
          [countField]: 1,
        });
      }

      const { data: updatedUsage } = await supabase
        .from("product_creator_monthly_usage")
        .select(countField)
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
        label: LABEL_MAP[product.product_type],
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
