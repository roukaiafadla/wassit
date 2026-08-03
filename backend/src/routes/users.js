import { Router } from "express";

import { updateMyLocation, updateMyProviderProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.patch("/me/location", updateMyLocation);
router.patch("/me/provider-profile", updateMyProviderProfile);

export default router;
