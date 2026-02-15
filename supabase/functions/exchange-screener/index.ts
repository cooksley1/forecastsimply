const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive ticker lists per exchange
const EXCHANGE_TICKERS: Record<string, string[]> = {
  ASX: [
    // Banks & Finance
    'CBA.AX','WBC.AX','NAB.AX','ANZ.AX','MQG.AX','SUN.AX','QBE.AX','IAG.AX','BOQ.AX','BEN.AX',
    'AMP.AX','IFL.AX','CGF.AX','PPT.AX','HUB.AX','CPU.AX','ASX.AX','MPL.AX',
    // Mining & Resources
    'BHP.AX','RIO.AX','FMG.AX','MIN.AX','S32.AX','NCM.AX','NST.AX','EVN.AX','PLS.AX','LYC.AX',
    'ILU.AX','IGO.AX','SFR.AX','WHC.AX','AWC.AX','STO.AX','WDS.AX','ORG.AX',
    'BPT.AX','DRR.AX','LTR.AX','PDN.AX','DEG.AX','RED.AX',
    // Healthcare
    'CSL.AX','RMD.AX','COH.AX','SHL.AX','RHC.AX','HLS.AX','ANN.AX','FPH.AX','PME.AX',
    'AVH.AX','EBO.AX','TLX.AX','PNV.AX',
    // Consumer & Retail
    'WES.AX','WOW.AX','COL.AX','JBH.AX','HVN.AX','SUL.AX','LOV.AX','BRG.AX','PMV.AX',
    'KGN.AX','BAP.AX','CTD.AX',
    // Telco & Tech
    'TLS.AX','XRO.AX','WTC.AX','REA.AX','SQ2.AX','ALL.AX','TNE.AX','NXT.AX','ALU.AX',
    'SEK.AX','CAR.AX','REH.AX','MP1.AX','TPG.AX','LNK.AX',
    // Industrials & Infrastructure
    'TCL.AX','QAN.AX','BXB.AX','AMC.AX','BLD.AX','ABC.AX','JHX.AX','ORI.AX','IPL.AX',
    'NUF.AX','WOR.AX','DOW.AX','CWY.AX','ALX.AX','APA.AX',
    // REITs & Property
    'GMG.AX','DXS.AX','GPT.AX','MGR.AX','SGP.AX','CHC.AX','SCG.AX','VCX.AX','GOZ.AX','LLC.AX',
    // Food, Bev & Agriculture
    'TWE.AX','A2M.AX','ING.AX','GNC.AX','ELD.AX',
    // Other
    'TAH.AX','SGR.AX','WEB.AX','RWC.AX','ARB.AX',
    'IEL.AX','GQG.AX','NEC.AX','EDV.AX','CKF.AX','NHF.AX',
  ],
};

// Estimated dividend yields (used as fallback) 
const ESTIMATED_YIELDS: Record<string, number> = {
  'CBA.AX': 3.5, 'WBC.AX': 5.0, 'NAB.AX': 4.5, 'ANZ.AX': 5.3, 'MQG.AX': 3.0,
  'BHP.AX': 5.2, 'RIO.AX': 5.8, 'FMG.AX': 7.0, 'CSL.AX': 1.0, 'WES.AX': 3.2,
  'WOW.AX': 2.8, 'TLS.AX': 4.2, 'SUN.AX': 4.8, 'QBE.AX': 3.5, 'IAG.AX': 4.0,
  'STO.AX': 4.5, 'WDS.AX': 5.0, 'ORG.AX': 3.8, 'TCL.AX': 3.5, 'COL.AX': 3.0,
  'JBH.AX': 3.5, 'S32.AX': 4.0, 'BXB.AX': 2.5, 'AMC.AX': 3.8, 'GPT.AX': 5.5,
  'DXS.AX': 6.0, 'MGR.AX': 4.5, 'SGP.AX': 5.0, 'SCG.AX': 5.5, 'VCX.AX': 5.8,
  'GMG.AX': 1.5, 'TWE.AX': 3.0, 'WHC.AX': 8.0, 'APA.AX': 6.5, 'BOQ.AX': 5.5,
  'BEN.AX': 5.8, 'IPL.AX': 3.0, 'ORI.AX': 3.5, 'NHF.AX': 4.0, 'MPL.AX': 3.5,
  'HVN.AX': 4.5, 'CPU.AX': 2.0, 'ALX.AX': 6.0, 'GOZ.AX': 5.5, 'CHC.AX': 4.5,
  'TAH.AX': 3.5, 'NCM.AX': 1.5, 'NST.AX': 2.0, 'EVN.AX': 2.5, 'MIN.AX': 4.0,
  'BLD.AX': 3.0, 'ABC.AX': 3.5, 'JHX.AX': 2.0, 'QAN.AX': 2.0, 'RMD.AX': 0.8,
  'COH.AX': 1.5, 'SHL.AX': 3.0, 'RHC.AX': 2.5, 'ANN.AX': 2.0, 'SUL.AX': 3.5,
  'CWY.AX': 2.0, 'DOW.AX': 3.0, 'WOR.AX': 3.5, 'NUF.AX': 2.0, 'ING.AX': 3.5,
  'ELD.AX': 2.5, 'ARB.AX': 1.5, 'RWC.AX': 2.0, 'BAP.AX': 2.5, 'PMV.AX': 3.5,
  'LNK.AX': 4.0, 'TPG.AX': 1.5, 'NEC.AX': 1.0, 'EDV.AX': 2.5, 'GQG.AX': 5.0,
  'IEL.AX': 2.0, 'LLC.AX': 3.0, 'CGF.AX': 4.0, 'IFL.AX': 5.0, 'AMP.AX': 3.0,
  'PPT.AX': 4.5, 'SGR.AX': 0, 'WEB.AX': 1.0, 'CKF.AX': 3.0,
  // Growth / no div
  'XRO.AX': 0, 'WTC.AX': 0.3, 'REA.AX': 1.0, 'SQ2.AX': 0, 'ALL.AX': 2.0,
  'TNE.AX': 1.5, 'NXT.AX': 0, 'ALU.AX': 0, 'SEK.AX': 1.5, 'CAR.AX': 2.0,
  'REH.AX': 1.0, 'MP1.AX': 0, 'PME.AX': 0.5, 'LOV.AX': 2.0, 'BRG.AX': 2.5,
  'PLS.AX': 0, 'LYC.AX': 0, 'ILU.AX': 3.0, 'IGO.AX': 1.5, 'SFR.AX': 0,
  'AWC.AX': 3.0, 'BPT.AX': 2.0, 'DRR.AX': 8.0, 'LTR.AX': 0, 'PDN.AX': 0,
  'DEG.AX': 0, 'RED.AX': 0, 'FPH.AX': 1.5, 'HLS.AX': 3.0, 'AVH.AX': 0,
  'EBO.AX': 3.0, 'TLX.AX': 0, 'PNV.AX': 0, 'KGN.AX': 0, 'CTD.AX': 2.0,
  'HUB.AX': 1.0, 'A2M.AX': 0, 'GNC.AX': 3.0, 'ASX.AX': 3.0,
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Fetch chart metadata for a single ticker via the existing yahoo-proxy
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const exchange = (url.searchParams.get('exchange') || 'ASX').toUpperCase();
    
    const tickers = EXCHANGE_TICKERS[exchange];
    if (!tickers) {
      return new Response(
        JSON.stringify({ success: false, error: `Exchange '${exchange}' not supported` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[exchange-screener] Fetching ${tickers.length} tickers for ${exchange}`);

    // Fetch metadata in parallel batches of 10
    const batchSize = 10;
    const metaResults: (any | null)[] = [];
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fetchTickerMeta));
      metaResults.push(...batchResults);
      // Small delay between batches
      if (i + batchSize < tickers.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const stocks = tickers.map((sym, idx) => {
      const meta = metaResults[idx];
      const estYield = ESTIMATED_YIELDS[sym] ?? 0;
      
      if (meta) {
        const change = meta.prevClose > 0 
          ? ((meta.price - meta.prevClose) / meta.prevClose) * 100 
          : 0;
        return {
          sym: meta.sym,
          name: meta.name,
          price: meta.price,
          change: Math.round(change * 100) / 100,
          div: estYield > 0,
          yield: estYield,
        };
      }
      
      // Fallback with just the symbol
      return {
        sym,
        name: sym.replace('.AX', ''),
        price: 0,
        change: 0,
        div: estYield > 0,
        yield: estYield,
      };
    }).filter(s => s.price > 0); // Only return stocks we got data for

    console.log(`[exchange-screener] Returned ${stocks.length} stocks for ${exchange}`);

    return new Response(
      JSON.stringify({ success: true, exchange, count: stocks.length, stocks }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        } 
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
