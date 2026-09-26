import mongoose from "mongoose";

import Job from "../models/Job.js";
import Offer from "../models/Offer.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { assertRequest, notFound, forbidden } from "../utils/validation.js";
import { getIO } from "../sockets/index.js";

/**
 * POST /api/offers — provider sends an offer on an open job.
 * Body: { jobId, price, etaMinutes }
 */
export async function createOffer(req, res) {
  assertRequest(req.user.role === "provider", "Only providers can send offers");

  const { jobId, price, etaMinutes } = req.body;
  assertRequest(mongoose.Types.ObjectId.isValid(jobId), "Invalid job id");
  assertRequest(typeof price === "number" && price > 0, "price must be a positive number");
  assertRequest(typeof etaMinutes === "number" && etaMinutes > 0, "etaMinutes must be a positive number");

  const [job, provider] = await Promise.all([Job.findById(jobId), User.findById(req.user.id)]);
  if (!job) return notFound("Job not found");
  assertRequest(job.status === "open", "This job is no longer accepting offers");
  assertRequest(provider.verified, "Your account isn't verified yet");
  assertRequest(provider.categories.includes(job.category), "You don't offer this job's category");

  const existing = await Offer.findOne({ jobId, providerId: req.user.id });
  assertRequest(!existing, "You've already sent an offer on this job");

  const offer = await Offer.create({
    jobId,
    providerId: req.user.id,
    price,
    etaMinutes,
    status: "pending",
  });

  res.status(201).json({ offer });

  // Live update to the client watching this job, and anyone else in the
  // job's room (e.g. the client's own second tab, or an admin watching).
  const io = getIO();
  if (io) {
    const payload = {
      offer,
      provider: { _id: provider._id, name: provider.name, ratingAvg: provider.ratingAvg, ratingCount: provider.ratingCount },
    };
    io.to(`user:${job.clientId}`).emit("offer:new", payload);
    io.to(`job:${job._id}`).emit("offer:new", payload);
  }
}

/**
 * GET /api/jobs/:id/offers — list offers on a job. Only the job's owner or
 * an admin can see the full list (a provider sees competing offers'
 * details otherwise, which isn't something a marketplace normally exposes).
 */
export async function listOffersForJob(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.id), "Invalid job id");
  const job = await Job.findById(req.params.id);
  if (!job) return notFound("Job not found");

  const isOwner = job.clientId.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) forbidden("You don't have access to this job's offers");

  const offers = await Offer.find({ jobId: job._id })
    .populate("providerId", "name ratingAvg ratingCount")
    .sort({ createdAt: 1 });

  res.json({ offers });
}

/**
 * PATCH /api/offers/:id/accept — client accepts an offer on their own job.
 * Matches flow 3 in the spec: job -> matched, other offers -> rejected,
 * conversation auto-created, both parties notified live.
 */
export async function acceptOffer(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.id), "Invalid offer id");
  const offer = await Offer.findById(req.params.id);
  if (!offer) return notFound("Offer not found");

  const job = await Job.findById(offer.jobId);
  if (!job) return notFound("Job not found");
  if (job.clientId.toString() !== req.user.id) forbidden("You can only accept offers on your own jobs");
  assertRequest(job.status === "open", "This job is no longer open");
  assertRequest(offer.status === "pending", "This offer is no longer pending");

  // Snapshot the other pending offers' provider ids before we overwrite them,
  // so we can still notify those providers afterward that they didn't win.
  const otherPendingOffers = await Offer.find({ jobId: job._id, _id: { $ne: offer._id }, status: "pending" });

  offer.status = "accepted";
  job.status = "matched";
  job.acceptedOfferId = offer._id;

  await Promise.all([
    offer.save(),
    job.save(),
    Offer.updateMany({ jobId: job._id, _id: { $ne: offer._id }, status: "pending" }, { status: "rejected" }),
  ]);

  const conversation = await Conversation.create({
    jobId: job._id,
    clientId: job.clientId,
    providerId: offer.providerId,
  });

  res.json({ offer, job, conversation });

  const io = getIO();
  if (io) {
    io.to(`job:${job._id}`).emit("job:matched", { job, acceptedOffer: offer });
    io.to(`user:${offer.providerId}`).emit("offer:accepted", { offer, job, conversation });
    for (const rejected of otherPendingOffers) {
      io.to(`user:${rejected.providerId}`).emit("offer:rejected", { offerId: rejected._id, jobId: job._id });
    }
  }
}
