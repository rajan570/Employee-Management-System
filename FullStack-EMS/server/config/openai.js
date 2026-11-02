import OpenAI from "openai";

// Initialize OpenAI client using API key from environment
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30s timeout
    maxRetries: 2,
});

export default openaiClient;
