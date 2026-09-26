import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // So the frontend can call /api/... during dev without CORS juggling.
      // In production, set VITE_API_URL instead (see src/lib/api.js).
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Same idea for the Socket.io connection (src/lib/socket.js defaults to
      // window.location.origin in dev) — without this, the websocket
      // handshake would try to hit :5173 instead of the backend on :5000.
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
