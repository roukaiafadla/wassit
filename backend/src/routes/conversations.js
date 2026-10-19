import { Router } from "express";

import { listMyConversations, getConversationByJob, listMessages } from "../controllers/conversationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listMyConversations);
router.get("/by-job/:jobId", getConversationByJob);
router.get("/:id/messages", listMessages);

export default router;
