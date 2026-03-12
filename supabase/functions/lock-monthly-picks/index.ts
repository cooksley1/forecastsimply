import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const EXCLUDED_SYMBOLS = new Set([
  "USDT", "USDC", "BUSD", "DAI", "TUSD", "USDP", "USDD", "GUSD",
  "FRAX", "LUSD", "SUSD", "MIM", "FDUSD", "PYUSD", "EURC", "EURT",
  "WBTC", "WETH", "STETH", "CBETH", "RETH", "BFUSD", "USDAI",
  "USDE", "CRVUSD", "GHO", "DOLA", "ALUSD", "HAY", "ZUSD",
]);
const EXCLUDED_NAME_PATTERNS = ["tether", "usd coin", "stablecoin", "wrapped", "peg", "bridged"];

function isStableOrWrapped(t: CoinLoreTicker): boolean {
  if (EXCLUDED_SYMBOLS.has(t.symbol.toUpperCase())) return true;
  return EXCLUDED_NAME_PATTERNS.some(p => t.name.toLowerCase().includes(p));
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

const TIMEFRAMES = [30, 90, 180, 365] as const;
const ASSET_TYPES = ["crypto", "stocks", "etfs"] as const;
const TOP_N = 3;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
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

    // Check existing picks for this month
    const { data: existing, error: existErr } = await supabase
      .from("tracked_picks")
      .select("id, asset_type, asset_id, timeframe_days, rank")
      .eq("month_start", monthStart);

    console.log("Existing picks for", monthStart, ":", existing?.length, "error:", existErr?.message);

    const existingKey = new Set(
      (existing || []).map((e: any) => `${e.asset_type}-${e.timeframe_days}-${e.rank}`)
    );
    console.log("Existing keys:", [...existingKey]);

    const results: any[] = [];

    // ── Strategy 1: Use daily_analysis_cache for stocks & ETFs ──
    for (const assetType of ["stocks", "etfs"] as const) {
      for (const tf of TIMEFRAMES) {
        // Check if all 3 ranks already exist
        const needed: number[] = [];
        for (let r = 1; r <= TOP_N; r++) {
          if (!existingKey.has(`${assetType}-${tf}-${r}`)) needed.push(r);
        }
        if (needed.length === 0) continue;
        console.log(`${assetType} tf=${tf}: need ranks`, needed);

        // Pull top candidates from daily_analysis_cache
        const { data: cached, error: cacheErr } = await supabase
          .from("daily_analysis_cache")
          .select("*")
          .eq("asset_type", assetType)
          .eq("timeframe_days", tf)
          .order("signal_score", { ascending: false })
          .limit(10);

        console.log(`${assetType} tf=${tf}: cached=${cached?.length}, err=${cacheErr?.message}`);
        if (!cached?.length) continue;

        // Pick top N that aren't already locked
        const alreadyLocked = new Set(
          (existing || [])
            .filter((e: any) => e.asset_type === assetType && e.timeframe_days === tf)
            .map((e: any) => e.asset_id)
        );

        const candidates = cached.filter((c: any) => !alreadyLocked.has(c.asset_id));
        let rankIdx = 0;

        for (const rank of needed) {
          const pick = candidates[rankIdx];
          if (!pick) break;
          rankIdx++;

          const { data, error } = await supabase.from("tracked_picks").insert({
            month_start: monthStart,
            asset_type: assetType,
            asset_id: pick.asset_id,
            symbol: pick.symbol,
            name: pick.name,
            entry_price: pick.price,
            signal_score: pick.signal_score ?? 0,
            signal_label: pick.signal_label ?? "Hold",
            confidence: pick.confidence ?? 50,
            target_price: pick.target_price,
            stop_loss: pick.stop_loss,
            timeframe_days: tf,
            rank,
            reasoning: `#${rank} ranked ${assetType === "etfs" ? "ETF" : "stock"} for ${tf}-day horizon. Signal: ${pick.signal_label} (score ${pick.signal_score}). Confidence: ${pick.confidence}%.`,
          }).select().single();

          if (data) results.push(data);
          if (error) console.error(`Insert error ${assetType}/${tf}/#${rank}:`, error);
        }
      }
    }

    // ── Strategy 2: Crypto from CoinLore (all timeframes use same pre-screen) ──
    let cryptoTickers: CoinLoreTicker[] = [];
    try {
      const res = await fetch("https://api.coinlore.net/api/tickers/?start=0&limit=50");
      const json = await res.json();
      cryptoTickers = (json.data || []).filter((t: CoinLoreTicker) => !isStableOrWrapped(t));
    } catch (e) {
      console.error("CoinLore fetch error:", e);
    }

    if (cryptoTickers.length > 0) {
      // Score all tickers
      const scored = cryptoTickers.map(t => ({ ticker: t, score: preScreenScore(t) }))
        .sort((a, b) => b.score - a.score);

      for (const tf of TIMEFRAMES) {
        const needed: number[] = [];
        for (let r = 1; r <= TOP_N; r++) {
          if (!existingKey.has(`crypto-${tf}-${r}`)) needed.push(r);
        }
        if (needed.length === 0) continue;

        const alreadyLocked = new Set(
          (existing || [])
            .filter((e: any) => e.asset_type === "crypto" && e.timeframe_days === tf)
            .map((e: any) => e.asset_id)
        );

        const candidates = scored.filter(s => !alreadyLocked.has(s.ticker.id));
        let rankIdx = 0;

        for (const rank of needed) {
          const entry = candidates[rankIdx];
          if (!entry) break;
          rankIdx++;

          const t = entry.ticker;
          const price = parseFloat(t.price_usd) || 0;
          const confidence = Math.min(85, 30 + entry.score);
          const signal = entry.score >= 45 ? "Buy" : entry.score >= 25 ? "Hold" : "Sell";
          const targetPrice = price * (1 + entry.score / 200);

          const { data, error } = await supabase.from("tracked_picks").insert({
            month_start: monthStart,
            asset_type: "crypto",
            asset_id: t.id,
            symbol: t.symbol.toUpperCase(),
            name: t.name,
            entry_price: price,
            signal_score: entry.score,
            signal_label: signal,
            confidence,
            target_price: targetPrice,
            timeframe_days: tf,
            rank,
            reasoning: `#${rank} ranked crypto for ${tf}-day horizon. Pre-screen score: ${entry.score}/65. ${signal} signal with ${confidence}% confidence.`,
          }).select().single();

          if (data) results.push(data);
          if (error) console.error(`Crypto insert error ${tf}/#${rank}:`, error);
        }
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
