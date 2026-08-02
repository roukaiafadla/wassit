import mongoose from "mongoose";

/**
 * Connects to MongoDB using the URI in process.env.MONGODB_URI.
 * Exits the process on failure so failures are loud in dev/deploy logs
 * instead of the server silently running with no DB.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("[db] MONGODB_URI is not set. Check your .env file.");
    process.exit(1);
  }

  mongoose.set("strictQuery", true);

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });
}
