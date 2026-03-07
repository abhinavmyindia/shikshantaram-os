import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { email, full_name, login_url } = await req.json();

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'DM Sans',Arial,sans-serif;background:#f5f3ff;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px 28px;text-align:center;">
<div style="font-size:28px;">⚡</div>
<div style="font-family:Sora,sans-serif;font-weight:800;font-size:18px;color:white;margin-top:8px;">Full Access Unlocked!</div>
</div>
<div style="padding:28px;">
<h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#0f172a;margin:0 0 12px;">You're now Premium, ${full_name}! 🎊</h2>
<p style="font-size:14px;color:#64748b;line-height:1.7;">Your account has been upgraded to Premium Access. You now have full access to all tools as they go live.</p>
<a href="${login_url}" style="display:block;text-align:center;background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;margin-top:20px;">🚀 Open Shikshantaram OS →</a>
</div>
</div></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Shikshantaram OS <auth@shikshantaram.in>",
      to: [email],
      subject: "⚡ Your Shikshantaram OS Premium Access is Live!",
      html,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.ok ? 200 : 400 });
});
