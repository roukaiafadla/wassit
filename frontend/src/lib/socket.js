import { io } from "socket.io-client";

let socket = null;

// Same origin logic as api.js: empty in dev (proxied), explicit URL in prod.
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

/**
 * Lazily creates (or returns) a single shared socket connection, authenticated
 * with the same JWT used for REST calls. The auth token is re-read from
 * localStorage on every call (not just at creation) so a stale token from
 * before login never lingers on an already-created socket instance.
 */
export function getSocket() {
  const token = localStorage.getItem("wassit_token");

  if (socket) {
    socket.auth.token = token;
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
  });

  return socket;
}

/** Connects (or reconnects with a fresh token) the shared socket. Call after login/signup and after restoring a session. */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * Joins the `job:<jobId>` room — this is what makes the current user receive
 * `offer:new` / `job:matched` events scoped to that specific job (see
 * backend sockets/index.js). Call on mount of any page watching one job's
 * live activity, and unwatchJob on unmount so the socket doesn't keep
 * accumulating room memberships as the user navigates around.
 */
export function watchJob(jobId) {
  if (jobId) getSocket().emit("job:watch", jobId);
}

export function unwatchJob(jobId) {
  if (jobId) getSocket().emit("job:unwatch", jobId);
}
