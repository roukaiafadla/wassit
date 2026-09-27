import { CATEGORIES, URGENCIES, PRICE_BASELINES } from "../config/jobTaxonomy.js";

/**
 * POST /api/ai/suggest-job — free text -> { category, urgency, priceMin, priceMax }.
 *
 * Uses Google's Gemini API (free tier — no credit card, no billing setup,
 * see aistudio.google.com). If the call fails or the model returns
 * something we can't parse/trust, we fall back to keywordFallback() below
 * instead of blocking job creation — an AI outage should never stop
 * someone from posting a job, it should just make the suggestion dumber.
 */
export async function suggestJobDetails(description) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[aiService] GEMINI_API_KEY not set — using keyword fallback");
    return keywordFallback(description);
  }

  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [{ parts: [{ text: description }] }],
        generationConfig: {
          responseMimeType: "application/json", // Gemini guarantees valid JSON back with this set
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[aiService] Gemini API error ${response.status}:`, body);
      return keywordFallback(description);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[aiService] No text in Gemini response:", JSON.stringify(data));
      return keywordFallback(description);
    }

    return parseAndValidate(text, description);
  } catch (err) {
    console.error("[aiService] Request failed:", err.message);
    return keywordFallback(description);
  }
}

function buildSystemPrompt() {
  const baselineLines = CATEGORIES.map(
    (c) => `- ${c}: ${PRICE_BASELINES[c].min}-${PRICE_BASELINES[c].max} DA`
  ).join("\n");

  return `You classify hyperlocal service job requests for Wassit, a services marketplace.

Given a free-text job description, respond with ONLY a JSON object (no markdown, no code fences, no preamble) with exactly these fields:
- "category": one of [${CATEGORIES.join(", ")}]
- "urgency": one of [${URGENCIES.join(", ")}] (based on tone/wording like "tonight", "emergency", "whenever" — default "medium" if unclear)
- "priceMin": integer, price in Algerian Dinar (DA)
- "priceMax": integer, price in Algerian Dinar (DA), greater than priceMin

Baseline price ranges per category (adjust within/near these based on the specific job's apparent scope — bigger/harder jobs toward the top of the range, small/simple ones toward the bottom):
${baselineLines}

If the description doesn't clearly match any category, use "other". Respond with the JSON object only.`;
}

function parseAndValidate(text, originalDescription) {
  let parsed;
  try {
    // Model is instructed to return raw JSON, but strip code fences defensively
    // in case it wraps the response anyway.
    const cleaned = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[aiService] Failed to parse model response as JSON:", text);
    return keywordFallback(originalDescription);
  }

  const category = CATEGORIES.includes(parsed.category) ? parsed.category : "other";
  const urgency = URGENCIES.includes(parsed.urgency) ? parsed.urgency : "medium";

  let priceMin = Number(parsed.priceMin);
  let priceMax = Number(parsed.priceMax);

  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin <= 0 || priceMax <= priceMin) {
    // Model gave us garbage numbers — fall back to the flat baseline for
    // whatever category it did manage to identify, rather than discarding
    // the category too.
    const baseline = PRICE_BASELINES[category];
    priceMin = baseline.min;
    priceMax = baseline.max;
  }

  return { category, urgency, priceMin: Math.round(priceMin), priceMax: Math.round(priceMax), source: "ai" };
}

// Very small keyword table — not smart, just enough that job posting keeps
// working end-to-end if the AI call is unavailable (missing key, network
// error, rate limit, etc).
const KEYWORD_MAP = [
  { category: "plumbing", words: ["sink", "leak", "pipe", "faucet", "toilet", "plumb"] },
  { category: "electrical", words: ["electric", "wiring", "outlet", "breaker", "socket", "power"] },
  { category: "tutoring", words: ["tutor", "lesson", "homework", "exam", "study", "teach"] },
  { category: "moving", words: ["move", "moving", "relocat", "boxes", "furniture"] },
  { category: "cleaning", words: ["clean", "cleaning", "housekeep", "dust"] },
  { category: "tech repair", words: ["laptop", "computer", "phone", "screen", "wifi", "tech"] },
  { category: "painting", words: ["paint", "wall", "repaint"] },
  { category: "gardening", words: ["garden", "lawn", "grass", "tree", "yard"] },
  { category: "appliance repair", words: ["fridge", "washer", "dryer", "oven", "appliance"] },
];

const URGENT_WORDS = ["tonight", "now", "urgent", "emergency", "asap", "immediately"];

function keywordFallback(description) {
  const lower = (description || "").toLowerCase();

  const match = KEYWORD_MAP.find(({ words }) => words.some((w) => lower.includes(w)));
  const category = match?.category || "other";
  const urgency = URGENT_WORDS.some((w) => lower.includes(w)) ? "high" : "medium";
  const baseline = PRICE_BASELINES[category];

  return { category, urgency, priceMin: baseline.min, priceMax: baseline.max, source: "fallback" };
}
