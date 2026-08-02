import "dotenv/config";
import http from "http";

import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { initSockets } from "./sockets/index.js";

const PORT = process.env.PORT || 5000;

async function main() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSockets(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[server] Wassit API listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
