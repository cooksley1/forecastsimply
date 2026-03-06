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

/**
 * Discover all ASX equities or ETFs using Yahoo Finance screener API.
 * Sorted by market cap descending — so the first 200 equities ≈ S&P/ASX 200.
 */
async function discoverASX(quoteType: 'EQUITY' | 'ETF'): Promise<YahooQuote[]> {
  const allQuotes: YahooQuote[] = [];
  let offset = 0;
  const size = 250;
  let total = Infinity;
  const maxItems = quoteType === 'EQUITY' ? 2500 : 500;

  while (offset < total && offset < maxItems) {
    try {
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
            operands: [
              { operator: 'EQ', operands: ['region', 'au'] },
            ],
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

      // Small delay between pages
      if (offset < total) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      console.warn(`[screener] Error at offset ${offset}:`, err);
      break;
    }
  }

  return allQuotes;
}

// Fallback: hardcoded ASX 200 tickers (top ~200 by market cap) for when screener fails
const ASX200_FALLBACK = [
  'CBA.AX','BHP.AX','CSL.AX','WBC.AX','NAB.AX','ANZ.AX','MQG.AX','WES.AX','WOW.AX',
  'FMG.AX','TLS.AX','RIO.AX','WDS.AX','GMG.AX','STO.AX','TCL.AX','REA.AX','XRO.AX',
  'COL.AX','QAN.AX','RMD.AX','COH.AX','SHL.AX','RHC.AX','BXB.AX','AMC.AX','SUN.AX',
  'QBE.AX','IAG.AX','WTC.AX','JBH.AX','HVN.AX','SUL.AX','LOV.AX','BRG.AX','PMV.AX',
  'MIN.AX','S32.AX','NCM.AX','NST.AX','EVN.AX','PLS.AX','LYC.AX','ILU.AX','IGO.AX',
  'ALL.AX','TNE.AX','ALU.AX','SEK.AX','CAR.AX','NXT.AX','MP1.AX','BLD.AX','ABC.AX',
  'JHX.AX','ORI.AX','IPL.AX','APA.AX','ORG.AX','BPT.AX','AGL.AX','DXS.AX','GPT.AX',
  'MGR.AX','SGP.AX','SCG.AX','VCX.AX','CHC.AX','GOZ.AX','LLC.AX','TWE.AX','A2M.AX',
  'ING.AX','GNC.AX','ELD.AX','BOQ.AX','BEN.AX','AMP.AX','CGF.AX','PPT.AX','HUB.AX',
  'CPU.AX','ASX.AX','MPL.AX','NHF.AX','GQG.AX','MFG.AX','PDL.AX','TPG.AX','LNK.AX',
  'NUF.AX','WOR.AX','DOW.AX','CWY.AX','ALX.AX','BSL.AX','NEC.AX','EDV.AX','CKF.AX',
  'IEL.AX','OFX.AX','ZIP.AX','SFR.AX','WHC.AX','AWC.AX','FPH.AX','HLS.AX','ANN.AX',
  'PME.AX','AVH.AX','EBO.AX','TLX.AX','PNV.AX','KGN.AX','BAP.AX','CTD.AX','ADH.AX',
  'DMP.AX','FLT.AX','WEB.AX','SGR.AX','TAH.AX','ARB.AX','RWC.AX','GWA.AX','ORA.AX',
  'NWH.AX','MND.AX','SVW.AX','AZJ.AX','MCY.AX','PGH.AX','RRL.AX','WAF.AX','GOR.AX',
  'CMM.AX','SLR.AX','WGX.AX','DEG.AX','RED.AX','DRR.AX','LTR.AX','PDN.AX','BGL.AX',
  'KAR.AX','VEA.AX','SQ2.AX','REH.AX','AD8.AX','PBH.AX','APX.AX','GNG.AX','SKC.AX',
  'REG.AX','BGA.AX','TGR.AX','CCP.AX','EQT.AX','CLW.AX','CIP.AX','ABP.AX','ARF.AX',
  'BWP.AX','NSR.AX','CQR.AX','HDN.AX','SCP.AX','GDI.AX','WPR.AX','NWL.AX','JHG.AX',
  'PTM.AX','IFL.AX','SDF.AX','PRU.AX','AIS.AX','PAN.AX','SYR.AX','AGY.AX','CXO.AX',
  'AKE.AX','FFX.AX','NRG.AX','CEN.AX','INF.AX','PGY.AX','ALD.AX',
];

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Fetch chart metadata for a single ticker via the existing yahoo-proxy (fallback)
async function fetchTickerMeta(symbol: string): Promise<any | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-proxy?symbol=${encodeURIComponent(symbol)}&range=5d&interval=1d`,
      { headers: { apikey: ANON_KEY }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      sym: meta.symbol || symbol,
      name: meta.longName || meta.shortName || symbol,
      price: meta.regularMarketPrice || 0,
      prevClose: meta.chartPreviousClose || meta.previousClose || 0,
    };
  } catch {
    return null;
  }
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
    const type = (url.searchParams.get('type') || 'equity').toLowerCase(); // equity | etf
    const subgroup = (url.searchParams.get('subgroup') || 'all').toLowerCase(); // all | asx200

    if (exchange !== 'ASX') {
      return new Response(
        JSON.stringify({ success: false, error: `Exchange '${exchange}' not supported` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quoteType = type === 'etf' ? 'ETF' : 'EQUITY';
    console.log(`[exchange-screener] Discovering ${quoteType} for ${exchange}, subgroup=${subgroup}`);

    // Try Yahoo screener first
    let quotes = await discoverASX(quoteType);
    let stocks: any[];

    if (quotes.length > 0) {
      console.log(`[exchange-screener] Yahoo screener returned ${quotes.length} ${quoteType} results`);
      stocks = quotes
        .map(mapQuoteToStock)
        .filter(s => s.price > 0 && s.sym);
    } else {
      // Fallback to hardcoded list for equities
      console.log(`[exchange-screener] Screener failed, using fallback list`);
      if (quoteType === 'EQUITY') {
        const tickers = subgroup === 'asx200' ? ASX200_FALLBACK.slice(0, 200) : ASX200_FALLBACK;
        const batchSize = 15;
        const metaResults: (any | null)[] = [];
        for (let i = 0; i < tickers.length; i += batchSize) {
          const batch = tickers.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map(fetchTickerMeta));
          metaResults.push(...batchResults);
          if (i + batchSize < tickers.length) {
            await new Promise(r => setTimeout(r, 100));
          }
        }
        stocks = tickers.map((sym, idx) => {
          const meta = metaResults[idx];
          if (meta) {
            const change = meta.prevClose > 0
              ? ((meta.price - meta.prevClose) / meta.prevClose) * 100
              : 0;
            return { sym: meta.sym, name: meta.name, price: meta.price, change: Math.round(change * 100) / 100, div: false, yield: 0 };
          }
          return { sym, name: sym.replace('.AX', ''), price: 0, change: 0, div: false, yield: 0 };
        }).filter(s => s.price > 0);
      } else {
        stocks = []; // No fallback for ETFs
      }
    }

    // Apply ASX 200 subgroup filter (top 200 by market cap — already sorted)
    if (subgroup === 'asx200' && quoteType === 'EQUITY') {
      stocks = stocks.slice(0, 200);
    }

    console.log(`[exchange-screener] Returned ${stocks.length} ${quoteType} for ${exchange} (subgroup=${subgroup})`);

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
