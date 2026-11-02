import React from "react";
import { BotIcon, UserIcon } from "lucide-react";

/**
 * ChatMessage — renders a single message bubble.
 *
 * @param {{ role: "user"|"assistant", content: string }} props
 */
const ChatMessage = ({ role, content }) => {
    const isUser = role === "user";

    return (
        <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
            {/* Avatar */}
            <div
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    ${isUser
                        ? "bg-indigo-600"
                        : "bg-slate-100 border border-slate-200"
                    }`}
            >
                {isUser
                    ? <UserIcon className="w-3.5 h-3.5 text-white" />
                    : <BotIcon className="w-3.5 h-3.5 text-indigo-600" />
                }
            </div>

            {/* Bubble */}
            <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${isUser
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                    }`}
            >
                {content}
            </div>
        </div>
    );
};

export default ChatMessage;
