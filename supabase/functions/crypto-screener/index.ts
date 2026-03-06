const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap_rank: number;
  image: string;
}

/**
 * Fetch top N coins by market cap from CoinGecko (free API).
 * Max 250 per page, so we paginate.
 */
async function fetchTopCoins(total: number): Promise<CoinMarket[]> {
  const allCoins: CoinMarket[] = [];
  const perPage = 250;
  const pages = Math.ceil(total / perPage);

  for (let page = 1; page <= pages; page++) {
    try {
      const count = Math.min(perPage, total - allCoins.length);
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=${page}&sparkline=false&price_change_percentage=24h`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.warn(`[crypto-screener] CoinGecko returned ${res.status} on page ${page}`);
        // If rate limited, return what we have
        if (res.status === 429) break;
        break;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      allCoins.push(...data);

      // Rate limit: CoinGecko free tier ~10-30 req/min
      if (page < pages) {
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      console.warn(`[crypto-screener] Error on page ${page}:`, err);
      break;
    }
  }

  return allCoins;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '500'), 500);

    console.log(`[crypto-screener] Fetching top ${limit} coins`);

    const coins = await fetchTopCoins(limit);

    const results = coins.map(c => ({
      id: c.id,
      sym: c.symbol?.toUpperCase() || '',
      name: c.name || '',
      price: c.current_price || 0,
      change: Math.round((c.price_change_percentage_24h || 0) * 100) / 100,
      rank: c.market_cap_rank || 0,
      image: c.image || '',
    }));

    console.log(`[crypto-screener] Returned ${results.length} coins`);

    return new Response(
      JSON.stringify({ success: true, count: results.length, coins: results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800', // 30 min cache
        },
      }
    );
  } catch (error) {
    console.error('[crypto-screener] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
