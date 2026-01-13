"use client";

import { useState, KeyboardEvent } from "react";
import { sendMessage, getCurrentUserId } from "@/lib/chatStore";

interface MessageComposerProps {
  conversationId: string;
  onMessageSent?: () => void;
}

export default function MessageComposer({
  conversationId,
  onMessageSent,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;

    const currentUserId = getCurrentUserId();
    sendMessage(conversationId, {
      senderId: currentUserId,
      body: message.trim(),
    });

    setMessage("");
    setIsTyping(false);
    onMessageSent?.();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white p-3 sm:p-4 safe-area-inset-bottom w-full">
      {isTyping && (
        <div className="text-xs text-gray-medium mb-2 px-2">
          <span className="inline-flex items-center gap-1">
            <span className="animate-pulse">●</span>
            Typing...
          </span>
        </div>
      )}
      <div className="flex items-end gap-2 w-full">
        <textarea
          data-testid="message-input"
          value={message}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-3 sm:px-4 py-2 border border-beige-frame rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-accent focus:border-transparent text-sm sm:text-base"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />
        <button
          data-testid="message-send"
          onClick={handleSend}
          disabled={!message.trim()}
          className="bg-red-accent text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation min-w-[60px] sm:min-w-[80px] flex-shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}

