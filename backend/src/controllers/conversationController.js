import mongoose from "mongoose";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { assertRequest, notFound, forbidden } from "../utils/validation.js";

function isParticipant(conversation, userId) {
  return conversation.clientId.toString() === userId || conversation.providerId.toString() === userId;
}

/**
 * GET /api/conversations - the current user's conversations (as client or as
 * provider), most recent activity first, with the job and the other party's
 * name filled in so a chat list can render without extra requests.
 */
export async function listMyConversations(req, res) {
  const conversations = await Conversation.find({
    $or: [{ clientId: req.user.id }, { providerId: req.user.id }],
  })
    .populate("jobId", "description category status")
    .populate("clientId", "name")
    .populate("providerId", "name")
    .sort({ updatedAt: -1 });

  res.json({ conversations });
}

/**
 * GET /api/conversations/by-job/:jobId - find the conversation that was
 * created when this job's offer was accepted. Lets a job page jump straight
 * into its chat without knowing the conversation id.
 */
export async function getConversationByJob(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.jobId), "Invalid job id");

  const conversation = await Conversation.findOne({ jobId: req.params.jobId });
  if (!conversation) return notFound("No conversation for this job yet");
  if (!isParticipant(conversation, req.user.id)) forbidden("You don't have access to this conversation");

  res.json({ conversation });
}

/**
 * GET /api/conversations/:id/messages - message history, oldest first.
 * Returns the most recent 100 messages; only the two participants can read.
 */
export async function listMessages(req, res) {
  assertRequest(mongoose.Types.ObjectId.isValid(req.params.id), "Invalid conversation id");

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return notFound("Conversation not found");
  if (!isParticipant(conversation, req.user.id)) forbidden("You don't have access to this conversation");

  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: -1 }).limit(100);
  messages.reverse();

  res.json({ messages });
}
