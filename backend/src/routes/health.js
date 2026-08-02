import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    ok: true,
    service: "wassit-backend",
    db: dbStates[mongoose.connection.readyState] || "unknown",
    time: new Date().toISOString(),
  });
});

export default router;
