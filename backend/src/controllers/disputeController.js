import mongoose from "mongoose";

import Dispute from "../models/Dispute.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { getJobParticipants } from "../utils/jobParticipants.js";
import { assertRequest, notFound, forbidden } from "../utils/validation.js";
import { getIO } from "../sockets/index.js";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1000;

/**
 * POST /api/disputes - the client or the matched provider flags a problem
 * with a job. Body: { jobId, reason }
 * Only possible once the job is matched or completed, and only one open
 * dispute per person per job. Admins are notified live with dispute:new.
 */
export async function createDispute(req, res) {
  const { jobId, reason } = req.body;

  assertRequest(typeof jobId === "string" && mongoose.Types.ObjectId.isValid(jobId), "Invalid job id");
  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  assertRequest(
    cleanReason.length >= MIN_REASON_LENGTH && cleanReason.length <= MAX_REASON_LENGTH,
    `reason must be between ${MIN_REASON_LENGTH} and ${MAX_REASON_LENGTH} characters`
  );

  const job = await Job.findById(jobId);
  if (!job) return notFound("Job not found");

  const { clientId, providerId } = await getJobParticipants(job);
  const isClient = clientId === req.user.id;
  const isProvider = providerId === req.user.id;
  if (!isClient && !isProvider) forbidden("Only the client or the matched provider can raise a dispute on this job");

  assertRequest(["matched", "completed"].includes(job.status), "Disputes can only be raised on a matched or completed job");

  const against = isClient ? providerId : clientId;

  const existing = await Dispute.findOne({ jobId: job._id, raisedBy: req.user.id, status: "open" });
  assertRequest(!existing, "You already have an open dispute on this job");

  let dispute;
  try {
    dispute = await Dispute.create({ jobId: job._id, raisedBy: req.user.id, against, reason: cleanReason });
  } catch (err) {
    // Two requests racing past the check above: the partial unique index catches the second one.
    if (err.code === 11000) assertRequest(false, "You already have an open dispute on this job");
    throw err;
  }

  res.status(201).json({ dispute });

  notifyAdmins(dispute).catch((err) => {
    console.error("[disputeController] Failed to notify admins:", err);
  });
}

async function notifyAdmins(dispute) {
  const io = getIO();
  if (!io) return;

  const admins = await User.find({ role: "admin" }).select("_id");
  for (const admin of admins) {
    io.to(`user:${admin._id}`).emit("dispute:new", { dispute });
  }
}

/**
 * GET /api/disputes/mine - disputes I raised or that were raised against me
 * (newest first, last 50), with the job and both names filled in so a person
 * can follow the status and read the admin's resolution note.
 */
export async function listMyDisputes(req, res) {
  const disputes = await Dispute.find({ $or: [{ raisedBy: req.user.id }, { against: req.user.id }] })
    .populate("jobId", "description category status")
    .populate("raisedBy", "name")
    .populate("against", "name")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ disputes });
}
