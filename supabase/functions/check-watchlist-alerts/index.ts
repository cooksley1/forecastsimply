import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertSetting {
  user_id: string;
  frequency: string;
  signal_change: boolean;
  forecast_deviation: boolean;
  deviation_threshold_pct: number;
  last_checked_at: string | null;
}

interface WatchlistItem {
  user_id: string;
  asset_id: string;
  asset_type: string;
  symbol: string;
  name: string;
}

interface CachedAnalysis {
  asset_id: string;
  signal_label: string;
  signal_score: number;
  price: number;
  target_price: number | null;
  forecast_return_pct: number | null;
}

interface AlertState {
  user_id: string;
  asset_id: string;
  last_signal_label: string | null;
  last_signal_score: number | null;
  last_price: number | null;
  last_forecast_price: number | null;
}

interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function shouldCheck(setting: AlertSetting): boolean {
  if (!setting.last_checked_at) return true;
  const last = new Date(setting.last_checked_at).getTime();
  const now = Date.now();
  const hours = (now - last) / (1000 * 60 * 60);

  switch (setting.frequency) {
    case "hourly": return hours >= 1;
    case "6h": return hours >= 6;
    case "12h": return hours >= 12;
    case "daily": return hours >= 24;
    default: return hours >= 24;
  }
}

async function sendWebPush(sub: PushSub, payload: string, vapidPublic: string, vapidPrivate: string) {
  try {
    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
    webpush.setVapidDetails("mailto:alerts@forecastsimply.app", vapidPublic, vapidPrivate);
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    return true;
  } catch (e) {
    console.error(`Push failed: ${e}`);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all enabled alert settings
    const { data: allSettings, error: settingsErr } = await supabase
      .from("watchlist_alert_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsErr) throw settingsErr;
    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ checked: 0, alerts_sent: 0, message: "No enabled settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Filter by frequency — only check users whose interval has elapsed
    const dueSettings = allSettings.filter(s => shouldCheck(s as AlertSetting));
    if (dueSettings.length === 0) {
      return new Response(JSON.stringify({ checked: 0, alerts_sent: 0, message: "No users due for check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dueUserIds = dueSettings.map(s => s.user_id);
    let totalAlerts = 0;

    // 3. Get watchlist items for due users
    const { data: watchlistItems } = await supabase
      .from("watchlist_items")
      .select("user_id, asset_id, asset_type, symbol, name")
      .in("user_id", dueUserIds);

    if (!watchlistItems || watchlistItems.length === 0) {
      // Update last_checked_at even if no watchlist items
      for (const s of dueSettings) {
        await supabase.from("watchlist_alert_settings")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("user_id", s.user_id);
      }
      return new Response(JSON.stringify({ checked: dueUserIds.length, alerts_sent: 0, message: "No watchlist items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get unique asset IDs and fetch their latest analysis
    const uniqueAssetIds = [...new Set(watchlistItems.map(w => w.asset_id))];
    const { data: analyses } = await supabase
      .from("daily_analysis_cache")
      .select("asset_id, signal_label, signal_score, price, target_price, forecast_return_pct")
      .in("asset_id", uniqueAssetIds)
      .eq("timeframe_days", 90);

    const analysisMap = new Map<string, CachedAnalysis>();
    if (analyses) {
      for (const a of analyses) analysisMap.set(a.asset_id, a as CachedAnalysis);
    }

    // 5. Get existing alert states for due users
    const { data: existingStates } = await supabase
      .from("watchlist_alert_state")
      .select("*")
      .in("user_id", dueUserIds);

    const stateMap = new Map<string, AlertState>();
    if (existingStates) {
      for (const s of existingStates) {
        stateMap.set(`${s.user_id}:${s.asset_id}`, s as AlertState);
      }
    }

    // 6. Process each user
    for (const setting of dueSettings) {
      const userItems = watchlistItems.filter(w => w.user_id === setting.user_id);
      const notifications: { title: string; body: string }[] = [];

      for (const item of userItems) {
        const analysis = analysisMap.get(item.asset_id);
        if (!analysis) continue;

        const stateKey = `${setting.user_id}:${item.asset_id}`;
        const prevState = stateMap.get(stateKey);

        // Check signal change
        if (setting.signal_change && prevState?.last_signal_label && prevState.last_signal_label !== analysis.signal_label) {
          notifications.push({
            title: `🔄 Signal Change: ${item.name} (${item.symbol})`,
            body: `Signal changed from ${prevState.last_signal_label} to ${analysis.signal_label} (Score: ${analysis.signal_score})`,
          });
        }

        // Check forecast deviation
        if (setting.forecast_deviation && analysis.target_price && analysis.price) {
          const forecastPrice = analysis.target_price;
          const deviationPct = Math.abs((analysis.price - forecastPrice) / forecastPrice) * 100;
          if (deviationPct >= setting.deviation_threshold_pct) {
            const direction = analysis.price > forecastPrice ? "above" : "below";
            notifications.push({
              title: `📊 Forecast Deviation: ${item.name} (${item.symbol})`,
              body: `Price $${analysis.price.toLocaleString()} is ${deviationPct.toFixed(1)}% ${direction} forecast ($${forecastPrice.toLocaleString()})`,
            });
          }
        }

        // Update state
        await supabase.from("watchlist_alert_state").upsert({
          user_id: setting.user_id,
          asset_id: item.asset_id,
          last_signal_label: analysis.signal_label,
          last_signal_score: analysis.signal_score,
          last_price: analysis.price,
          last_forecast_price: analysis.target_price,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,asset_id" });
      }

      // Send notifications
      if (notifications.length > 0) {
        // Get push subscriptions
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", setting.user_id);

        let pushSent = false;
        if (subs && subs.length > 0 && vapidPublic && vapidPrivate) {
          // Send combined notification if multiple
          const combined = notifications.length === 1
            ? notifications[0]
            : {
                title: `📡 ${notifications.length} Watchlist Alerts`,
                body: notifications.map(n => n.body).join('\n'),
              };

          for (const sub of subs) {
            const ok = await sendWebPush(sub, JSON.stringify(combined), vapidPublic, vapidPrivate);
            if (ok) pushSent = true;
            else {
              // Clean up dead subscriptions
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          }
        }

        // Email fallback
        if (!pushSent) {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(setting.user_id);
            const email = userData?.user?.email;
            if (email) {
              console.log(`📧 Watchlist alert email to ${email}: ${notifications.length} alerts`);
              for (const n of notifications) {
                console.log(`  - ${n.title}: ${n.body}`);
              }
            }
          } catch (e) {
            console.error(`Email fallback failed for ${setting.user_id}:`, e);
          }
        }

        totalAlerts += notifications.length;
      }

      // Update last_checked_at
      await supabase.from("watchlist_alert_settings")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("user_id", setting.user_id);
    }

    const summary = `Checked ${dueSettings.length} users, sent ${totalAlerts} alerts`;
    console.log(`[check-watchlist-alerts] ${summary}`);

    return new Response(
      JSON.stringify({ checked: dueSettings.length, alerts_sent: totalAlerts, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[check-watchlist-alerts] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
