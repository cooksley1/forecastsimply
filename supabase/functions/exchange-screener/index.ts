const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YahooQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  trailingAnnualDividendYield?: number;
  dividendYield?: number;
}

interface ExchangeConfig {
  region: string;
  exchangeFilter?: string; // Yahoo exchange code e.g. 'NYQ', 'NMS'
  suffix: string;
  maxEquities: number;
  maxEtfs: number;
}

const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  ASX:    { region: 'au', suffix: '.AX', maxEquities: 2500, maxEtfs: 500 },
  HKG:    { region: 'hk', suffix: '.HK', maxEquities: 3000, maxEtfs: 300 },
  LSE:    { region: 'gb', suffix: '.L',  maxEquities: 2000, maxEtfs: 400 },
  JPX:    { region: 'jp', suffix: '.T',  maxEquities: 4000, maxEtfs: 500 },
  NYSE:   { region: 'us', exchangeFilter: 'NYQ', suffix: '', maxEquities: 2500, maxEtfs: 500 },
  NASDAQ: { region: 'us', exchangeFilter: 'NMS', suffix: '', maxEquities: 4500, maxEtfs: 300 },
};

/**
 * Discover equities or ETFs using Yahoo Finance screener API.
 * Sorted by market cap descending.
 */
async function discoverStocks(
  config: ExchangeConfig,
  quoteType: 'EQUITY' | 'ETF',
): Promise<YahooQuote[]> {
  const allQuotes: YahooQuote[] = [];
  let offset = 0;
  const size = 250;
  let total = Infinity;
  const maxItems = quoteType === 'EQUITY' ? config.maxEquities : config.maxEtfs;

  while (offset < total && offset < maxItems) {
    try {
      const operands: any[] = [
        { operator: 'EQ', operands: ['region', config.region] },
      ];
      if (config.exchangeFilter) {
        operands.push({ operator: 'EQ', operands: ['exchange', config.exchangeFilter] });
      }

      const res = await fetch('https://query2.finance.yahoo.com/v1/finance/screener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          size,
          offset,
          sortField: 'intradaymarketcap',
          sortType: 'DESC',
          quoteType,
          query: {
            operator: 'AND',
            operands,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.warn(`[screener] Yahoo screener returned ${res.status} at offset ${offset}`);
        break;
      }

      const data = await res.json();
      const result = data?.finance?.result?.[0];
      if (!result || !result.quotes?.length) break;

      total = result.total || 0;
      allQuotes.push(...result.quotes);
      offset += size;

      // Small delay between pages to avoid rate limiting
      if (offset < total && offset < maxItems) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      console.warn(`[screener] Error at offset ${offset}:`, err);
      break;
    }
  }

  return allQuotes;
}

function mapQuoteToStock(q: YahooQuote) {
  const divYield = (q.trailingAnnualDividendYield ?? q.dividendYield ?? 0) * 100;
  return {
    sym: q.symbol || '',
    name: q.longName || q.shortName || q.symbol || '',
    price: q.regularMarketPrice || 0,
    change: Math.round((q.regularMarketChangePercent || 0) * 100) / 100,
    div: divYield > 0.1,
    yield: Math.round(divYield * 10) / 10,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const exchange = (url.searchParams.get('exchange') || 'ASX').toUpperCase();
    const type = (url.searchParams.get('type') || 'equity').toLowerCase();
    const subgroup = (url.searchParams.get('subgroup') || 'all').toLowerCase();

    const config = EXCHANGE_CONFIGS[exchange];
    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: `Exchange '${exchange}' not supported. Supported: ${Object.keys(EXCHANGE_CONFIGS).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quoteType = type === 'etf' ? 'ETF' : 'EQUITY';
    console.log(`[exchange-screener] Discovering ${quoteType} for ${exchange}, subgroup=${subgroup}`);

    const quotes = await discoverStocks(config, quoteType);
    let stocks = quotes
      .map(mapQuoteToStock)
      .filter(s => s.price > 0 && s.sym);

    console.log(`[exchange-screener] Yahoo screener returned ${stocks.length} ${quoteType} for ${exchange}`);

    // Apply subgroup filters (top N by market cap — already sorted)
    if (subgroup === 'asx200' && exchange === 'ASX' && quoteType === 'EQUITY') {
      stocks = stocks.slice(0, 200);
    }

    return new Response(
      JSON.stringify({ success: true, exchange, type: quoteType, subgroup, count: stocks.length, stocks }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('[exchange-screener] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
