import React, { useEffect, useRef, useState } from "react";
import {
    BotIcon,
    SendIcon,
    XIcon,
    RefreshCwIcon,
    SparklesIcon,
    ChevronDownIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendChatMessage } from "../services/chatbotService";
import ChatMessage from "./ChatMessage";

// ─── Suggested Questions ──────────────────────────────────────────────────────
const EMPLOYEE_SUGGESTIONS = [
    "How many leaves do I have?",
    "What is my attendance this month?",
    "Explain my latest payslip",
    "What is the leave approval process?",
    "How do I apply for leave?",
];

const ADMIN_SUGGESTIONS = [
    "How many employees are registered?",
    "How many employees are active?",
    "How many leave requests are pending?",
    "What is today's attendance summary?",
    "How does leave approval work?",
];

// ─── Welcome message ──────────────────────────────────────────────────────────
const WELCOME_MESSAGE = {
    role: "assistant",
    content:
        "👋 Hi! I'm your AI HR Assistant. I can help you with HR questions, attendance, leave details, payslips, and more.\n\nHow can I help you today?",
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div className="flex gap-2.5 items-end">
        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <BotIcon className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    </div>
);

// ─── Main Chatbot Component ───────────────────────────────────────────────────
const Chatbot = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const suggestions = user?.role === "ADMIN" ? ADMIN_SUGGESTIONS : EMPLOYEE_SUGGESTIONS;

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading, isOpen]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const handleSend = async (text) => {
        const msgText = (text || inputValue).trim();
        if (!msgText || isLoading) return;

        const userMessage = { role: "user", content: msgText };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);
        setError(null);
        setShowSuggestions(false);

        // Build history from messages (exclude the welcome message for cleanliness)
        const history = messages
            .filter((m) => m.content !== WELCOME_MESSAGE.content || m.role !== "assistant")
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content }));

        try {
            const reply = await sendChatMessage(msgText, history);
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        } catch (err) {
            const errMsg =
                err?.response?.data?.error ||
                "Something went wrong. Please try again.";
            setError(errMsg);
            // Remove the user's message so they can retry
            setMessages((prev) => prev.slice(0, -1));
            setInputValue(msgText); // Restore input for retry
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleReset = () => {
        setMessages([WELCOME_MESSAGE]);
        setInputValue("");
        setError(null);
        setIsLoading(false);
        setShowSuggestions(true);
    };

    // Only render if user is logged in
    if (!user) return null;

    return (
        <>
            {/* ── Floating Toggle Button ── */}
            <button
                id="chatbot-toggle-btn"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={isOpen ? "Close HR Chatbot" : "Open HR Chatbot"}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center
                    transition-all duration-300 hover:scale-105 active:scale-95
                    ${isOpen
                        ? "bg-slate-800 text-white"
                        : "bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-indigo-500/30"
                    }`}
            >
                {isOpen
                    ? <XIcon className="w-5 h-5" />
                    : <BotIcon className="w-6 h-6" />
                }
            </button>

            {/* ── Chat Window ── */}
            <div
                id="chatbot-window"
                className={`fixed bottom-24 right-6 z-50 w-[360px] sm:w-[380px] max-h-[580px]
                    flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/20
                    border border-slate-200/80 bg-slate-50
                    transition-all duration-300 origin-bottom-right
                    ${isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"}`}
            >
                {/* Header */}
                <div className="bg-linear-to-r from-indigo-600 to-indigo-500 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                            <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">HR Assistant</p>
                            <p className="text-indigo-200 text-[11px]">AI-powered · Always available</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Reset conversation */}
                        <button
                            id="chatbot-reset-btn"
                            onClick={handleReset}
                            title="Start new conversation"
                            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <RefreshCwIcon className="w-3.5 h-3.5" />
                        </button>
                        {/* Close */}
                        <button
                            id="chatbot-close-btn"
                            onClick={() => setIsOpen(false)}
                            title="Close"
                            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <XIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {messages.map((msg, i) => (
                        <ChatMessage key={i} role={msg.role} content={msg.content} />
                    ))}

                    {/* Typing indicator */}
                    {isLoading && <TypingIndicator />}

                    {/* Error message */}
                    {error && (
                        <div className="flex gap-2 items-start p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                            <span className="flex-1">{error}</span>
                            <button
                                id="chatbot-retry-btn"
                                onClick={() => handleSend(inputValue)}
                                className="font-semibold underline underline-offset-2 hover:text-rose-900 whitespace-nowrap"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions */}
                {showSuggestions && messages.length <= 1 && (
                    <div className="px-3 pb-2 flex-shrink-0">
                        <div className="flex items-center gap-1 mb-2">
                            <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                Quick questions
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleSend(q)}
                                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-slate-200
                                        text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50
                                        transition-all duration-150 text-left"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
                    <div className="flex gap-2 items-end">
                        <textarea
                            id="chatbot-input"
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask an HR question..."
                            rows={1}
                            maxLength={500}
                            disabled={isLoading}
                            className="flex-1 resize-none text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                                transition-all duration-200 placeholder:text-slate-400 max-h-32
                                disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ minHeight: "40px" }}
                            onInput={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                            }}
                        />
                        <button
                            id="chatbot-send-btn"
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim() || isLoading}
                            aria-label="Send message"
                            className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0
                                hover:bg-indigo-700 active:scale-95 transition-all duration-150
                                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                        >
                            <SendIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-right">
                        {inputValue.length}/500 · Press Enter to send
                    </p>
                </div>
            </div>
        </>
    );
};

export default Chatbot;
