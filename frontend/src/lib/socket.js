import { io } from "socket.io-client";

let socket = null;

// Same origin logic as api.js: empty in dev (proxied), explicit URL in prod.
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

/**
 * Lazily creates (or returns) a single shared socket connection, authenticated
 * with the same JWT used for REST calls. Call this once auth exists — for now
 * it's just wired up and unused, ready for the real-time features in step 3.
 */
export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem("wassit_token");
  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
