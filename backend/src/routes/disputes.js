import { Router } from "express";

import { createDispute, listMyDisputes } from "../controllers/disputeController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", createDispute);
router.get("/mine", listMyDisputes);

export default router;
