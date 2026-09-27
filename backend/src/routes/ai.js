import { Router } from "express";

import { suggestJob } from "../controllers/aiController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth); // must be logged in to burn AI calls

router.post("/suggest-job", suggestJob);

export default router;
