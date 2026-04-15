import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all active picks
    const { data: activePicks, error: fetchErr } = await supabase
      .from("tracked_picks")
      .select("*")
      .eq("status", "active");

    if (fetchErr) throw fetchErr;
    if (!activePicks?.length) {
      return new Response(JSON.stringify({ message: "No active picks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already have today's snapshots
    const { data: existingSnaps } = await supabase
      .from("pick_snapshots")
      .select("pick_id")
      .eq("snapshot_date", today);

    const alreadySnapped = new Set((existingSnaps || []).map((s: any) => s.pick_id));
    const results: any[] = [];

    for (const pick of activePicks) {
      if (alreadySnapped.has(pick.id)) continue;

      let currentPrice: number | null = null;

      if (pick.asset_type === "crypto") {
        // CoinLore single ticker
        try {
          const res = await fetch(`https://api.coinlore.net/api/ticker/?id=${pick.asset_id}`);
          const json = await res.json();
          if (json?.[0]?.price_usd) {
            currentPrice = parseFloat(json[0].price_usd);
          }
        } catch (e) {
          console.error(`Crypto price fetch error for ${pick.symbol}:`, e);
        }
      } else {
        // Stocks/ETFs via yahoo-proxy
        try {
          const proxyUrl = `${supabaseUrl}/functions/v1/yahoo-proxy?symbol=${encodeURIComponent(pick.symbol)}&range=5d&interval=1d`;
          const res = await fetch(proxyUrl, {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            // Yahoo Finance v8 response format
            const closes: number[] =
              data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((v: any) => v != null) ||
              data?.closes ||
              [];
            if (closes.length > 0) {
              currentPrice = closes[closes.length - 1];
            }
          }
        } catch (e) {
          console.error(`Equity price fetch error for ${pick.symbol}:`, e);
        }
      }

      if (currentPrice === null) continue;

      const changeFromEntry = ((currentPrice - pick.entry_price) / pick.entry_price) * 100;

      // Interpolate forecast prices for today
      // Days since month start
      const monthStart = new Date(pick.month_start);
      const daysSinceStart = Math.floor(
        (new Date(today).getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      const getForecastPrice = (forecastJson: any[]): number | null => {
        if (!forecastJson?.length) return null;
        // Forecasts are arrays of {timestamp, value, upper, lower}
        // Find the closest point by day index
        if (daysSinceStart < forecastJson.length) {
          return forecastJson[daysSinceStart]?.value ?? null;
        }
        return forecastJson[forecastJson.length - 1]?.value ?? null;
      };

      const snapshot = {
        pick_id: pick.id,
        snapshot_date: today,
        price: currentPrice,
        change_from_entry_pct: Math.round(changeFromEntry * 100) / 100,
        forecast_ensemble_price: getForecastPrice(pick.forecast_ensemble),
        forecast_linear_price: getForecastPrice(pick.forecast_linear),
        forecast_holt_price: getForecastPrice(pick.forecast_holt),
        forecast_ema_price: getForecastPrice(pick.forecast_ema_momentum),
        forecast_monte_carlo_price: getForecastPrice(pick.forecast_monte_carlo),
      };

      const { data, error } = await supabase
        .from("pick_snapshots")
        .insert(snapshot)
        .select()
        .single();

      if (data) results.push(data);
      if (error) console.error(`Snapshot insert error for ${pick.symbol}:`, error);

      // Check if month is over (last day of month or past it)
      const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (tomorrow >= nextMonth) {
        // Complete this pick
        const finalReturn = ((currentPrice - pick.entry_price) / pick.entry_price) * 100;
        const outcome = finalReturn > 0 ? "profitable" : "unprofitable";

        // Generate basic case study text
        const caseStudy = [
          `## ${pick.name} (${pick.symbol}) — ${pick.month_start} Case Study`,
          ``,
          `**Asset Type:** ${pick.asset_type}`,
          `**Entry Price:** $${pick.entry_price.toFixed(2)}`,
          `**Final Price:** $${currentPrice.toFixed(2)}`,
          `**Return:** ${finalReturn > 0 ? "+" : ""}${finalReturn.toFixed(2)}%`,
          `**Signal at Entry:** ${pick.signal_label} (Score: ${pick.signal_score}, Confidence: ${pick.confidence}%)`,
          `**Outcome:** ${outcome.charAt(0).toUpperCase() + outcome.slice(1)}`,
          ``,
          `### Entry Reasoning`,
          pick.reasoning || "No reasoning recorded.",
          ``,
          `### Performance Summary`,
          finalReturn > 0
            ? `The pick was ${outcome} with a ${finalReturn.toFixed(2)}% return. The ${pick.signal_label} signal proved accurate.`
            : `The pick was ${outcome} with a ${finalReturn.toFixed(2)}% return. Market conditions moved against the ${pick.signal_label} signal.`,
          ``,
          `### Forecast Accuracy`,
          pick.target_price
            ? `Target was $${pick.target_price.toFixed(2)}. Actual final: $${currentPrice.toFixed(2)} (${currentPrice >= pick.target_price ? "target reached ✅" : "target missed ❌"}).`
            : "No target price was set.",
          ``,
          `### Lessons & Improvements`,
          finalReturn > 0
            ? "The model's momentum and signal scoring correctly identified this opportunity. Continue monitoring similar setups."
            : "Review signal weighting for this asset class. Consider adding additional confirmation indicators to reduce false positives.",
        ].join("\n");

        await supabase
          .from("tracked_picks")
          .update({
            status: "completed",
            final_price: currentPrice,
            final_return_pct: Math.round(finalReturn * 100) / 100,
            case_study_text: caseStudy,
            completed_at: new Date().toISOString(),
          })
          .eq("id", pick.id);
      }
    }

    return new Response(
      JSON.stringify({ snapshots: results.length, completed: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
