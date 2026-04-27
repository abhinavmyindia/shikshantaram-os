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

  const { email, full_name, access_tier, temp_password, login_url } = await req.json();

  const TIER_LABELS: Record<string, string> = { basic: "Basic", premium: "Premium", beta: "Beta", trial: "Trial" };
  const TIER_COLORS: Record<string, string> = { basic: "#059669", premium: "#7c3aed", beta: "#ec4899", trial: "#0284c7" };
  const tierKey = String(access_tier || "basic").toLowerCase();
  const tierLabel = TIER_LABELS[tierKey] || "Basic";
  const tierColor = TIER_COLORS[tierKey] || "#059669";
  const toolsLine = tierKey === "basic"
    ? "You currently have access to Niche Clarity and Product Navigator."
    : tierKey === "beta"
    ? "You have full Beta access to all tools — including early previews."
    : tierKey === "trial"
    ? "You have time-limited Trial access to Niche Clarity and Product Navigator."
    : "You have full access to all unlocked tools in Shikshantaram OS.";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'DM Sans',Arial,sans-serif;background:#f5f3ff;padding:40px 20px;">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,${tierColor},#a855f7);padding:32px 28px;text-align:center;">
<div style="font-family:Sora,sans-serif;font-weight:900;font-size:20px;color:white;">Shikshantaram OS</div>
</div>
<div style="padding:28px;">
<div style="display:inline-block;background:${tierColor};color:white;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:16px;">${tierLabel} Access</div>
<h2 style="font-family:Sora,sans-serif;font-weight:800;font-size:22px;color:#0f172a;margin:0 0 12px;">Welcome, ${full_name}! 🎉</h2>
<p style="font-size:14px;color:#64748b;line-height:1.7;">${toolsLine}</p>
<div style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
<div style="font-size:13px;color:#64748b;margin-bottom:6px;"><strong>Email:</strong> ${email}</div>
<div style="font-size:13px;color:#64748b;"><strong>Temp Password:</strong> ${temp_password}</div>
</div>
<a href="${login_url}" style="display:block;text-align:center;background:linear-gradient(135deg,${tierColor},#a855f7);color:white;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px;">🚀 Log In to Shikshantaram OS →</a>
<p style="font-size:11px;color:#94a3b8;margin-top:12px;text-align:center;">⚠️ Please change your password after first login.</p>
</div>
</div></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Shikshantaram OS <auth@shikshantaram.in>",
      to: [email],
      subject: `🎉 Your Shikshantaram OS Access is Ready — ${tierLabel} Plan`,
      html,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.ok ? 200 : 400 });
});
