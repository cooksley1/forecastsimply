import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ── 1. Fetch Yahoo Finance news ──
    let newsHeadlines: string[] = [];
    try {
      const yahooNewsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0`;
      const newsRes = await fetch(yahooNewsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        newsHeadlines = (newsData.news || [])
          .slice(0, 10)
          .map((n: any) => `- ${n.title} (${n.publisher}, ${new Date(n.providerPublishTime * 1000).toLocaleDateString()})`);
      }
    } catch (e) {
      console.error("Yahoo news fetch failed:", e);
    }

    // ── 2. Try a broader web search via Yahoo for more context ──
    let additionalContext = "";
    try {
      const searchTerms = assetType === "crypto"
        ? `${name} crypto news outlook ${new Date().getFullYear()}`
        : `${symbol} ${name} stock news earnings outlook ${new Date().getFullYear()}`;

      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchTerms)}&newsCount=5&quotesCount=0`;
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const extraNews = (searchData.news || [])
          .slice(0, 5)
          .map((n: any) => `- ${n.title} (${n.publisher})`)
          .filter((h: string) => !newsHeadlines.includes(h));
        if (extraNews.length > 0) {
          additionalContext = `\n\nAdditional related news:\n${extraNews.join("\n")}`;
        }
      }
    } catch (e) {
      console.error("Additional search failed:", e);
    }

    const newsBlock = newsHeadlines.length > 0
      ? `Recent news headlines for ${name} (${symbol}):\n${newsHeadlines.join("\n")}${additionalContext}`
      : `No recent news found for ${name} (${symbol}). Base your analysis on general market knowledge.${additionalContext}`;

    // ── 3. Send to AI for synthesis ──
    const systemPrompt = `You are a financial sentiment analyst. You analyze news, market events, and qualitative factors that technical indicators can't capture — things like earnings reports, regulatory changes, insider trading patterns, management changes, industry trends, and macroeconomic factors.

Your job is to:
1. Summarize the key news themes and events affecting this asset
2. Identify potential catalysts (positive or negative) for price movement
3. Assess overall market sentiment (Bullish, Neutral, or Bearish)
4. Provide a sentiment score from -10 (extremely bearish) to +10 (extremely bullish)
5. Explain how this sentiment aligns with or contradicts the technical analysis signal

Be specific, cite the news items, and be honest when data is limited. Never fabricate news or events.`;

    const userPrompt = `Analyze the current sentiment for:

Asset: ${name} (${symbol})
Type: ${assetType}
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
      // If JSON parsing fails, return raw content
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
