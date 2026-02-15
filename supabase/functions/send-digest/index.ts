import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASSET_BRANDS: Record<string, { name: string; icon: string; color: string; colorDark: string }> = {
  crypto: { name: "CryptoSimply", icon: "🪙", color: "#0891b2", colorDark: "#e0f7fa" },
  stocks: { name: "StockSimply", icon: "📈", color: "#16a34a", colorDark: "#e8f5e9" },
  etfs: { name: "ETFSimply", icon: "📊", color: "#d97706", colorDark: "#fff8e1" },
  forex: { name: "ForexSimply", icon: "💱", color: "#7c3aed", colorDark: "#f3e8ff" },
};

const LOGO_URL = "https://xusgljsdrntbqzxkmlcu.supabase.co/storage/v1/object/public/email-assets/logo-header.svg";
const APP_URL = "https://forecastsimply.lovable.app";

function sentimentBadge(s: string) {
  if (s === "bullish") return '<span style="color:#16a34a;font-weight:600;font-size:11px;background:#dcfce7;padding:2px 8px;border-radius:4px;">▲ BULLISH</span>';
  if (s === "bearish") return '<span style="color:#dc2626;font-weight:600;font-size:11px;background:#fee2e2;padding:2px 8px;border-radius:4px;">▼ BEARISH</span>';
  return '<span style="color:#d97706;font-weight:600;font-size:11px;background:#fef3c7;padding:2px 8px;border-radius:4px;">● NEUTRAL</span>';
}

function buildSegmentHtml(digest: any, assetType: string) {
  const brand = ASSET_BRANDS[assetType] || ASSET_BRANDS.crypto;

  const insights = (digest.insights || [])
    .map(
      (ins: any) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
          <div>
            <strong style="color:#1e293b;font-family:'SF Mono','Fira Code',monospace;font-size:14px;">${ins.asset || ins.name}</strong>
            &nbsp;${sentimentBadge(ins.sentiment)}
          </div>
          <p style="color:#64748b;font-size:13px;margin:6px 0 0;line-height:1.5;">${ins.insight}</p>
        </td>
      </tr>`
    )
    .join("");

  const recs = (digest.recommendations || [])
    .map(
      (r: string) =>
        `<tr><td style="padding:10px 16px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;">
        <span style="color:${brand.color};margin-right:8px;font-weight:700;">→</span>${r}
      </td></tr>`
    )
    .join("");

  const alerts = (digest.watchlist_alerts || [])
    .map(
      (a: string) =>
        `<tr><td style="padding:10px 16px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;">
        <span style="margin-right:8px;">⚡</span>${a}
      </td></tr>`
    )
    .join("");

  return `
    <!-- Segment: ${brand.name} -->
    <tr><td style="background:linear-gradient(135deg,${brand.colorDark} 0%,#ffffff 100%);padding:20px 24px 16px;border-top:2px solid ${brand.color};">
      <div style="font-size:24px;margin-bottom:4px;display:inline-block;vertical-align:middle;">${brand.icon}</div>
      <h2 style="margin:0;display:inline-block;vertical-align:middle;color:${brand.color};font-size:18px;font-weight:700;letter-spacing:-0.3px;margin-left:8px;">
        ${brand.name}
      </h2>
    </td></tr>

    <!-- Summary -->
    <tr><td style="padding:12px 24px 16px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
        <p style="color:#334155;font-size:14px;line-height:1.7;margin:0;">${digest.market_summary || ""}</p>
      </div>
    </td></tr>

    ${insights ? `<tr><td style="padding:0 24px 12px;">
      <p style="color:#94a3b8;font-size:10px;font-family:'SF Mono','Fira Code',monospace;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-weight:600;">Key Insights</p>
      <table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
        ${insights}
      </table>
    </td></tr>` : ""}

    ${recs ? `<tr><td style="padding:0 24px 12px;">
      <p style="color:#94a3b8;font-size:10px;font-family:'SF Mono','Fira Code',monospace;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-weight:600;">Recommendations</p>
      <table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
        ${recs}
      </table>
    </td></tr>` : ""}

    ${alerts ? `<tr><td style="padding:0 24px 16px;">
      <p style="color:#94a3b8;font-size:10px;font-family:'SF Mono','Fira Code',monospace;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;font-weight:600;">Watchlist Alerts</p>
      <table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
        ${alerts}
      </table>
    </td></tr>` : ""}`;
}

function buildCombinedEmailHtml(digests: { digest: any; assetType: string }[]) {
  const dateStr = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const greeting = digests[0]?.digest?.greeting || "Good morning!";
  const primaryBrand = ASSET_BRANDS[digests[0]?.assetType] || ASSET_BRANDS.crypto;
  const typeNames = digests.map(d => ASSET_BRANDS[d.assetType]?.name || d.assetType).join(" · ");
  const segments = digests.map(d => buildSegmentHtml(d.digest, d.assetType)).join(`
    <tr><td style="padding:0;"><div style="height:8px;background:#f1f5f9;"></div></td></tr>
  `);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ForecastSimply Market Digest</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Outfit','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        
        <!-- Logo Bar -->
        <tr><td style="padding:20px 24px 12px;text-align:center;border-bottom:1px solid #f1f5f9;">
          <img src="${LOGO_URL}" alt="ForecastSimply" width="180" height="auto" style="max-width:180px;height:auto;" />
        </td></tr>

        <!-- Header -->
        <tr><td style="padding:24px 24px 16px;text-align:center;border-bottom:1px solid #e2e8f0;">
          <h1 style="margin:0;color:#1e293b;font-size:20px;font-weight:700;letter-spacing:-0.5px;">
            Weekly Market Digest
          </h1>
          <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;font-family:'SF Mono','Fira Code',monospace;">
            ${dateStr}
          </p>
          <p style="margin:8px 0 0;color:#64748b;font-size:11px;">${typeNames}</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:20px 24px 12px;">
          <p style="color:${primaryBrand.color};font-size:15px;font-weight:600;margin:0;">${greeting}</p>
        </td></tr>

        <!-- Segments -->
        ${segments}

        <!-- CTA -->
        <tr><td style="padding:28px 24px;text-align:center;">
          <a href="${APP_URL}" style="display:inline-block;background:#1e293b;color:#ffffff;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
            Open ForecastSimply →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <img src="${LOGO_URL}" alt="ForecastSimply" width="100" style="max-width:100px;height:auto;opacity:0.5;margin-bottom:8px;" />
          <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
            You're receiving this because you subscribed to ForecastSimply Market Digest.<br>
            <a href="${APP_URL}" style="color:#1e293b;text-decoration:none;">Manage preferences</a>
          </p>
          <p style="color:#cbd5e1;font-size:10px;margin:8px 0 0;">© ${new Date().getFullYear()} ForecastSimply. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Keep single-digest version for previews
function buildEmailHtml(digest: any, assetType: string) {
  return buildCombinedEmailHtml([{ digest, assetType }]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if this is a cron (no auth header) or admin request
    const authHeader = req.headers.get("Authorization");
    const isCron = !authHeader || authHeader === `Bearer ${supabaseKey}`;

    const adminClient = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body for cron */ }
    const action = body?.action || (isCron ? "auto_generate_and_send" : "");

    // For non-cron requests, verify admin
    if (!isCron) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await adminClient
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Admin actions
      if (action === "preview") {
        const { digest_id } = body;
        const { data: digest } = await adminClient
          .from("market_digests").select("*").eq("id", digest_id).single();
        if (!digest) {
          return new Response(JSON.stringify({ error: "Digest not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ html: buildEmailHtml(digest, digest.asset_type) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "send_test") {
        const { data: digests } = await adminClient
          .from("market_digests").select("*").eq("status", "approved");
        if (!digests?.length) {
          return new Response(JSON.stringify({ error: "No approved digests to send" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const results = digests.map((d: any) => ({
          asset_type: d.asset_type,
          subject: `${ASSET_BRANDS[d.asset_type]?.name || "ForecastSimply"} Market Digest - ${new Date().toLocaleDateString("en-AU")}`,
          html: buildEmailHtml(d, d.asset_type),
        }));
        return new Response(JSON.stringify({ sent_to: user.email, digests: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Auto-generate and store weekly digests (cron or manual trigger) ──
    if (action === "auto_generate_and_send") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const assetTypes = ["crypto", "stocks", "etfs", "forex"];
      const MARKET_EXCHANGES: Record<string, { label: string; stocks: string; etfs: string }> = {
        AU: { label: "Australia (ASX)", stocks: "CBA, BHP, CSL, WES, NAB, WBC, ANZ, FMG", etfs: "VGS, VAS, IVV, VDHG, A200" },
        US: { label: "United States", stocks: "AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, JPM", etfs: "SPY, QQQ, VTI, VOO, ARKK" },
        UK: { label: "United Kingdom (LSE)", stocks: "SHEL, AZN, HSBA, ULVR, BP, GSK, RIO", etfs: "VWRL, ISF, VUSA, SGLN" },
        HK: { label: "Hong Kong (HKSE)", stocks: "Tencent, Alibaba, HSBC HK, AIA, Meituan, China Mobile", etfs: "" },
        EU: { label: "Europe (XETRA)", stocks: "SAP, Siemens, Allianz, Deutsche Telekom, BASF, Mercedes-Benz, BMW, Adidas", etfs: "" },
        CA: { label: "Canada (TSE)", stocks: "Royal Bank, TD Bank, Shopify, Enbridge, CN Rail", etfs: "" },
        JP: { label: "Japan (JPX)", stocks: "Toyota, Sony, Keyence, SoftBank, MUFG, Hitachi", etfs: "" },
      };
      const allMarkets = Object.keys(MARKET_EXCHANGES);
      const results: string[] = [];

      for (const assetType of assetTypes) {
        try {
          // Build market context for stocks/etfs digests
          let marketContext = "";
          if (assetType === "stocks" || assetType === "etfs") {
            const marketLines = allMarkets.map(mk => {
              const info = MARKET_EXCHANGES[mk];
              const items = assetType === "stocks" ? info.stocks : info.etfs;
              return items ? `- ${info.label}: ${items}` : null;
            }).filter(Boolean).join("\n");
            marketContext = `\n\nCover these global markets and their key assets:\n${marketLines}\n\nGroup insights by market/region.`;
          }

          // Generate digest with AI
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `You are ForecastSimply's market insights AI. Generate a weekly market digest for ${ASSET_BRANDS[assetType]?.name || assetType} covering major market movements, trends, and actionable insights. Today is ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. Be concise, data-driven, and professional.${marketContext}

Format as JSON:
{
  "greeting": "Short greeting for the week",
  "market_summary": "2-3 sentence overview of the week's ${assetType} market activity",
  "insights": [
    {"asset": "SYMBOL", "name": "Full Name", "type": "${assetType}", "insight": "Key development this week", "sentiment": "bullish|bearish|neutral", "market": "AU|US|UK|HK|EU|CA|JP"}
  ],
  "recommendations": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
  "watchlist_alerts": ["Notable alert about a trending asset"]
}

Include 3-5 insights for the most important ${assetType} assets this week. For stocks/etfs, include the "market" field to indicate which region the asset belongs to.`,
                },
                {
                  role: "user",
                  content: `Generate this week's ${ASSET_BRANDS[assetType]?.name} Market Digest with the latest market movements and trends.`,
                },
              ],
            }),
          });

          if (!aiResponse.ok) {
            results.push(`${assetType}: AI error ${aiResponse.status}`);
            continue;
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";

          let digest;
          try {
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
            digest = JSON.parse(jsonStr);
          } catch {
            digest = {
              greeting: "Good morning!",
              market_summary: content.slice(0, 300),
              insights: [],
              recommendations: [],
              watchlist_alerts: [],
            };
          }

          // Unpublish old approved digests of this type
          await adminClient
            .from("market_digests")
            .update({ status: "draft" })
            .eq("asset_type", assetType)
            .eq("status", "approved");

          // Get an admin user id for created_by
          const { data: adminRole } = await adminClient
            .from("user_roles").select("user_id").eq("role", "admin").limit(1).single();

          // Insert new approved digest
          await adminClient.from("market_digests").insert({
            asset_type: assetType,
            status: "approved",
            greeting: digest.greeting,
            market_summary: digest.market_summary,
            insights: digest.insights,
            recommendations: digest.recommendations,
            watchlist_alerts: digest.watchlist_alerts,
            created_by: adminRole?.user_id || "00000000-0000-0000-0000-000000000000",
            approved_at: new Date().toISOString(),
            approved_by: adminRole?.user_id || null,
          });

          results.push(`${assetType}: ✅ generated & approved`);
        } catch (e) {
          results.push(`${assetType}: ❌ ${e instanceof Error ? e.message : "error"}`);
        }
      }

      // Now send emails to all active newsletter subscribers
      const { data: subscribers } = await adminClient
        .from("newsletter_subscribers")
        .select("email, preferences")
        .is("unsubscribed_at", null);

      const { data: approvedDigests } = await adminClient
        .from("market_digests")
        .select("*")
        .eq("status", "approved");

      let emailsSent = 0;
      if (subscribers?.length && approvedDigests?.length) {
        // Order: crypto, stocks, etfs, forex
        const typeOrder = ["crypto", "stocks", "etfs", "forex"];

        for (const sub of subscribers) {
          const prefs = (sub.preferences as any) || { crypto: true, stocks: true, etfs: true, forex: true, markets: ["AU"] };
          const userMarkets: string[] = Array.isArray(prefs.markets) ? prefs.markets : ["AU"];
          const relevantDigests = approvedDigests
            .filter((d: any) => prefs[d.asset_type] !== false)
            .sort((a: any, b: any) => typeOrder.indexOf(a.asset_type) - typeOrder.indexOf(b.asset_type))
            // Filter insights within each digest to only include user's selected markets
            .map((d: any) => {
              if (d.asset_type === "crypto" || d.asset_type === "forex") return d; // global, no market filter
              const filteredInsights = (d.insights || []).filter((ins: any) => !ins.market || userMarkets.includes(ins.market));
              return { ...d, insights: filteredInsights };
            });

          if (!relevantDigests.length) continue;

          try {
            // Build ONE combined email with all subscribed segments
            const segments = relevantDigests.map((d: any) => ({ digest: d, assetType: d.asset_type }));
            const html = buildCombinedEmailHtml(segments);

            const typeLabels = relevantDigests.map((d: any) => ASSET_BRANDS[d.asset_type]?.icon || "").join("");
            const subject = `${typeLabels} ForecastSimply Market Digest — ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;

            // Note: Full email delivery requires an email service integration (e.g. Resend)
            // The digests are stored and available in-app via the SmartFeed
            const { error: emailErr } = await adminClient.auth.admin.generateLink({
              type: "magiclink",
              email: sub.email,
              options: {
                data: { digest_types: relevantDigests.map((d: any) => d.asset_type) },
              },
            });

            emailsSent++;
          } catch {
            // Email delivery best-effort
          }
        }
      }

      return new Response(JSON.stringify({
        status: "complete",
        results,
        subscribers_count: subscribers?.length || 0,
        digests_generated: results.filter(r => r.includes("✅")).length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-digest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
