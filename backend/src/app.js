import express from "express";
import cors from "cors";
import morgan from "morgan";
import "express-async-errors";

import healthRouter from "./routes/health.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(",") || "*",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use("/api/health", healthRouter);

  // Feature routers get mounted here as they're built, e.g.:
  // app.use("/api/auth", authRouter);
  // app.use("/api/jobs", jobsRouter);
  // app.use("/api/offers", offersRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
  });

  // Central error handler — express-async-errors forwards thrown errors from
  // async route handlers here instead of crashing the process.
  app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Internal server error" });
  });

  return app;
}
