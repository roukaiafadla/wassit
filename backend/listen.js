// Run this to watch real-time events as they happen.
//
// Setup (one time):
//   cd backend
//   npm install socket.io-client --no-save
//
// Usage:
//   node listen.js <JWT_TOKEN>
//
// Get a token by logging in first (same Invoke-RestMethod pattern you've used
// before), then pass $login.token as the argument.

import { io } from "socket.io-client";

const token = process.argv[2];
if (!token) {
  console.error("Usage: node listen.js <JWT_TOKEN>");
  process.exit(1);
}

const socket = io("http://localhost:5000", { auth: { token } });

socket.on("connect", () => console.log("[connected]", socket.id));
socket.on("connect_error", (err) => console.error("[connect_error]", err.message));

// Watching a specific job's room needs an explicit join — pass a job id as a
// second argument if you want offer:new via the job:<id> room too (the
// client's own user:<id> room already receives offer:new automatically).
const jobId = process.argv[3];
if (jobId) {
  socket.emit("job:watch", jobId);
  console.log(`[watching job:${jobId}]`);
}

socket.on("job:new", (payload) => console.log("\n>>> job:new", JSON.stringify(payload, null, 2)));
socket.on("offer:new", (payload) => console.log("\n>>> offer:new", JSON.stringify(payload, null, 2)));
socket.on("job:matched", (payload) => console.log("\n>>> job:matched", JSON.stringify(payload, null, 2)));
socket.on("offer:accepted", (payload) => console.log("\n>>> offer:accepted", JSON.stringify(payload, null, 2)));
socket.on("offer:rejected", (payload) => console.log("\n>>> offer:rejected", JSON.stringify(payload, null, 2)));

console.log("Listening for real-time events... (Ctrl+C to stop)");
