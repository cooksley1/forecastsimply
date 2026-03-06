import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CoinLoreTicker {
  id: string;
  symbol: string;
  name: string;
  price_usd: string;
  percent_change_24h: string;
  percent_change_7d: string;
  percent_change_1h: string;
  volume24: number;
  market_cap_usd: string;
}

interface YahooQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
}

function preScreenScore(t: CoinLoreTicker): number {
  let s = 0;
  const c24 = parseFloat(t.percent_change_24h) || 0;
  const c7d = parseFloat(t.percent_change_7d) || 0;
  const c1h = parseFloat(t.percent_change_1h) || 0;
  if (c24 > 0 && c24 < 8) s += 20;
  if (c7d > 0 && c7d < 15) s += 15;
  if (c1h > 0 && c1h < 3) s += 10;
  if (c24 > -2) s += 5;
  if (c7d > -5) s += 5;
  if (t.volume24 > 50_000_000) s += 10;
  return s;
}

const STOCK_UNIVERSE = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "JPM"];
const ETF_UNIVERSE = ["SPY", "QQQ", "VTI", "ARKK", "VOO", "IWM"];

const STOCK_NAMES: Record<string, string> = {
  AAPL: "Apple", MSFT: "Microsoft", NVDA: "NVIDIA", GOOGL: "Alphabet",
  AMZN: "Amazon", TSLA: "Tesla", META: "Meta", JPM: "JPMorgan",
};
const ETF_NAMES: Record<string, string> = {
  SPY: "S&P 500", QQQ: "Nasdaq 100", VTI: "Total Market",
  ARKK: "ARK Innovation", VOO: "Vanguard S&P", IWM: "Russell 2000",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    // Check if picks already exist for this month
    const { data: existing } = await supabase
      .from("tracked_picks")
      .select("id, asset_type")
      .eq("month_start", monthStart);

    const existingTypes = new Set((existing || []).map((e: any) => e.asset_type));
    const results: any[] = [];

    // ── Crypto ──
    if (!existingTypes.has("crypto")) {
      try {
        const res = await fetch("https://api.coinlore.net/api/tickers/?start=0&limit=20");
        const json = await res.json();
        const tickers: CoinLoreTicker[] = json.data || [];

        let bestTicker: CoinLoreTicker | null = null;
        let bestScore = -1;

        for (const t of tickers) {
          const score = preScreenScore(t);
          if (score > bestScore) {
            bestScore = score;
            bestTicker = t;
          }
        }

        if (bestTicker) {
          const price = parseFloat(bestTicker.price_usd) || 0;
          const confidence = Math.min(85, 30 + bestScore);
          const signal = bestScore >= 45 ? "Buy" : bestScore >= 25 ? "Hold" : "Sell";
          const targetPrice = price * (1 + bestScore / 200);

          const { data, error } = await supabase.from("tracked_picks").insert({
            month_start: monthStart,
            asset_type: "crypto",
            asset_id: bestTicker.id,
            symbol: bestTicker.symbol.toUpperCase(),
            name: bestTicker.name,
            entry_price: price,
            signal_score: bestScore,
            signal_label: signal,
            confidence,
            target_price: targetPrice,
            reasoning: `Top-ranked crypto by pre-screen score (${bestScore}/65). ${signal} signal with ${confidence}% confidence.`,
          }).select().single();

          if (data) results.push(data);
          if (error) console.error("Crypto insert error:", error);
        }
      } catch (e) {
        console.error("Crypto fetch error:", e);
      }
    }

    // ── Stocks & ETFs ──
    for (const [assetType, universe, names] of [
      ["stocks", STOCK_UNIVERSE, STOCK_NAMES],
      ["etfs", ETF_UNIVERSE, ETF_NAMES],
    ] as const) {
      if (existingTypes.has(assetType)) continue;

      try {
        // Use Yahoo Finance search proxy to get current prices
        const supabaseFnUrl = `${supabaseUrl}/functions/v1/yahoo-proxy`;
        let bestPick: { symbol: string; price: number; change: number; score: number } | null = null;
        let bestScore = -1;

        for (const sym of universe) {
          try {
            const res = await fetch(supabaseFnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ symbol: sym, range: "3mo", interval: "1d" }),
            });

            if (!res.ok) continue;
            const data = await res.json();
            const closes: number[] = data.closes || [];
            if (closes.length < 20) continue;

            const lastPrice = closes[closes.length - 1];
            const price20ago = closes[Math.max(0, closes.length - 20)];
            const price5ago = closes[Math.max(0, closes.length - 5)];

            // Simple momentum score
            const mom20 = ((lastPrice - price20ago) / price20ago) * 100;
            const mom5 = ((lastPrice - price5ago) / price5ago) * 100;

            let score = 0;
            if (mom5 > 0 && mom5 < 5) score += 20;
            if (mom20 > 0 && mom20 < 15) score += 20;
            if (mom5 > -2) score += 10;
            if (mom20 > -5) score += 10;

            // Volume trend (last 5 days vs 20-day avg)
            const volumes: number[] = data.volumes || [];
            if (volumes.length >= 20) {
              const recentVol = volumes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
              const avgVol = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
              if (recentVol > avgVol * 1.1) score += 10;
            }

            if (score > bestScore) {
              bestScore = score;
              bestPick = { symbol: sym, price: lastPrice, change: mom5, score };
            }
          } catch {
            continue;
          }
        }

        if (bestPick) {
          const confidence = Math.min(85, 30 + bestPick.score);
          const signal = bestPick.score >= 45 ? "Buy" : bestPick.score >= 25 ? "Hold" : "Sell";
          const targetPrice = bestPick.price * (1 + bestPick.score / 200);

          const { data, error } = await supabase.from("tracked_picks").insert({
            month_start: monthStart,
            asset_type: assetType,
            asset_id: bestPick.symbol,
            symbol: bestPick.symbol,
            name: (names as Record<string, string>)[bestPick.symbol] || bestPick.symbol,
            entry_price: bestPick.price,
            signal_score: bestPick.score,
            signal_label: signal,
            confidence,
            target_price: targetPrice,
            reasoning: `Top-ranked ${assetType === "etfs" ? "ETF" : "stock"} by momentum score (${bestPick.score}/70). ${signal} signal with ${confidence}% confidence.`,
          }).select().single();

          if (data) results.push(data);
          if (error) console.error(`${assetType} insert error:`, error);
        }
      } catch (e) {
        console.error(`${assetType} error:`, e);
      }
    }

    return new Response(JSON.stringify({ locked: results.length, picks: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
