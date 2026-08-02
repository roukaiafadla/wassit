import { Server } from "socket.io";
import jwt from "jsonwebtoken";

/**
 * Attaches Socket.io to the HTTP server.
 *
 * Room conventions (used by later features — job broadcast, live offers, chat):
 *   - `user:<userId>`         — private room, one per user, for personal notifications
 *   - `job:<jobId>`           — room for everyone watching a specific job (client + candidate providers)
 *   - `conversation:<convId>` — room for a matched job's 1:1 chat
 *
 * This module only sets up the connection + auth handshake. Event handlers for
 * job:new, offer:new, chat messages etc. get added as those features are built
 * (step 3 onward in the build order).
 */
export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(",") || "*",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    console.log(`[socket] connected: user ${socket.user.id} (${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: user ${socket.user.id} (${socket.id})`);
    });
  });

  return io;
}
