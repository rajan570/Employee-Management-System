import api from "../api/axios";

/**
 * Send a message to the chatbot API.
 * The auth token is automatically attached by the axios interceptor.
 *
 * @param {string} message - The user's message
 * @param {Array<{role: string, content: string}>} history - Conversation history
 * @returns {Promise<string>} - The AI reply
 */
export async function sendChatMessage(message, history = []) {
    const { data } = await api.post("/chatbot/message", { message, history });
    return data.reply;
}
