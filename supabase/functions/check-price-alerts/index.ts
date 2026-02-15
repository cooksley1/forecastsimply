import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceAlert {
  id: string;
  user_id: string;
  asset_id: string;
  asset_type: string;
  symbol: string;
  name: string;
  alert_type: string;
  target_price: number | null;
  target_pct: number | null;
  reference_price: number | null;
}

interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Fetch current price for a crypto asset via CoinGecko simple/price
async function getCryptoPrice(coinId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`);
    if (!res.ok) return null;
    const data = await res.json();
    return data[coinId]?.usd ?? null;
  } catch { return null; }
}

// Fetch current price for a stock/ETF via Yahoo Finance
async function getStockPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

// Fetch forex rate via Frankfurter
async function getForexPrice(pair: string): Promise<number | null> {
  try {
    const from = pair.slice(0, 3).toUpperCase();
    const to = pair.slice(3, 6).toUpperCase();
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates?.[to] ?? null;
  } catch { return null; }
}

function isTriggered(alert: PriceAlert, currentPrice: number): boolean {
  switch (alert.alert_type) {
    case "above":
      return alert.target_price != null && currentPrice >= alert.target_price;
    case "below":
      return alert.target_price != null && currentPrice <= alert.target_price;
    case "pct_up":
      if (alert.reference_price == null || alert.target_pct == null) return false;
      return currentPrice >= alert.reference_price * (1 + alert.target_pct / 100);
    case "pct_down":
      if (alert.reference_price == null || alert.target_pct == null) return false;
      return currentPrice <= alert.reference_price * (1 - alert.target_pct / 100);
    default:
      return false;
  }
}

function buildNotificationBody(alert: PriceAlert, currentPrice: number): { title: string; body: string } {
  const priceStr = currentPrice < 1 ? currentPrice.toPrecision(4) : currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const direction = alert.alert_type === "above" || alert.alert_type === "pct_up" ? "📈" : "📉";
  return {
    title: `${direction} ${alert.name} (${alert.symbol}) Alert`,
    body: alert.alert_type.startsWith("pct")
      ? `${alert.symbol} moved ${alert.target_pct}% ${alert.alert_type === "pct_up" ? "up" : "down"} — now $${priceStr}`
      : `${alert.symbol} hit $${priceStr} (target: $${alert.target_price?.toLocaleString()})`,
  };
}

// Minimal Web Push using raw crypto APIs (no external lib needed)
async function sendWebPush(sub: PushSub, payload: string, vapidPublic: string, vapidPrivate: string, vapidSubject: string) {
  // Use the built-in web push support via fetch to the endpoint
  // For simplicity, we'll use a lightweight approach
  const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
  
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    payload
  );
}

// Send email alert using Supabase's built-in SMTP (via edge function)
async function sendAlertEmail(supabaseUrl: string, serviceKey: string, email: string, notification: { title: string; body: string }) {
  try {
    // Use Supabase's auth.admin to send a "magic link" style email with alert content
    // Alternative: direct SMTP. For now, log it — full email requires SMTP/Resend setup.
    console.log(`📧 Email alert to ${email}: ${notification.title} — ${notification.body}`);
    
    // Store notification for in-app display as fallback
    const client = createClient(supabaseUrl, serviceKey);
    // We could create a notifications table, but for now the triggered_at field 
    // on price_alerts serves as the in-app notification marker
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = "mailto:alerts@forecastsimply.app";

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all active alerts
    const { data: alerts, error: alertErr } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("active", true);

    if (alertErr) throw alertErr;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ checked: 0, triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Group by asset to avoid duplicate price fetches
    const assetMap = new Map<string, { type: string; alerts: PriceAlert[] }>();
    for (const a of alerts) {
      const key = `${a.asset_type}:${a.asset_id}`;
      if (!assetMap.has(key)) assetMap.set(key, { type: a.asset_type, alerts: [] });
      assetMap.get(key)!.alerts.push(a);
    }

    // 3. Fetch prices and check triggers
    let triggered = 0;
    for (const [assetKey, { type, alerts: assetAlerts }] of assetMap) {
      const assetId = assetAlerts[0].asset_id;
      let price: number | null = null;

      if (type === "crypto") price = await getCryptoPrice(assetId);
      else if (type === "stocks" || type === "etfs") price = await getStockPrice(assetAlerts[0].symbol);
      else if (type === "forex") price = await getForexPrice(assetId);

      if (price == null) {
        console.warn(`Could not fetch price for ${assetKey}`);
        continue;
      }

      for (const alert of assetAlerts) {
        if (!isTriggered(alert, price)) continue;

        triggered++;
        const notification = buildNotificationBody(alert, price);

        // Mark alert as triggered
        await supabase
          .from("price_alerts")
          .update({ active: false, triggered_at: new Date().toISOString() })
          .eq("id", alert.id);

        // Get user's push subscriptions
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", alert.user_id);

        let pushSent = false;
        if (subs && subs.length > 0) {
          for (const sub of subs) {
            try {
              await sendWebPush(sub, JSON.stringify(notification), vapidPublic, vapidPrivate, vapidSubject);
              pushSent = true;
            } catch (e) {
              console.error(`Push failed for ${sub.endpoint}:`, e);
              if (String(e).includes("410") || String(e).includes("404")) {
                await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
              }
            }
          }
        }

        // Email fallback: if no push subscription or all pushes failed
        if (!pushSent) {
          try {
            // Get user email from auth
            const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id);
            const email = userData?.user?.email;
            if (email) {
              await sendAlertEmail(supabaseUrl, serviceKey, email, notification);
            }
          } catch (emailErr) {
            console.error(`Email fallback failed for user ${alert.user_id}:`, emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ checked: alerts.length, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-price-alerts error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
