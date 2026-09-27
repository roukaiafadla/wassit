/**
 * Fixed category list + urgency levels + a manual price baseline table.
 *
 * Per the cahier des charges (§6 AI features): the AI doesn't invent prices
 * from nothing — it's seeded with this baseline table (in DA) and refines
 * within/near that range based on the actual description. This keeps
 * suggestions sane even if the model gets creative, and gives us a fallback
 * if the AI call fails entirely (see aiService.js).
 *
 * IMPORTANT: this list must stay in sync with CATEGORIES in
 * frontend/src/pages/client/PostJob.jsx — there's no shared package between
 * frontend/backend in this project, so if you add a category, add it in
 * both places.
 */

export const CATEGORIES = [
  "plumbing",
  "electrical",
  "tutoring",
  "moving",
  "cleaning",
  "tech repair",
  "painting",
  "gardening",
  "appliance repair",
  "other",
];

export const URGENCIES = ["low", "medium", "high"];

// Rough baseline ranges in DA (Algerian Dinar), for a single typical job.
// Deliberately wide — these are a starting anchor, not a quote.
export const PRICE_BASELINES = {
  plumbing: { min: 2000, max: 6000 },
  electrical: { min: 2000, max: 7000 },
  tutoring: { min: 1000, max: 3000 },
  moving: { min: 3000, max: 15000 },
  cleaning: { min: 1500, max: 4000 },
  "tech repair": { min: 1500, max: 5000 },
  painting: { min: 3000, max: 10000 },
  gardening: { min: 1500, max: 4000 },
  "appliance repair": { min: 2000, max: 6000 },
  other: { min: 1500, max: 5000 },
};
