import { Router } from "express";

import { nearbyProviders } from "../controllers/providerController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/nearby", nearbyProviders);

export default router;
