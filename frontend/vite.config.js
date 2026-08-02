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
    },
  },
});
