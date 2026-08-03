import "dotenv/config";
import bcrypt from "bcryptjs";

import { connectDB } from "../config/db.js";
import User from "../models/User.js";

/**
 * Creates (or updates) a single admin user for local development and testing.
 * Admins can't self-register via /api/auth/signup by design (role is
 * restricted to client/provider there) — this script is the intended way to
 * get the first admin account. Safe to re-run: it upserts by email.
 *
 * Usage: npm run seed
 * Override defaults with env vars if you want:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=something npm run seed
 */
async function main() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "admin@wassit.dev").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.findOneAndUpdate(
    { email },
    { name: "Admin", email, passwordHash, role: "admin" },
    { upsert: true, new: true }
  );

  console.log(`[seed] Admin ready: ${admin.email} / password: ${password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
