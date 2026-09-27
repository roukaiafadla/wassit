import { suggestJobDetails } from "../services/aiService.js";
import { assertRequest } from "../utils/validation.js";

/**
 * POST /api/ai/suggest-job
 * Body: { description }
 * Returns: { category, urgency, priceMin, priceMax, source }
 *
 * This is a preview step — it does NOT create a job. The client calls this
 * first, gets a suggestion, can edit any field, then calls POST /api/jobs
 * with the (possibly edited) values, same as before the AI existed.
 */
export async function suggestJob(req, res) {
  const { description } = req.body;
  assertRequest(
    typeof description === "string" && description.trim().length >= 5,
    "Description is required (min 5 characters)"
  );

  const suggestion = await suggestJobDetails(description.trim());
  res.json(suggestion);
}
