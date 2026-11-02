import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.js";
import { handleChatMessage } from "../controllers/chatbotController.js";

const chatbotRouter = express.Router();

// Rate limiter: max 20 chatbot requests per user per minute
const chatRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    keyGenerator: (req) => req.session?.userId || req.ip, // Per user, not IP (after JWT auth)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a moment before sending another message." },
});

// POST /api/chatbot/message — requires authentication
chatbotRouter.post("/message", protect, chatRateLimiter, handleChatMessage);

export default chatbotRouter;
