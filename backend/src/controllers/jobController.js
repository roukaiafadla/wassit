import Job from "../models/Job.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { assertRequest, notFound, forbidden } from "../utils/validation.js";
import { findNearbyProviders } from "./providerController.js";
import { getIO } from "../sockets/index.js";

const URGENCIES = ["low", "medium", "high"];

/**
 * POST /api/jobs — client creates a job.
 *
 * No AI yet (that's build-order step 4): category, urgency, and price range
 * are provided directly by the client for now instead of being inferred from
 * free text. The shape matches what the AI step will eventually fill in, so
 * swapping it in later won't change this route's contract.
 */
export async function createJob(req, res) {
  assertRequest(req.user.role === "client", "Only clients can post jobs");

  const {
    description,
    category,
    urgency = "medium",
    suggestedPriceMin,
    suggestedPriceMax,
    latitude,
    longitude,
  } = req.body;

  assertRequest(description && description.trim().length >= 5, "Description is required (min 5 characters)");
  assertRequest(category && category.trim(), "Category is required");
  assertRequest(URGENCIES.includes(urgency), `Urgency must be one of: ${URGENCIES.join(", ")}`);
  assertRequest(
    typeof latitude === "number" && typeof longitude === "number",
    "latitude and longitude are required (numbers)"
  );

  const job = await Job.create({
    clientId: req.user.id,
    description: description.trim(),
    category: category.trim(),
    urgency,
    suggestedPriceMin,
    suggestedPriceMax,
    location: { type: "Point", coordinates: [longitude, latitude] },
    status: "open",
  });

  res.status(201).json({ job });

  // Broadcast to nearby eligible providers, live. This runs after the
  // response is already sent — the client doesn't wait on the geo query or
  // the socket emit, since neither affects whether their job was created.
  notifyNearbyProviders(job).catch((err) => {
    console.error("[jobController] Failed to notify nearby providers:", err);
  });
}

async function notifyNearbyProviders(job) {
  const io = getIO();
  if (!io) return; // sockets not initialized (shouldn't happen, but never crash a request over this)

  const [longitude, latitude] = job.location.coordinates;
  const providers = await findNearbyProviders({ latitude, longitude, category: job.category });

  for (const provider of providers) {
    io.to(`user:${provider._id}`).emit("job:new", { job });
  }
}

/**
 * GET /api/jobs — scoped list depending on role:
 *   - client: their own jobs (any status)
 *   - provider: open jobs in their categories (no geo filter yet — step 2)
 *   - admin: everything
 */
export async function listJobs(req, res) {
  let filter = {};

  if (req.user.role === "client") {
    filter = { clientId: req.user.id };
  } else if (req.user.role === "provider") {
    const provider = await User.findById(req.user.id);
    filter = {
      status: "open",
      category: { $in: provider?.categories?.length ? provider.categories : ["__none__"] },
    };
  }
  // admin: no filter, sees everything

  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ jobs });
}

export async function getJob(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.id), "Invalid job id");
  const job = await Job.findById(req.params.id);
  if (!job) return notFound("Job not found");

  const isOwner = job.clientId.toString() === req.user.id;
  const isPrivileged = ["provider", "admin"].includes(req.user.role);
  if (!isOwner && !isPrivileged) forbidden("You don't have access to this job");

  res.json({ job });
}

/**
 * PATCH /api/jobs/:id/cancel — client cancels their own open job.
 */
export async function cancelJob(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.id), "Invalid job id");
  const job = await Job.findById(req.params.id);
  if (!job) return notFound("Job not found");
  if (job.clientId.toString() !== req.user.id) forbidden("You can only cancel your own jobs");
  assertRequest(job.status === "open", "Only open jobs can be cancelled");

  job.status = "cancelled";
  await job.save();
  res.json({ job });
}
