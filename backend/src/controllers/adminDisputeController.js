import mongoose from "mongoose";

import Dispute from "../models/Dispute.js";
import User from "../models/User.js";
import { assertRequest, notFound } from "../utils/validation.js";
import { getIO } from "../sockets/index.js";

const ALLOWED_STATUSES = ["open", "resolved", "dismissed"];
const RESOLVE_ACTIONS = ["resolved", "dismissed"];
const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 1000;

/**
 * GET /api/admin/disputes?status=open&page=1&limit=20
 * Queue for admins. Defaults to open disputes, oldest first so nothing rots.
 */
export async function listDisputes(req, res) {
  const status = typeof req.query.status === "string" ? req.query.status : "open";
  assertRequest(ALLOWED_STATUSES.includes(status), `status must be one of: ${ALLOWED_STATUSES.join(", ")}`);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { status };
  const sort = status === "open" ? { createdAt: 1 } : { resolvedAt: -1 };

  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .populate("jobId", "description category status price")
      .populate("raisedBy", "name email role")
      .populate("against", "name email role")
      .populate("resolvedBy", "name")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Dispute.countDocuments(filter),
  ]);

  res.json({
    disputes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
}

/**
 * PATCH /api/admin/disputes/:id/resolve
 * Body: { action: "resolved" | "dismissed", note: string }
 * Only works on open disputes. Notifies both parties live.
 */
export async function resolveDispute(req, res) {
  const { id } = req.params;
  assertRequest(mongoose.Types.ObjectId.isValid(id), "Invalid dispute id");

  const { action, note } = req.body;
  assertRequest(RESOLVE_ACTIONS.includes(action), `action must be one of: ${RESOLVE_ACTIONS.join(", ")}`);

  const cleanNote = typeof note === "string" ? note.trim() : "";
  assertRequest(
    cleanNote.length >= MIN_NOTE_LENGTH && cleanNote.length <= MAX_NOTE_LENGTH,
    `note must be between ${MIN_NOTE_LENGTH} and ${MAX_NOTE_LENGTH} characters`
  );

  const dispute = await Dispute.findById(id);
  if (!dispute) return notFound("Dispute not found");
  assertRequest(dispute.status === "open", `Cannot resolve a dispute that is already ${dispute.status}`);

  dispute.status = action;
  dispute.resolutionNote = cleanNote;
  dispute.resolvedBy = req.user.id;
  dispute.resolvedAt = new Date();
  await dispute.save();

  const populated = await Dispute.findById(dispute._id)
    .populate("jobId", "description category status")
    .populate("raisedBy", "name")
    .populate("against", "name")
    .populate("resolvedBy", "name");

  res.json({ dispute: populated });

  // Notify both parties live. Fire-and-forget: a socket error must not
  // roll back the resolution.
  notifyParties(populated).catch((err) => {
    console.error("[adminDisputeController] Failed to notify parties:", err);
  });
}

async function notifyParties(dispute) {
  const io = getIO();
  if (!io) return;

  const payload = {
    disputeId: dispute._id,
    jobId: dispute.jobId?._id,
    status: dispute.status,
    resolutionNote: dispute.resolutionNote,
    resolvedAt: dispute.resolvedAt,
  };

  const partyIds = new Set([String(dispute.raisedBy?._id), String(dispute.against?._id)]);
  for (const id of partyIds) {
    if (!id || id === "undefined") continue;
    io.to(`user:${id}`).emit("dispute:resolved", payload);
  }

  // Also ping other admins so their queue refreshes
  const admins = await User.find({ role: "admin" }).select("_id");
  for (const admin of admins) {
    io.to(`user:${admin._id}`).emit("dispute:queue-updated", {
      disputeId: dispute._id,
      status: dispute.status,
    });
  }
}