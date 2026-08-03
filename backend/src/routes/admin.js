import { Router } from "express";

import { listPendingProviders, verifyProvider } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/providers/pending", listPendingProviders);
router.patch("/providers/:id/verify", verifyProvider);

export default router;
