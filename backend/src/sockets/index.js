import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let ioInstance = null;

/**
 * Returns the shared Socket.io server instance so controllers can emit
 * events (e.g. `job:new`, `offer:new`) without every function needing io
 * passed in as a parameter. Returns null if sockets haven't been initialized
 * yet (shouldn't happen in normal operation — server.js calls initSockets
 * before the app starts accepting requests) — callers should treat a null
 * result as "skip emitting" rather than crashing, since a missed real-time
 * update is recoverable but a crashed request isn't.
 */
export function getIO() {
  return ioInstance;
}

/**
 * Attaches Socket.io to the HTTP server.
 *
 * Room conventions (used by later features — job broadcast, live offers, chat):
 *   - `user:<userId>`         — private room, one per user, for personal notifications
 *   - `job:<jobId>`           — room for everyone watching a specific job (client + candidate providers)
 *   - `conversation:<convId>` — room for a matched job's 1:1 chat
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

    // A client viewing a job's live-offers page joins that job's room so it
    // can receive offer:new events scoped to just that job. Providers join
    // too once they've sent an offer, so they can see if it gets accepted.
    socket.on("job:watch", (jobId) => {
      if (typeof jobId === "string") socket.join(`job:${jobId}`);
    });
    socket.on("job:unwatch", (jobId) => {
      if (typeof jobId === "string") socket.leave(`job:${jobId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: user ${socket.user.id} (${socket.id})`);
    });
  });

  ioInstance = io;
  return io;
}
