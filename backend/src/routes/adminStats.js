import { Router } from "express";

import { overview, demandByCategory, demandByArea, demandTimeline } from "../controllers/adminStatsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/overview", overview);
router.get("/demand/categories", demandByCategory);
router.get("/demand/areas", demandByArea);
router.get("/demand/timeline", demandTimeline);

export default router;
