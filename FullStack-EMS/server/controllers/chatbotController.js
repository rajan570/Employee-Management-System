import { getChatResponse } from "../services/openaiService.js";
import {
    detectIntent,
    formatAdminContext,
    formatEmployeeContext,
    getAdminWorkforceSummary,
    getEmployeeAttendanceSummary,
    getEmployeeLeaveSummary,
    getEmployeeLatestPayslip,
    getEmployeeProfile,
} from "../services/chatbotContextService.js";

const MAX_MESSAGE_LENGTH = 500;

/**
 * POST /api/chatbot/message
 * Handles a chatbot message from an authenticated employee or admin.
 */
export const handleChatMessage = async (req, res) => {
    try {
        const session = req.session; // Set by `protect` middleware via JWT
        const { message, history = [] } = req.body;

        // ── Input Validation ────────────────────────────────────────────────
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required." });
        }
        if (message.trim().length === 0) {
            return res.status(400).json({ error: "Message cannot be empty." });
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            return res
                .status(400)
                .json({ error: `Message must be under ${MAX_MESSAGE_LENGTH} characters.` });
        }

        // Sanitize conversation history: only allow role/content fields, cap at 10 entries
        const safeHistory = Array.isArray(history)
            ? history
                  .slice(-10)
                  .filter((h) => h?.role && h?.content && typeof h.content === "string")
                  .map((h) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content.slice(0, 1000) }))
            : [];

        const isAdmin = session.role === "ADMIN";
        const userId = session.userId;

        // ── Detect Intent ───────────────────────────────────────────────────
        const intent = detectIntent(message);

        let contextData = "";
        let userInfo = { name: session.email, role: session.role };

        // ── Fetch Context Data from MongoDB ─────────────────────────────────
        if (isAdmin) {
            // Admin: only fetch org-wide data if intent suggests it
            if (intent.adminWorkforce) {
                const workforce = await getAdminWorkforceSummary();
                contextData = formatAdminContext(workforce);
            }
            userInfo.name = "Admin";
        } else {
            // Employee: fetch ONLY that employee's own data from the JWT userId
            const profile = intent.profile || intent.attendance || intent.leaves || intent.payslip
                ? await getEmployeeProfile(userId)
                : null;

            if (profile) {
                userInfo.name = `${profile.firstName} ${profile.lastName}`;
                const employeeId = profile._id;

                const [attendance, leaves, payslip] = await Promise.all([
                    intent.attendance ? getEmployeeAttendanceSummary(employeeId) : null,
                    intent.leaves ? getEmployeeLeaveSummary(employeeId) : null,
                    intent.payslip ? getEmployeeLatestPayslip(employeeId) : null,
                ]);

                contextData = formatEmployeeContext(profile, attendance, leaves, payslip);
            }
        }

        // ── Call OpenAI API ─────────────────────────────────────────────────
        const aiResponse = await getChatResponse(message.trim(), contextData, safeHistory, userInfo);

        return res.json({ reply: aiResponse });

    } catch (error) {
        console.error("Chatbot error:", error);

        // Handle OpenAI-specific errors
        if (error?.status === 429) {
            return res.status(429).json({ error: "AI service is busy. Please try again shortly." });
        }
        if (error?.status === 401) {
            return res.status(500).json({ error: "AI service configuration error. Please contact the administrator." });
        }
        if (error?.code === "ETIMEDOUT" || error?.code === "ECONNABORTED") {
            return res.status(504).json({ error: "AI service timed out. Please try again." });
        }

        return res.status(500).json({ error: "Failed to process your message. Please try again." });
    }
};
