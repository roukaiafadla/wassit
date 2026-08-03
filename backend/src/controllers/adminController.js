import mongoose from "mongoose";

import User from "../models/User.js";
import { assertRequest, notFound } from "../utils/validation.js";

/**
 * GET /api/admin/providers/pending — providers awaiting verification.
 */
export async function listPendingProviders(req, res) {
  const providers = await User.find({ role: "provider", verified: false })
    .select("_id name email categories coverageRadiusKm location createdAt")
    .sort({ createdAt: 1 });
  res.json({ providers });
}

/**
 * PATCH /api/admin/providers/:id/verify — approve a provider so they become
 * eligible to appear in nearby-provider search and receive job alerts.
 */
export async function verifyProvider(req, res) {
  const { id } = req.params;
  assertRequest(mongoose.Types.ObjectId.isValid(id), "Invalid user id");

  const provider = await User.findOne({ _id: id, role: "provider" });
  if (!provider) return notFound("Provider not found");

  provider.verified = true;
  await provider.save();

  const { passwordHash: _drop, __v: _drop2, ...safe } = provider.toObject();
  res.json({ user: safe });
}
