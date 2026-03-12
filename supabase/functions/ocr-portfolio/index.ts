import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { image_base64, mime_type } = await req.json();
    if (!image_base64) throw new Error("No image data provided");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a portfolio data extractor. Given an image of a brokerage/trading platform screenshot, statement, or portfolio listing, extract holdings data.

Return a JSON array of holdings. Each holding should have:
- symbol: stock ticker or crypto symbol (uppercase)
- name: full name if visible, otherwise same as symbol
- asset_type: one of "crypto", "stocks", "etfs", "forex"
- quantity: number of units/shares held (0 if not visible)
- avg_price: average purchase price per unit (0 if not visible)

Only return valid JSON array. No markdown, no explanation. If you can't extract any holdings, return an empty array [].
Example: [{"symbol":"AAPL","name":"Apple Inc","asset_type":"stocks","quantity":10,"avg_price":150.25}]`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all portfolio holdings from this image. Return only the JSON array.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mime_type || "image/png"};base64,${image_base64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI extraction failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON from the response
    let holdings = [];
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        holdings = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse AI response:", content);
    }

    return new Response(JSON.stringify({ holdings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ocr-portfolio error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
