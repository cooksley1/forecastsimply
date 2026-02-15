import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASSET_BRANDS: Record<string, { name: string; icon: string; color: string }> = {
  crypto: { name: "CryptoSimply", icon: "🪙", color: "#00d4ee" },
  stocks: { name: "StockSimply", icon: "📈", color: "#22c55e" },
  etfs: { name: "ETFSimply", icon: "📊", color: "#f59e0b" },
  forex: { name: "ForexSimply", icon: "💱", color: "#8b5cf6" },
};

function sentimentBadge(s: string) {
  if (s === "bullish") return '<span style="color:#22c55e;font-weight:600">▲ BULLISH</span>';
  if (s === "bearish") return '<span style="color:#ef4444;font-weight:600">▼ BEARISH</span>';
  return '<span style="color:#f59e0b;font-weight:600">● NEUTRAL</span>';
}

function buildEmailHtml(digest: any, assetType: string) {
  const brand = ASSET_BRANDS[assetType] || ASSET_BRANDS.crypto;
  const insights = (digest.insights || [])
    .map(
      (ins: any) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #1a2740;">
          <div style="display:flex;align-items:center;gap:8px;">
            <strong style="color:#e2e8f0;font-family:'SF Mono',monospace;font-size:14px;">${ins.asset || ins.name}</strong>
            ${sentimentBadge(ins.sentiment)}
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;line-height:1.5;">${ins.insight}</p>
        </td>
      </tr>`
    )
    .join("");

  const recs = (digest.recommendations || [])
    .map(
      (r: string) =>
        `<tr><td style="padding:8px 16px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #1a2740;">
        <span style="color:${brand.color};margin-right:8px;">→</span>${r}
      </td></tr>`
    )
    .join("");

  const alerts = (digest.watchlist_alerts || [])
    .map(
      (a: string) =>
        `<tr><td style="padding:8px 16px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #1a2740;">
        <span style="margin-right:8px;">⚡</span>${a}
      </td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05090f;font-family:'Outfit','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05090f;padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#0c1220;border:1px solid #1a2740;border-radius:16px;overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#05090f 0%,#0c1a2e 100%);padding:32px 24px;text-align:center;border-bottom:1px solid #1a2740;">
          <div style="font-size:28px;margin-bottom:8px;">${brand.icon}</div>
          <h1 style="margin:0;color:${brand.color};font-size:22px;font-weight:700;letter-spacing:-0.5px;">
            ${brand.name} Market Digest
          </h1>
          <p style="margin:8px 0 0;color:#64748b;font-size:12px;font-family:'SF Mono',monospace;">
            by ForecastSimply · ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:24px 24px 8px;">
          <p style="color:${brand.color};font-size:14px;font-weight:600;margin:0;">${digest.greeting || "Good morning!"}</p>
        </td></tr>

        <!-- Market Summary -->
        <tr><td style="padding:8px 24px 20px;">
          <div style="background:#111827;border:1px solid #1a2740;border-radius:12px;padding:16px;">
            <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;">${digest.market_summary || ""}</p>
          </div>
        </td></tr>

        ${
          insights
            ? `<!-- Insights -->
        <tr><td style="padding:0 24px;">
          <p style="color:#64748b;font-size:10px;font-family:'SF Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Key Insights</p>
          <table width="100%" style="background:#111827;border:1px solid #1a2740;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            ${insights}
          </table>
        </td></tr>`
            : ""
        }

        ${
          recs
            ? `<!-- Recommendations -->
        <tr><td style="padding:20px 24px 0;">
          <p style="color:#64748b;font-size:10px;font-family:'SF Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Recommendations</p>
          <table width="100%" style="background:#111827;border:1px solid #1a2740;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            ${recs}
          </table>
        </td></tr>`
            : ""
        }

        ${
          alerts
            ? `<!-- Alerts -->
        <tr><td style="padding:20px 24px 0;">
          <p style="color:#64748b;font-size:10px;font-family:'SF Mono',monospace;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Alerts</p>
          <table width="100%" style="background:#111827;border:1px solid #1a2740;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            ${alerts}
          </table>
        </td></tr>`
            : ""
        }

        <!-- CTA -->
        <tr><td style="padding:24px;text-align:center;">
          <a href="https://forecastsimply.lovable.app" style="display:inline-block;background:${brand.color};color:#05090f;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
            Open ForecastSimply
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #1a2740;">
          <p style="color:#475569;font-size:11px;margin:0;line-height:1.6;">
            You're receiving this because you subscribed to ${brand.name} Market Digest.<br>
            <a href="https://forecastsimply.lovable.app" style="color:${brand.color};text-decoration:none;">Manage preferences</a>
          </p>
          <p style="color:#334155;font-size:10px;margin:8px 0 0;">© ${new Date().getFullYear()} ForecastSimply. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Action: preview - return HTML for a digest
    if (action === "preview") {
      const { digest_id } = body;
      const { data: digest, error: dErr } = await supabase
        .from("market_digests")
        .select("*")
        .eq("id", digest_id)
        .single();
      if (dErr || !digest) {
        return new Response(JSON.stringify({ error: "Digest not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const html = buildEmailHtml(digest, digest.asset_type);
      return new Response(JSON.stringify({ html }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: send_test - email all 4 approved digests to the admin
    if (action === "send_test") {
      const { data: digests } = await supabase
        .from("market_digests")
        .select("*")
        .eq("status", "approved");

      if (!digests || digests.length === 0) {
        return new Response(JSON.stringify({ error: "No approved digests to send" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      // Use Supabase Auth admin to get user email
      const adminEmail = user.email;
      if (!adminEmail) {
        return new Response(JSON.stringify({ error: "No email on admin account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send each digest as a separate email via Supabase's built-in email
      // Since we don't have a dedicated email service, we'll return the HTML for download/preview
      const results = digests.map((d: any) => ({
        asset_type: d.asset_type,
        subject: `${ASSET_BRANDS[d.asset_type]?.name || "ForecastSimply"} Market Digest - ${new Date().toLocaleDateString("en-AU")}`,
        html: buildEmailHtml(d, d.asset_type),
      }));

      return new Response(JSON.stringify({ sent_to: adminEmail, digests: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-digest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
