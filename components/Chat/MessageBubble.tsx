"use client";

import { ChatMessage } from "@/types/chat";
import { getCurrentUserId, DEMO_USERS } from "@/lib/chatStore";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const currentUserId = getCurrentUserId();
  const isOwnMessage = message.senderId === currentUserId;
  const sender = DEMO_USERS.find((u) => u.id === message.senderId);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`flex items-end gap-2 mb-4 ${
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isOwnMessage && (
        <div className="w-8 h-8 rounded-full bg-red-accent flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
          {sender?.name.charAt(0) || "?"}
        </div>
      )}
      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[70%]`}>
        {!isOwnMessage && (
          <span className="text-xs text-gray-medium mb-1 px-1">
            {sender?.name || "Unknown"}
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? "bg-red-accent text-white"
              : "bg-white border border-beige-frame text-gray-dark"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.body}
          </p>
        </div>
        <span className="text-xs text-gray-medium mt-1 px-1">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

