import mongoose from "mongoose";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Live chat events for a matched job's 1:1 conversation. Called once per
 * connected socket from sockets/index.js.
 *
 * Client -> server. Events that return a result use a Socket.io
 * acknowledgement callback: { ok: true, ... } or { ok: false, error }.
 *   chat:join    { conversationId }              join the conversation room (participants only)
 *   chat:leave   { conversationId }              leave the room
 *   chat:send    { conversationId, text }        save + broadcast a message
 *   chat:typing  { conversationId, isTyping }    typing indicator (no DB write, no ack)
 *   chat:read    { conversationId }              mark the other person's messages as read
 *
 * Server -> client:
 *   chat:message { message }                           everyone in the room, including the sender (keeps a second tab in sync)
 *   chat:notify  { conversationId, message }           the other person's private user room, even if their chat is closed (unread badges)
 *   chat:typing  { conversationId, userId, isTyping }  the other side of the room
 *   chat:read    { conversationId, readerId, readAt }  the other side of the room (read receipt)
 */
export function registerChatHandlers(io, socket) {
  const userId = socket.user.id;

  // Wraps every handler so a thrown error becomes a failed ack instead of an
  // unhandled promise rejection (which would crash the whole server process).
  const safe = (fn) => async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    try {
      await fn(payload || {}, reply);
    } catch (err) {
      console.error("[chat] handler error:", err);
      reply({ ok: false, error: "Something went wrong" });
    }
  };

  // Loads the conversation and checks the caller is one of its two participants.
  async function loadConversation(conversationId) {
    if (typeof conversationId !== "string" || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return { error: "Invalid conversation id" };
    }
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return { error: "Conversation not found" };

    const isParticipant = conversation.clientId.toString() === userId || conversation.providerId.toString() === userId;
    if (!isParticipant) return { error: "You don't have access to this conversation" };

    return { conversation };
  }

  socket.on(
    "chat:join",
    safe(async ({ conversationId }, reply) => {
      const { conversation, error } = await loadConversation(conversationId);
      if (error) return reply({ ok: false, error });

      socket.join(`conversation:${conversation._id}`);
      reply({ ok: true });
    })
  );

  socket.on(
    "chat:leave",
    safe(async ({ conversationId }, reply) => {
      if (typeof conversationId === "string") socket.leave(`conversation:${conversationId}`);
      reply({ ok: true });
    })
  );

  socket.on(
    "chat:send",
    safe(async ({ conversationId, text }, reply) => {
      const { conversation, error } = await loadConversation(conversationId);
      if (error) return reply({ ok: false, error });

      const clean = typeof text === "string" ? text.trim() : "";
      if (!clean) return reply({ ok: false, error: "Message can't be empty" });
      if (clean.length > MAX_MESSAGE_LENGTH) {
        return reply({ ok: false, error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
      }

      const message = await Message.create({
        conversationId: conversation._id,
        senderId: userId,
        text: clean,
      });

      // Bump the conversation so GET /api/conversations lists active chats first.
      await Conversation.updateOne({ _id: conversation._id }, { updatedAt: new Date() });

      io.to(`conversation:${conversation._id}`).emit("chat:message", { message });

      const otherId = conversation.clientId.toString() === userId ? conversation.providerId : conversation.clientId;
      io.to(`user:${otherId}`).emit("chat:notify", { conversationId: conversation._id, message });

      reply({ ok: true, message });
    })
  );

  socket.on(
    "chat:typing",
    safe(async ({ conversationId, isTyping }) => {
      if (typeof conversationId !== "string") return;

      // No database lookup per keystroke: only sockets that already passed the
      // participant check in chat:join are in the room, so room membership is the check.
      const room = `conversation:${conversationId}`;
      if (!socket.rooms.has(room)) return;

      socket.to(room).emit("chat:typing", { conversationId, userId, isTyping: Boolean(isTyping) });
    })
  );

  socket.on(
    "chat:read",
    safe(async ({ conversationId }, reply) => {
      const { conversation, error } = await loadConversation(conversationId);
      if (error) return reply({ ok: false, error });

      // Only messages sent by the OTHER person can be marked read by me.
      const readAt = new Date();
      const result = await Message.updateMany(
        { conversationId: conversation._id, senderId: { $ne: userId }, readAt: null },
        { readAt }
      );

      if (result.modifiedCount > 0) {
        socket.to(`conversation:${conversation._id}`).emit("chat:read", {
          conversationId: conversation._id,
          readerId: userId,
          readAt,
        });
      }

      reply({ ok: true, count: result.modifiedCount });
    })
  );
}
