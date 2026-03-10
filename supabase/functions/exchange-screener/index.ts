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
  exchangeFilter?: string;
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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Get Yahoo Finance crumb + cookies for authenticated API access.
 * Uses a multi-step approach to handle consent and auth.
 */
async function getYahooSession(): Promise<{ crumb: string; cookies: string }> {
  // Step 1: Fetch the main Yahoo Finance page to collect initial cookies
  // Use fc.yahoo.com which is a lightweight endpoint that sets the A1/A3 cookies
  const initRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });

  let allCookies: string[] = [];
  
  // Collect set-cookie headers
  for (const [key, value] of initRes.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      allCookies.push(value.split(';')[0]);
    }
  }
  
  // Also try getSetCookie if available
  const setCookies = initRes.headers.getSetCookie?.() || [];
  for (const c of setCookies) {
    const cookiePart = c.split(';')[0];
    if (!allCookies.includes(cookiePart)) {
      allCookies.push(cookiePart);
    }
  }

  // Consume body
  try { await initRes.text(); } catch {}

  const cookieStr = allCookies.join('; ');
  console.log(`[screener] Initial cookies count: ${allCookies.length}`);

  // Step 2: Get the crumb using the cookies
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      'Cookie': cookieStr,
    },
  });

  if (!crumbRes.ok) {
    // Try alternative crumb endpoint
    console.warn(`[screener] Crumb fetch failed with ${crumbRes.status}, trying alternative...`);
    await crumbRes.text();
    
    // Try query1 instead of query2
    const crumbRes2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': UA,
        'Cookie': cookieStr,
      },
    });
    
    if (!crumbRes2.ok) {
      const body = await crumbRes2.text();
      console.error(`[screener] Alt crumb also failed: ${crumbRes2.status} - ${body.substring(0, 100)}`);
      throw new Error(`Failed to get crumb: ${crumbRes2.status}`);
    }
    
    const crumb = await crumbRes2.text();
    console.log(`[screener] Got crumb via alt: ${crumb.substring(0, 8)}...`);
    return { crumb, cookies: cookieStr };
  }

  const crumb = await crumbRes.text();
  console.log(`[screener] Got crumb: ${crumb.substring(0, 8)}...`);
  return { crumb, cookies: cookieStr };
}

/**
 * Fallback: Use Yahoo Finance search/quote endpoints to build a stock list.
 * This doesn't require the screener API.
 */
async function discoverViaQuoteList(
  config: ExchangeConfig,
  quoteType: 'EQUITY' | 'ETF',
): Promise<YahooQuote[]> {
  // Use Yahoo's quote list endpoint which may still work without auth
  const category = quoteType === 'ETF' ? 'etf' : 'equity';
  const url = `https://query1.finance.yahoo.com/v1/finance/lookup?formatted=true&lang=en-US&region=${config.region}&corsDomain=finance.yahoo.com&type=${category}&count=250&start=0&query=*`;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      console.warn(`[screener] Lookup fallback returned ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    return (data?.finance?.result?.[0]?.documents || []).map((d: any) => ({
      symbol: d.symbol,
      shortName: d.shortName,
      longName: d.longName,
      regularMarketPrice: d.regularMarketPrice?.raw,
      regularMarketChangePercent: d.regularMarketChangePercent?.raw,
    }));
  } catch (err) {
    console.warn('[screener] Lookup fallback failed:', err);
    return [];
  }
}

/**
 * Discover equities or ETFs using Yahoo Finance screener API.
 */
async function discoverStocks(
  config: ExchangeConfig,
  quoteType: 'EQUITY' | 'ETF',
): Promise<YahooQuote[]> {
  // Try authenticated screener first
  let session: { crumb: string; cookies: string } | null = null;
  try {
    session = await getYahooSession();
  } catch (err) {
    console.warn('[screener] Session auth failed, trying unauthenticated:', err);
  }

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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': UA,
      };
      
      let screenerUrl = 'https://query2.finance.yahoo.com/v1/finance/screener';
      if (session) {
        screenerUrl += `?crumb=${encodeURIComponent(session.crumb)}`;
        headers['Cookie'] = session.cookies;
      }

      const res = await fetch(screenerUrl, {
        method: 'POST',
        headers,
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
        const body = await res.text();
        console.warn(`[screener] Yahoo screener returned ${res.status} at offset ${offset}: ${body.substring(0, 150)}`);
        break;
      }

      const data = await res.json();
      const result = data?.finance?.result?.[0];
      if (!result || !result.quotes?.length) break;

      total = result.total || 0;
      allQuotes.push(...result.quotes);
      offset += size;

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

    // Apply subgroup filters
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
