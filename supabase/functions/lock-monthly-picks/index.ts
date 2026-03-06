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

// Stablecoins and wrapped tokens to exclude — these don't move
const EXCLUDED_SYMBOLS = new Set([
  "USDT", "USDC", "BUSD", "DAI", "TUSD", "USDP", "USDD", "GUSD",
  "FRAX", "LUSD", "SUSD", "MIM", "FDUSD", "PYUSD", "EURC", "EURT",
  "WBTC", "WETH", "STETH", "CBETH", "RETH",
]);

const EXCLUDED_NAME_PATTERNS = ["tether", "usd coin", "stablecoin", "wrapped"];

function isStableOrWrapped(t: CoinLoreTicker): boolean {
  if (EXCLUDED_SYMBOLS.has(t.symbol.toUpperCase())) return true;
  const nameLower = t.name.toLowerCase();
  return EXCLUDED_NAME_PATTERNS.some(p => nameLower.includes(p));
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

const STOCK_UNIVERSE = [
  { sym: "AAPL", name: "Apple", fallbackPrice: 230 },
  { sym: "MSFT", name: "Microsoft", fallbackPrice: 450 },
  { sym: "NVDA", name: "NVIDIA", fallbackPrice: 140 },
  { sym: "GOOGL", name: "Alphabet", fallbackPrice: 185 },
  { sym: "AMZN", name: "Amazon", fallbackPrice: 210 },
  { sym: "TSLA", name: "Tesla", fallbackPrice: 340 },
  { sym: "META", name: "Meta", fallbackPrice: 620 },
  { sym: "JPM", name: "JPMorgan", fallbackPrice: 255 },
];

const ETF_UNIVERSE = [
  { sym: "SPY", name: "S&P 500", fallbackPrice: 575 },
  { sym: "QQQ", name: "Nasdaq 100", fallbackPrice: 510 },
  { sym: "VTI", name: "Total Market", fallbackPrice: 285 },
  { sym: "ARKK", name: "ARK Innovation", fallbackPrice: 58 },
  { sym: "VOO", name: "Vanguard S&P", fallbackPrice: 530 },
  { sym: "IWM", name: "Russell 2000", fallbackPrice: 220 },
];

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

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

    // ── Crypto ── (exclude stablecoins and wrapped tokens)
    if (!existingTypes.has("crypto")) {
      try {
        const res = await fetch("https://api.coinlore.net/api/tickers/?start=0&limit=50");
        const json = await res.json();
        const tickers: CoinLoreTicker[] = (json.data || []).filter(
          (t: CoinLoreTicker) => !isStableOrWrapped(t)
        );

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

    // ── Stocks & ETFs — with timeout + fallback ──
    for (const [assetType, universe] of [
      ["stocks", STOCK_UNIVERSE],
      ["etfs", ETF_UNIVERSE],
    ] as const) {
      if (existingTypes.has(assetType)) continue;

      let bestPick: { symbol: string; name: string; price: number; score: number } | null = null;
      let bestScore = -1;
      let usedFallback = false;

      // Try yahoo-proxy with per-symbol timeout
      const supabaseFnUrl = `${supabaseUrl}/functions/v1/yahoo-proxy`;
      let succeeded = 0;

      for (const item of universe) {
        try {
          const res = await fetchWithTimeout(supabaseFnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ symbol: item.sym, range: "3mo", interval: "1d" }),
          }, 10000);

          if (!res.ok) { await res.text(); continue; }
          const data = await res.json();
          const closes: number[] = data.closes || [];
          if (closes.length < 20) continue;

          succeeded++;
          const lastPrice = closes[closes.length - 1];
          const price20ago = closes[Math.max(0, closes.length - 20)];
          const price5ago = closes[Math.max(0, closes.length - 5)];

          const mom20 = ((lastPrice - price20ago) / price20ago) * 100;
          const mom5 = ((lastPrice - price5ago) / price5ago) * 100;

          let score = 0;
          if (mom5 > 0 && mom5 < 5) score += 20;
          if (mom20 > 0 && mom20 < 15) score += 20;
          if (mom5 > -2) score += 10;
          if (mom20 > -5) score += 10;

          const volumes: number[] = data.volumes || [];
          if (volumes.length >= 20) {
            const recentVol = volumes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
            const avgVol = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
            if (recentVol > avgVol * 1.1) score += 10;
          }

          if (score > bestScore) {
            bestScore = score;
            bestPick = { symbol: item.sym, name: item.name, price: lastPrice, score };
          }
        } catch {
          console.log(`Timeout/error fetching ${item.sym}, continuing...`);
          continue;
        }
      }

      // Fallback: if no yahoo data worked, pick top item with fallback price
      if (!bestPick) {
        usedFallback = true;
        // Pick the first item as a reasonable default
        const fallbackItem = universe[0];
        bestPick = {
          symbol: fallbackItem.sym,
          name: fallbackItem.name,
          price: fallbackItem.fallbackPrice,
          score: 35, // neutral score
        };
        bestScore = 35;
        console.log(`Using fallback for ${assetType}: ${fallbackItem.sym} at $${fallbackItem.fallbackPrice}`);
      }

      const confidence = Math.min(85, 30 + bestPick.score);
      const signal = bestPick.score >= 45 ? "Buy" : bestPick.score >= 25 ? "Hold" : "Sell";
      const targetPrice = bestPick.price * (1 + bestPick.score / 200);

      const { data, error } = await supabase.from("tracked_picks").insert({
        month_start: monthStart,
        asset_type: assetType,
        asset_id: bestPick.symbol,
        symbol: bestPick.symbol,
        name: bestPick.name,
        entry_price: bestPick.price,
        signal_score: bestPick.score,
        signal_label: signal,
        confidence,
        target_price: targetPrice,
        reasoning: `Top-ranked ${assetType === "etfs" ? "ETF" : "stock"} by momentum score (${bestPick.score}/70). ${signal} signal with ${confidence}% confidence.${usedFallback ? " (Fallback pricing used — live data unavailable at lock time.)" : ""}`,
      }).select().single();

      if (data) results.push(data);
      if (error) console.error(`${assetType} insert error:`, error);
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
