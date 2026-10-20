import { Router } from "express";

import { createReview, listReviewsForUser, listReviewsForJob } from "../controllers/reviewController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", createReview);
router.get("/user/:userId", listReviewsForUser);
router.get("/job/:jobId", listReviewsForJob);

export default router;
