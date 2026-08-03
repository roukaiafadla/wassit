import User from "../models/User.js";
import { assertRequest } from "../utils/validation.js";

const PUBLIC_FIELDS =
  "_id name email role location categories coverageRadiusKm verified ratingAvg ratingCount createdAt";

/**
 * PATCH /api/users/me/location — set or update the current user's location.
 * Any role can call this (clients benefit too — e.g. more accurate job posting
 * defaults later — but it's primarily how providers become discoverable via
 * the nearby-providers query, since that requires a real location on file).
 */
export async function updateMyLocation(req, res) {
  const { latitude, longitude } = req.body;

  assertRequest(
    typeof latitude === "number" && typeof longitude === "number",
    "latitude and longitude are required (numbers)"
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { location: { type: "Point", coordinates: [longitude, latitude] } },
    { new: true }
  ).select(PUBLIC_FIELDS);

  res.json({ user });
}

/**
 * PATCH /api/users/me/provider-profile — providers update their categories
 * and/or coverage radius after signup.
 */
export async function updateMyProviderProfile(req, res) {
  assertRequest(req.user.role === "provider", "Only providers have a provider profile");

  const { categories, coverageRadiusKm } = req.body;
  const update = {};

  if (categories !== undefined) {
    assertRequest(Array.isArray(categories), "categories must be an array of strings");
    update.categories = categories;
  }
  if (coverageRadiusKm !== undefined) {
    assertRequest(typeof coverageRadiusKm === "number" && coverageRadiusKm > 0, "coverageRadiusKm must be a positive number");
    update.coverageRadiusKm = coverageRadiusKm;
  }
  assertRequest(Object.keys(update).length > 0, "Provide categories and/or coverageRadiusKm to update");

  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select(PUBLIC_FIELDS);
  res.json({ user });
}
