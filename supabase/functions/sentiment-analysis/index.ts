import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Exchange code → readable prefix for search queries ── */
const EXCHANGE_PREFIXES: Record<string, string> = {
  '.AX': 'ASX', '.L': 'LSE', '.TO': 'TSX', '.HK': 'HKEX',
  '.T': 'TYO', '.SI': 'SGX', '.KS': 'KRX', '.NS': 'NSE',
  '.BO': 'BSE', '.DE': 'XETRA', '.PA': 'Euronext',
};

function extractExchange(symbol: string): { ticker: string; suffix: string; exchange: string } {
  for (const [suffix, exchange] of Object.entries(EXCHANGE_PREFIXES)) {
    if (symbol.endsWith(suffix)) {
      return { ticker: symbol.replace(suffix, ''), suffix, exchange };
    }
  }
  return { ticker: symbol, suffix: '', exchange: '' };
}

interface Headline {
  title: string;
  source: string;
  date: string;
  url?: string;
}

/* ── Google News RSS (free, global coverage) ── */
async function fetchGoogleNews(query: string, limit = 8): Promise<Headline[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=AU&ceid=AU:en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: Headline[] = [];
    // Simple XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || 'Google News';
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';

      if (title) {
        const dateStr = pubDate ? new Date(pubDate).toLocaleDateString() : '';
        items.push({ title: title.trim(), source, date: dateStr, url: link });
      }
    }
    return items;
  } catch (e) {
    console.warn('[Google News] fetch failed:', e);
    return [];
  }
}

/* ── Yahoo Finance news search ── */
async function fetchYahooNews(query: string, limit = 8): Promise<Headline[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=${limit}&quotesCount=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.news || []).slice(0, limit).map((n: any) => ({
      title: n.title,
      source: n.publisher || 'Yahoo Finance',
      date: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleDateString() : '',
      url: n.link || '',
    }));
  } catch (e) {
    console.warn('[Yahoo News] fetch failed:', e);
    return [];
  }
}

/* ── Deduplicate headlines by fuzzy title matching ── */
function deduplicateHeadlines(headlines: Headline[]): Headline[] {
  const seen = new Set<string>();
  return headlines.filter(h => {
    // Normalize: lowercase, remove punctuation, trim
    const key = h.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, name, assetType, currentPrice, signalLabel, signalScore } = await req.json();

    if (!symbol || !name) {
      return new Response(JSON.stringify({ error: "Missing symbol or name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticker, suffix, exchange } = extractExchange(symbol);
    const year = new Date().getFullYear();

    // ── 1. Build multiple search queries for broad coverage ──
    const queries: string[] = [];

    if (assetType === 'crypto') {
      queries.push(`${name} crypto news ${year}`);
      queries.push(`${ticker} cryptocurrency`);
    } else {
      // Primary: company name + context
      queries.push(`"${name}" ${exchange ? exchange : 'stock'} news ${year}`);
      // Ticker with exchange prefix (e.g., "ASX:HFY" or "ASX HFY")
      if (exchange) {
        queries.push(`${exchange}:${ticker} news`);
        queries.push(`${exchange} ${ticker} stock`);
      }
      // Raw ticker + name combo
      queries.push(`${ticker} ${name} investor`);
      // Yahoo-specific: use full symbol
      queries.push(symbol);
    }

    console.log(`[Sentiment] Fetching news for ${symbol} (${name}) with ${queries.length} queries`);

    // ── 2. Fetch from multiple sources in parallel ──
    const allHeadlines: Headline[] = [];

    // Google News: run top 3 queries in parallel
    const googlePromises = queries.slice(0, 3).map(q => fetchGoogleNews(q, 6));
    // Yahoo Finance: use symbol + name
    const yahooPromises = [
      fetchYahooNews(symbol, 8),
      fetchYahooNews(name, 5),
    ];

    const results = await Promise.all([...googlePromises, ...yahooPromises]);
    for (const batch of results) {
      allHeadlines.push(...batch);
    }

    // Deduplicate
    const headlines = deduplicateHeadlines(allHeadlines);
    console.log(`[Sentiment] Found ${allHeadlines.length} raw → ${headlines.length} unique headlines`);

    // ── 3. Format for AI ──
    const newsBlock = headlines.length > 0
      ? `Recent news headlines for ${name} (${symbol}):\n${headlines.map((h, i) => `${i + 1}. ${h.title} — ${h.source}${h.date ? ` (${h.date})` : ''}`).join("\n")}`
      : `No recent news found for ${name} (${symbol}). Base your analysis on general market knowledge and the asset's sector/industry context.`;

    // ── 4. Send to AI for synthesis ──
    const systemPrompt = `You are a financial sentiment analyst. You analyze news, market events, and qualitative factors that technical indicators can't capture — things like earnings reports, regulatory changes, insider trading patterns, management changes, industry trends, and macroeconomic factors.

Your job is to:
1. Summarize the key news themes and events affecting this asset
2. Identify potential catalysts (positive or negative) for price movement
3. Assess overall market sentiment (Bullish, Neutral, or Bearish)
4. Provide a sentiment score from -10 (extremely bearish) to +10 (extremely bullish)
5. Explain how this sentiment aligns with or contradicts the technical analysis signal

Be specific, cite the news items by number, and be honest when data is limited. Never fabricate news or events.
If headlines are available, reference them specifically. If limited, say so clearly.`;

    const userPrompt = `Analyze the current sentiment for:

Asset: ${name} (${symbol})
Type: ${assetType}${exchange ? ` · Exchange: ${exchange}` : ''}
Current Price: $${currentPrice}
Technical Signal: ${signalLabel} (score: ${signalScore}/15)

${newsBlock}

Provide your analysis as JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary of sentiment",
  "themes": ["theme1", "theme2", "theme3"],
  "catalysts": {
    "positive": ["catalyst1", "catalyst2"],
    "negative": ["catalyst1", "catalyst2"]
  },
  "sentiment": "Bullish" | "Neutral" | "Bearish",
  "sentimentScore": number (-10 to +10),
  "confidence": number (0-100),
  "technicalAlignment": "Confirms" | "Neutral" | "Contradicts",
  "alignmentExplanation": "1-2 sentences on how sentiment relates to the technical signal",
  "adjustedSignalLabel": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
  "adjustedSignalScore": number (-15 to +15),
  "adjustmentReasoning": "Why the blended score differs from pure technicals",
  "newsQuality": "Rich" | "Moderate" | "Limited",
  "disclaimer": "Brief note about limitations of this analysis"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from the response (handle markdown code blocks)
    let analysis;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      analysis = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      analysis = {
        summary: content.slice(0, 500),
        themes: [],
        catalysts: { positive: [], negative: [] },
        sentiment: "Neutral",
        sentimentScore: 0,
        confidence: 30,
        technicalAlignment: "Neutral",
        alignmentExplanation: "Unable to parse structured analysis.",
        adjustedSignalLabel: signalLabel,
        adjustedSignalScore: signalScore,
        adjustmentReasoning: "Raw analysis returned — structured parsing failed.",
        newsQuality: "Limited",
        disclaimer: "Analysis may be incomplete due to parsing issues.",
      };
    }

    // Attach the headlines we found so the frontend can display them
    analysis.headlines = headlines.slice(0, 12).map(h => ({
      title: h.title,
      source: h.source,
      date: h.date,
      url: h.url || null,
    }));
    analysis.headlineCount = headlines.length;

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Sentiment analysis error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
