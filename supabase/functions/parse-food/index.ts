// ============================================================================
// Supabase Edge Function: parse-food
// ----------------------------------------------------------------------------
// Replaces the old Express "/api/parse" route.
//  - Calls DeepSeek to structure free text into food items (with quantities).
//  - Enriches each item with accurate per-100g nutrition from Open Food Facts
//    when a match is found; otherwise keeps the AI estimate.
//  - Returns { meal, items[] } — the frontend then inserts into the "logs"
//    table directly over the REST/Data API with the user's own JWT (RLS
//    scopes records to the signed-in user).
//
// Secrets (set in Supabase Dashboard -> Edge Functions -> Manage Secrets):
//   DEEPSEEK_API_KEY   (required)   the DeepSeek API key
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const text = (body.text || "").trim();
  const noDb = body.noDb === true;

  if (!text) {
    return json({ error: "No text provided" }, 400, corsHeaders);
  }

  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekKey) {
    return json(
      {
        error: "DEEPSEEK_API_KEY not configured",
        message:
          "Set the DEEPSEEK_API_KEY secret in Supabase (Edge Functions -> Manage Secrets).",
      },
      500,
      corsHeaders
    );
  }

  try {
    const parsed = await callDeepSeek(deepseekKey, text);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    let enriched;
    if (noDb) {
      enriched = items.map((it) => ({ ...it, source: "ai" }));
    } else {
      enriched = await Promise.all(items.map(enrichWithOpenFoodFacts));
    }

    return json({ ...parsed, items: enriched }, 200, corsHeaders);
  } catch (err) {
    console.error("parse error:", err.message);
    return json({ error: "Request failed: " + err.message }, 502, corsHeaders);
  }
});

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// DeepSeek
// ---------------------------------------------------------------------------
async function callDeepSeek(apiKey, userText) {
  const systemPrompt = `
You are a nutrition parsing assistant. Given a user's description of food they
ate (from typed text or voice transcription), extract structured food items.

For each food item, return:
- "food": a display name (singular, capitalized)
- "quantity": the amount as a number
- "unit": the unit of measure (g, ml, cup, tbsp, tsp, piece, slice, bowl, oz, lb, item, egg, etc.)
- "calories", "protein", "carbs", "fats": estimated nutrient values for the
  EXACT quantity given (protein, carbs, fats in grams; calories in kcal)

Rules:
- Compute macros for the quantity actually consumed (e.g. "150g chicken breast"
  means macros for 150g, not per 100g).
- If quantity or unit is missing, estimate a sensible single serving and say so.
- Use your nutrition knowledge; be as accurate as reasonable.
- If something is ambiguous, make a reasonable best guess.
- "meal" must be one of: breakfast, lunch, dinner, snack.

Return JSON ONLY (no markdown, no extra text) with this shape:
{
  "meal": "lunch",
  "items": [
    {
      "food": "Chicken breast",
      "quantity": 150,
      "unit": "g",
      "calories": 247,
      "protein": 46.5,
      "carbs": 0,
      "fats": 5.4
    }
  ]
}`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek returned ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const cleaned = content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Could not parse DeepSeek response: " + content);
  }
}

// ---------------------------------------------------------------------------
// Open Food Facts
// ---------------------------------------------------------------------------
const OFF_USER_AGENT = "FoodLogApp/1.0 (foodapp@example.com)";

function numOrNull(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function round1(v) {
  return Math.round(v * 10) / 10;
}

async function searchOpenFoodFacts(name) {
  try {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl" +
      "?search_terms=" + encodeURIComponent(name) +
      "&search_simple=1&action=process&json=1&page_size=5" +
      "&fields=product_name,brands,categories,nutriments";
    const res = await fetch(url, {
      headers: { "User-Agent": OFF_USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const products = Array.isArray(data.products) ? data.products : [];
    for (const p of products) {
      const n = p.nutriments || {};
      const kcal100 = numOrNull(n["energy-kcal_100g"] || n["energy-kcal"]);
      const protein100 = numOrNull(n["proteins_100g"]);
      const carbs100 = numOrNull(n["carbohydrates_100g"]);
      const fats100 = numOrNull(n["fat_100g"]);
      if (kcal100 != null && (protein100 != null || carbs100 != null)) {
        return {
          source: "openfoodfacts",
          offName: p.product_name || p.brands || name,
          per100g: {
            calories: kcal100,
            protein: protein100 ?? 0,
            carbs: carbs100 ?? 0,
            fats: fats100 ?? 0,
          },
        };
      }
    }
    return null;
  } catch (err) {
    console.error("Open Food Facts error:", err.message);
    return null;
  }
}

async function enrichWithOpenFoodFacts(item) {
  const match = await searchOpenFoodFacts(item.food);
  if (!match) {
    return { ...item, source: "ai" };
  }
  const qty = numOrNull(item.quantity) || 100;
  const factor = qty / 100;
  return {
    ...item,
    source: "openfoodfacts",
    offName: match.offName,
    calories: round1(match.per100g.calories * factor),
    protein: round1(match.per100g.protein * factor),
    carbs: round1(match.per100g.carbs * factor),
    fats: round1(match.per100g.fats * factor),
  };
}
