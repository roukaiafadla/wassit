import mongoose from "mongoose";

import Job from "../models/Job.js";
import { getJobParticipants } from "../utils/jobParticipants.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { assertRequest, notFound, forbidden } from "../utils/validation.js";
import { getIO } from "../sockets/index.js";

const MAX_COMMENT_LENGTH = 1000;


/**
 * Recomputes a user's ratingAvg / ratingCount from every review they've received.
 * Recalculating from scratch (instead of nudging the old average) means the
 * numbers can never drift, even if a review is later removed or edited.
 */
async function recalculateRating(userId) {
  const [stats] = await Review.aggregate([
    // aggregate() doesn't cast ids for us the way find() does, so convert explicitly
    { $match: { toUserId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const ratingAvg = stats ? Math.round(stats.avg * 100) / 100 : 0;
  const ratingCount = stats ? stats.count : 0;

  await User.updateOne({ _id: userId }, { ratingAvg, ratingCount });
  return { ratingAvg, ratingCount };
}

/**
 * POST /api/reviews - after a job is completed, either party reviews the other.
 * Body: { jobId, rating (whole number 1-5), comment? }
 * One review per person per job. Updates the reviewed user's rating immediately
 * and notifies them live with a review:new event.
 */
export async function createReview(req, res) {
  const { jobId, rating, comment } = req.body;

  assertRequest(typeof jobId === "string" && mongoose.Types.ObjectId.isValid(jobId), "Invalid job id");
  assertRequest(Number.isInteger(rating) && rating >= 1 && rating <= 5, "rating must be a whole number from 1 to 5");
  const cleanComment = typeof comment === "string" ? comment.trim() : "";
  assertRequest(cleanComment.length <= MAX_COMMENT_LENGTH, `comment must be at most ${MAX_COMMENT_LENGTH} characters`);

  const job = await Job.findById(jobId);
  if (!job) return notFound("Job not found");

  const { clientId, providerId } = await getJobParticipants(job);
  const isClient = clientId === req.user.id;
  const isProvider = providerId === req.user.id;
  if (!isClient && !isProvider) forbidden("Only the client or the matched provider can review this job");

  assertRequest(job.status === "completed", "You can only review a job after it's completed");

  const toUserId = isClient ? providerId : clientId;

  const existing = await Review.findOne({ jobId: job._id, fromUserId: req.user.id });
  assertRequest(!existing, "You've already reviewed this job");

  let review;
  try {
    review = await Review.create({ jobId: job._id, fromUserId: req.user.id, toUserId, rating, comment: cleanComment });
  } catch (err) {
    // Two requests racing past the check above: the unique index (jobId + fromUserId) catches the second one.
    if (err.code === 11000) assertRequest(false, "You've already reviewed this job");
    throw err;
  }

  const { ratingAvg, ratingCount } = await recalculateRating(toUserId);

  res.status(201).json({ review, reviewed: { _id: toUserId, ratingAvg, ratingCount } });

  const io = getIO();
  if (io) io.to(`user:${toUserId}`).emit("review:new", { review });
}

/**
 * GET /api/reviews/user/:userId - a user's public rating summary and the
 * reviews they've received, newest first (last 50). Any logged-in user can read it.
 */
export async function listReviewsForUser(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.userId), "Invalid user id");

  const user = await User.findById(req.params.userId).select("name role ratingAvg ratingCount");
  if (!user) return notFound("User not found");

  const reviews = await Review.find({ toUserId: user._id }).populate("fromUserId", "name").sort({ createdAt: -1 }).limit(50);

  res.json({ user, reviews });
}

/**
 * GET /api/reviews/job/:jobId - the reviews left on one job (at most two).
 * Only the job's two participants can read it; lets the UI know whether the
 * current user has already reviewed, so it can hide the review prompt.
 */
export async function listReviewsForJob(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.jobId), "Invalid job id");

  const job = await Job.findById(req.params.jobId);
  if (!job) return notFound("Job not found");

  const { clientId, providerId } = await getJobParticipants(job);
  if (clientId !== req.user.id && providerId !== req.user.id) forbidden("You don't have access to this job's reviews");

  const reviews = await Review.find({ jobId: job._id }).sort({ createdAt: 1 });
  res.json({ reviews });
}
