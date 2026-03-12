import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cmcKey = Deno.env.get('CMC_API_KEY');
  if (!cmcKey) {
    return new Response(
      JSON.stringify({ error: 'CMC API key not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol')?.toUpperCase();

  if (!symbol) {
    return new Response(
      JSON.stringify({ error: 'symbol parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbol)}&convert=USD`;
    const res = await fetch(cmcUrl, {
      headers: { 'X-CMC_PRO_API_KEY': cmcKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `CMC API returned ${res.status}` }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const json = await res.json();
    const coinData = json?.data?.[symbol];

    if (!coinData) {
      return new Response(
        JSON.stringify({ error: `No data found for ${symbol}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quote = coinData.quote?.USD || {};
    const result = {
      data: {
        id: coinData.id,
        name: coinData.name,
        symbol: coinData.symbol,
        slug: coinData.slug,
        price: quote.price || 0,
        change24h: quote.percent_change_24h || 0,
        change7d: quote.percent_change_7d || 0,
        marketCap: quote.market_cap || 0,
        volume24h: quote.volume_24h || 0,
        circulatingSupply: coinData.circulating_supply || 0,
        maxSupply: coinData.max_supply || null,
        rank: coinData.cmc_rank || 0,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
