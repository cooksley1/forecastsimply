import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Popular assets to pre-fetch and warm up caches
const POPULAR_STOCKS = [
  'CBA.AX', 'BHP.AX', 'CSL.AX', 'WES.AX', 'NAB.AX',
  'WBC.AX', 'ANZ.AX', 'FMG.AX', 'WOW.AX', 'TLS.AX',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM',
];

const POPULAR_CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'dogecoin', 'polkadot', 'chainlink', 'avalanche-2',
];

const YAHOO_BASE = Deno.env.get('SUPABASE_URL') + '/functions/v1/yahoo-proxy';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

async function warmStockData(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${YAHOO_BASE}?symbol=${encodeURIComponent(symbol)}&range=3mo&interval=1d`,
      { headers: { apikey: ANON_KEY } }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function warmCryptoData(coinId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=90`
    );
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results = { stocks: { ok: 0, fail: 0 }, crypto: { ok: 0, fail: 0 } };

  console.log('[refresh-market-data] Starting scheduled data refresh...');

  // Warm stocks (with small delays to avoid hammering)
  for (const sym of POPULAR_STOCKS) {
    const ok = await warmStockData(sym);
    ok ? results.stocks.ok++ : results.stocks.fail++;
    // 500ms delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  // Warm crypto (with delays for rate limits)
  for (const id of POPULAR_CRYPTO_IDS) {
    const ok = await warmCryptoData(id);
    ok ? results.crypto.ok++ : results.crypto.fail++;
    await new Promise(r => setTimeout(r, 1500)); // CoinGecko rate limit is strict
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = `Refreshed in ${elapsed}s — Stocks: ${results.stocks.ok}/${POPULAR_STOCKS.length}, Crypto: ${results.crypto.ok}/${POPULAR_CRYPTO_IDS.length}`;
  console.log(`[refresh-market-data] ${summary}`);

  return new Response(
    JSON.stringify({ success: true, summary, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});