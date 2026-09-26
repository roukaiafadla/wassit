import mongoose from "mongoose";

import User from "../models/User.js";
import Job from "../models/Job.js";
import { assertRequest, notFound } from "../utils/validation.js";

const PUBLIC_FIELDS = {
  passwordHash: 0,
  __v: 0,
};

/**
 * Core geo query, shared by both routes below (and by jobController's
 * Socket.io broadcast on job creation). Finds verified providers who:
 *   - offer `category`
 *   - are within THEIR OWN coverageRadiusKm of (latitude, longitude)
 *
 * Uses $geoNear (requires the 2dsphere index on User.location) to compute
 * distance from the point to every candidate provider, then a $match with
 * $expr to keep only those whose distance is within their own coverage
 * radius — this is why a plain $near/$maxDistance isn't enough: the radius
 * differs per provider, so the cutoff has to be applied per-document.
 *
 * The $project is split into three stages on purpose: MongoDB doesn't allow
 * mixing field exclusion (passwordHash: 0) with a computed field in the same
 * $project stage.
 */
export async function findNearbyProviders({ latitude, longitude, category }) {
  return User.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distanceMeters",
        spherical: true,
        query: { role: "provider", verified: true, categories: category },
      },
    },
    {
      $match: {
        $expr: { $lte: ["$distanceMeters", { $multiply: ["$coverageRadiusKm", 1000] }] },
      },
    },
    { $project: PUBLIC_FIELDS },
    { $addFields: { distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] } } },
    { $project: { distanceMeters: 0 } },
    { $sort: { distanceKm: 1 } },
    { $limit: 50 },
  ]);
}

/**
 * GET /api/providers/nearby?latitude=&longitude=&category=
 * Ad-hoc version — pass coordinates + category directly. Useful for testing
 * and for any future "browse providers near me" feature.
 */
export async function nearbyProviders(req, res) {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const { category } = req.query;

  assertRequest(Number.isFinite(latitude) && Number.isFinite(longitude), "latitude and longitude query params are required");
  assertRequest(category && category.trim(), "category query param is required");

  const providers = await findNearbyProviders({ latitude, longitude, category: category.trim() });
  res.json({ providers });
}

/**
 * GET /api/jobs/:id/nearby-providers
 * Real usage — given an existing job, finds providers eligible to be
 * notified about it (this is exactly the query step 3's Socket.io broadcast
 * will run before emitting `job:new` to each matched provider's room).
 */
export async function nearbyProvidersForJob(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.id), "Invalid job id");
  const job = await Job.findById(req.params.id);
  if (!job) return notFound("Job not found");

  const [longitude, latitude] = job.location.coordinates;
  const providers = await findNearbyProviders({ latitude, longitude, category: job.category });
  res.json({ providers });
}
