import { Router } from "express";

import { createJob, listJobs, getJob, cancelJob } from "../controllers/jobController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth); // every job route requires a logged-in user

router.post("/", createJob);
router.get("/", listJobs);
router.get("/:id", getJob);
router.patch("/:id/cancel", cancelJob);

export default router;
