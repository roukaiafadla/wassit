import { Router } from "express";

import { createOffer, acceptOffer } from "../controllers/offerController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", createOffer);
router.patch("/:id/accept", acceptOffer);

export default router;
