import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's recent analysis history and watchlist
    const [historyRes, watchlistRes, prefsRes] = await Promise.all([
      supabase
        .from("analysis_history")
        .select("asset_id, asset_type, symbol, name, signal_label, signal_score, market_phase, price")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("watchlist_items")
        .select("asset_id, asset_type, symbol, name")
        .eq("user_id", user.id)
        .limit(20),
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const history = historyRes.data || [];
    const watchlist = watchlistRes.data || [];
    const prefs = prefsRes.data;

    // Build context for AI
    const recentAssets = history.map(h => `${h.name} (${h.symbol}) - Signal: ${h.signal_label} (${h.signal_score}/100), Phase: ${h.market_phase || "unknown"}`).join("\n");
    const watchlistAssets = watchlist.map(w => `${w.name} (${w.symbol}, ${w.asset_type})`).join(", ");
    const riskProfile = prefs?.risk_profile || "moderate";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are ForecastSimply's market insights AI. Generate a personalised market digest based on the user's trading history and watchlist. Be concise, actionable, and data-driven. Risk profile: ${riskProfile}. 

Format your response as JSON with this structure:
{
  "greeting": "Short personalised greeting",
  "market_summary": "2-3 sentence market overview",
  "insights": [
    {"asset": "SYMBOL", "name": "Asset Name", "type": "crypto|stocks|etfs|forex", "insight": "Brief actionable insight", "sentiment": "bullish|bearish|neutral"}
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "watchlist_alerts": ["Alert about watchlist item if relevant"]
}

Keep insights to 3-5 items max. Focus on assets the user has analysed or is watching. If no history, give general market tips.`,
          },
          {
            role: "user",
            content: `My recent analyses:\n${recentAssets || "None yet"}\n\nMy watchlist: ${watchlistAssets || "Empty"}\n\nGenerate my personalised market digest.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let digest;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      digest = JSON.parse(jsonStr);
    } catch {
      digest = {
        greeting: "Welcome back!",
        market_summary: content.slice(0, 200),
        insights: [],
        recommendations: [],
        watchlist_alerts: [],
      };
    }

    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("curated-digest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
