"use client";

import { useState } from "react";
import {
  getCurrentUserId,
  setCurrentUserId,
  getCurrentUser,
  DEMO_USERS,
} from "@/lib/chatStore";
import { ChatUser } from "@/types/chat";

interface ChatHeaderProps {
  conversationTitle?: string;
  onUserChange?: (user: ChatUser) => void;
}

export default function ChatHeader({
  conversationTitle,
  onUserChange,
}: ChatHeaderProps) {
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [showDropdown, setShowDropdown] = useState(false);

  const handleUserChange = (userId: string) => {
    setCurrentUserId(userId);
    const newUser = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
    setCurrentUserState(newUser);
    setShowDropdown(false);
    onUserChange?.(newUser);
    // Reload page to reflect user change
    window.location.reload();
  };

  return (
    <div className="bg-white border-b border-beige-frame px-4 py-3 flex items-center justify-between">
      <h1 data-testid={conversationTitle ? "chat-thread-title" : "messages-title"} className="text-lg font-semibold text-gray-dark">
        {conversationTitle || "Messages"}
      </h1>
      <div className="relative">
        <button
          data-testid="chat-user-switcher"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-beige-light transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-red-accent flex items-center justify-center text-white text-sm font-medium">
            {currentUser.name.charAt(0)}
          </div>
          <span className="text-sm text-gray-dark">{currentUser.name}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-gray-medium"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
        {showDropdown && (
          <div 
            data-testid="chat-user-dropdown"
            className="absolute right-0 mt-2 w-48 bg-white border border-beige-frame rounded-lg shadow-lg z-10"
          >
            <div className="py-1">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  data-testid={`chat-user-option-${user.id}`}
                  onClick={() => handleUserChange(user.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-beige-light transition-colors flex items-center gap-2 ${
                    currentUser.id === user.id
                      ? "bg-beige-light text-red-accent"
                      : "text-gray-dark"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-red-accent flex items-center justify-center text-white text-xs font-medium">
                    {user.name.charAt(0)}
                  </div>
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

