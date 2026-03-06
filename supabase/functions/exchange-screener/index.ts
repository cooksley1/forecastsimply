const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive ASX ticker list — ASX 200 + key small/mid caps (~280 tickers)
const ASX_TICKERS = [
  // Banks & Finance
  'CBA.AX','WBC.AX','NAB.AX','ANZ.AX','MQG.AX','SUN.AX','QBE.AX','IAG.AX','BOQ.AX','BEN.AX',
  'AMP.AX','IFL.AX','CGF.AX','PPT.AX','HUB.AX','CPU.AX','ASX.AX','MPL.AX','NHF.AX','SDF.AX',
  'PNI.AX','JDO.AX','GQG.AX','PDL.AX','PTM.AX','MFG.AX','JHG.AX','NWL.AX',
  // Mining & Resources — Major
  'BHP.AX','RIO.AX','FMG.AX','MIN.AX','S32.AX','NCM.AX','NST.AX','EVN.AX','PLS.AX','LYC.AX',
  'ILU.AX','IGO.AX','SFR.AX','WHC.AX','AWC.AX','WAF.AX','GOR.AX','CMM.AX','RRL.AX','SLR.AX',
  'WGX.AX','PRU.AX','MVR.AX','GEN.AX','29M.AX','CRN.AX','YAL.AX','NHC.AX','TIG.AX',
  // Mining & Resources — Small/Mid
  'LTR.AX','PDN.AX','DEG.AX','RED.AX','DRR.AX','BGL.AX','AIS.AX','PAN.AX','SYR.AX','AGY.AX',
  'CXO.AX','GLN.AX','TIE.AX','NMT.AX','LKE.AX','VUL.AX','AKE.AX','LPI.AX','FFX.AX',
  // Energy
  'STO.AX','WDS.AX','ORG.AX','BPT.AX','KAR.AX','VEA.AX','WHC.AX','NRG.AX','CEN.AX',
  // Healthcare
  'CSL.AX','RMD.AX','COH.AX','SHL.AX','RHC.AX','HLS.AX','ANN.AX','FPH.AX','PME.AX',
  'AVH.AX','EBO.AX','TLX.AX','PNV.AX','NAN.AX','IMU.AX','RAD.AX','TYR.AX','DVP.AX',
  'NEU.AX','LYL.AX','IDX.AX','MSB.AX','IPD.AX','VHT.AX',
  // Consumer & Retail
  'WES.AX','WOW.AX','COL.AX','JBH.AX','HVN.AX','SUL.AX','LOV.AX','BRG.AX','PMV.AX',
  'KGN.AX','BAP.AX','CTD.AX','ADH.AX','NCK.AX','UNI.AX','BBN.AX','AX1.AX','MVF.AX',
  'SHV.AX','RFG.AX','DMP.AX','CCX.AX','BGA.AX','FLT.AX','WEB.AX','ALL.AX','TAH.AX','SGR.AX',
  // Telco & Tech
  'TLS.AX','XRO.AX','WTC.AX','REA.AX','SQ2.AX','TNE.AX','NXT.AX','ALU.AX',
  'SEK.AX','CAR.AX','REH.AX','MP1.AX','TPG.AX','LNK.AX','NXL.AX','MNF.AX','UNS.AX',
  'FCL.AX','ALC.AX','SIG.AX','PPS.AX','TYR.AX','FNX.AX','HUM.AX','DTL.AX','PME.AX',
  'LOG.AX','DUB.AX','AD8.AX','PBH.AX','APX.AX','PPE.AX','OPN.AX','MEZ.AX',
  // Industrials & Infrastructure
  'TCL.AX','QAN.AX','BXB.AX','AMC.AX','BLD.AX','ABC.AX','JHX.AX','ORI.AX','IPL.AX',
  'NUF.AX','WOR.AX','DOW.AX','CWY.AX','ALX.AX','APA.AX','BSL.AX','GWA.AX','ANG.AX',
  'NWH.AX','MND.AX','SVW.AX','DRR.AX','GNG.AX','SKC.AX','REG.AX','RWC.AX','ARB.AX',
  'SSM.AX','CVL.AX','LIC.AX','PGH.AX','NVX.AX','ORA.AX',
  // REITs & Property
  'GMG.AX','DXS.AX','GPT.AX','MGR.AX','SGP.AX','CHC.AX','SCG.AX','VCX.AX','GOZ.AX','LLC.AX',
  'CLW.AX','CIP.AX','ABP.AX','ARF.AX','BWP.AX','CNI.AX','HMC.AX','NSR.AX','CQR.AX','HDN.AX',
  'HPI.AX','AOF.AX','URW.AX','SCP.AX','GDI.AX','WPR.AX',
  // Food, Bev & Agriculture
  'TWE.AX','A2M.AX','ING.AX','GNC.AX','ELD.AX','CGC.AX','BGA.AX','NUF.AX','AAC.AX',
  'TGR.AX','SHV.AX','FBR.AX','RIC.AX',
  // Insurance & Diversified Financials
  'NEC.AX','EDV.AX','CKF.AX','IEL.AX','CCP.AX','OFX.AX','TYR.AX','ZIP.AX','SZL.AX',
  'BRN.AX','APE.AX','EQT.AX','FWD.AX','GMA.AX','HUB.AX','JAN.AX',
  // Utilities & Renewables
  'AGL.AX','MEZ.AX','MCY.AX','INF.AX','PGY.AX','AZJ.AX','ALD.AX','VEA.AX','CEN.AX',
];

// Remove duplicates
const ASX_UNIQUE = [...new Set(ASX_TICKERS)];

const EXCHANGE_TICKERS: Record<string, string[]> = {
  ASX: ASX_UNIQUE,
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
  // Additional yields
  'AGL.AX': 4.0, 'MFG.AX': 6.0, 'JHG.AX': 5.0, 'PTM.AX': 7.0, 'PDL.AX': 4.5,
  'CLW.AX': 5.5, 'CIP.AX': 5.0, 'ABP.AX': 5.5, 'ARF.AX': 4.5, 'BWP.AX': 4.0,
  'NSR.AX': 3.5, 'CQR.AX': 5.5, 'HDN.AX': 5.0, 'SCP.AX': 5.5, 'GDI.AX': 6.0,
  'WPR.AX': 5.0, 'AZJ.AX': 5.0, 'BSL.AX': 3.0, 'GWA.AX': 4.0, 'ORA.AX': 3.5,
  'PGH.AX': 4.5, 'MCY.AX': 4.0, 'MND.AX': 3.0, 'SVW.AX': 2.5, 'DMP.AX': 2.0,
  'FLT.AX': 2.0, 'KAR.AX': 2.0, 'VEA.AX': 3.0, 'RRL.AX': 2.0, 'WAF.AX': 0,
  'GOR.AX': 1.5, 'CMM.AX': 0, 'SLR.AX': 0, 'WGX.AX': 1.0, 'ZIP.AX': 0,
  'BRN.AX': 0, 'SZL.AX': 0, 'NWH.AX': 3.0, 'GNG.AX': 3.5, 'OFX.AX': 3.0,
  'CCP.AX': 4.0, 'EQT.AX': 3.5, 'TGR.AX': 2.5, 'AD8.AX': 0, 'APX.AX': 0,
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

    // Fetch metadata in parallel batches of 15 (increased from 10)
    const batchSize = 15;
    const metaResults: (any | null)[] = [];
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fetchTickerMeta));
      metaResults.push(...batchResults);
      // Minimal delay between batches
      if (i + batchSize < tickers.length) {
        await new Promise(r => setTimeout(r, 100));
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
