import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // Health check support
    if (body?.action === "health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pick_id } = body;
    if (!pick_id) throw new Error("pick_id is required");

    // Fetch the pick
    const { data: pick, error: pickErr } = await sb
      .from("tracked_picks")
      .select("*")
      .eq("id", pick_id)
      .single();
    if (pickErr || !pick) throw new Error(`Pick not found: ${pickErr?.message}`);

    // Fetch snapshots
    const { data: snapshots } = await sb
      .from("pick_snapshots")
      .select("*")
      .eq("pick_id", pick_id)
      .order("snapshot_date", { ascending: true });

    const snaps = snapshots ?? [];

    // Build performance summary for the prompt
    const finalPrice = pick.final_price ?? snaps[snaps.length - 1]?.price ?? pick.entry_price;
    const returnPct = pick.final_return_pct ?? ((finalPrice - pick.entry_price) / pick.entry_price * 100);

    // Forecast accuracy per method
    const methods = ["ensemble", "linear", "holt", "ema_momentum", "monte_carlo"] as const;
    const forecastSummary: Record<string, string> = {};

    for (const method of methods) {
      const forecastField = `forecast_${method === "ema_momentum" ? "ema" : method}` as string;
      const pickForecast = pick[forecastField as keyof typeof pick] as any[];
      const lastForecast = pickForecast?.length ? pickForecast[pickForecast.length - 1] : null;

      if (snaps.length > 0) {
        const lastSnap = snaps[snaps.length - 1];
        const snapField = `forecast_${method === "ema_momentum" ? "ema" : method}_price` as string;
        const forecastPrice = (lastSnap as any)[snapField] as number | null;
        if (forecastPrice !== null && forecastPrice !== undefined) {
          const error = Math.abs((lastSnap.price - forecastPrice) / lastSnap.price * 100);
          const dirCorrect = (lastSnap.price > pick.entry_price) === (forecastPrice > pick.entry_price);
          forecastSummary[method] = `Predicted $${forecastPrice.toFixed(2)}, actual $${lastSnap.price.toFixed(2)} (error: ${error.toFixed(1)}%, direction: ${dirCorrect ? "correct" : "wrong"})`;
        }
      }
    }

    const snapshotTimeline = snaps.map(s =>
      `${s.snapshot_date}: $${s.price} (${s.change_from_entry_pct > 0 ? "+" : ""}${Number(s.change_from_entry_pct).toFixed(2)}%)`
    ).join("\n");

    const prompt = `You are a senior financial analyst writing a post-mortem case study for a tracked investment pick. Write a concise, insightful case study (300-500 words) in markdown format.

## Pick Details
- **Asset**: ${pick.name} (${pick.symbol})
- **Asset Type**: ${pick.asset_type}
- **Month**: ${pick.month_start}
- **Entry Price**: $${pick.entry_price}
- **Final Price**: $${finalPrice.toFixed(2)}
- **Return**: ${returnPct > 0 ? "+" : ""}${returnPct.toFixed(2)}%
- **Signal**: ${pick.signal_label} (score: ${pick.signal_score}/100, confidence: ${pick.confidence}%)
- **Target Price**: ${pick.target_price ? "$" + pick.target_price : "N/A"}
- **Stop Loss**: ${pick.stop_loss ? "$" + pick.stop_loss : "N/A"}
- **Entry Reasoning**: ${pick.reasoning || "N/A"}

## Daily Price Timeline
${snapshotTimeline || "No snapshots available"}

## Forecast Method Results
${Object.entries(forecastSummary).map(([m, s]) => `- **${m}**: ${s}`).join("\n") || "No forecast data available"}

Write the case study with these sections:
## Performance Summary
Brief overview of the pick's outcome.

### What Worked
Analyze which forecast methods were most accurate and why the entry signal was right/wrong.

### What Didn't Work  
Identify forecast methods that missed and potential reasons.

### Key Takeaways
2-3 actionable lessons for future picks. Be specific about which models to trust more in similar market conditions.

### Forecast Model Rankings
Rank the forecast methods from most to least accurate for this pick with one-line explanations.

Use a professional but accessible tone. Reference specific numbers. Do NOT use generic filler.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a financial analyst who writes concise, data-driven case studies." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const caseStudyText = aiData.choices?.[0]?.message?.content ?? "";

    // Save to the pick
    const { error: updateErr } = await sb
      .from("tracked_picks")
      .update({ case_study_text: caseStudyText })
      .eq("id", pick_id);

    if (updateErr) throw new Error(`Failed to save case study: ${updateErr.message}`);

    return new Response(JSON.stringify({ success: true, case_study_text: caseStudyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-case-study error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
