"use client";

import { useState } from "react";
import Link from "next/link";
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
  showBackButton?: boolean;
  backHref?: string;
}

export default function ChatHeader({
  conversationTitle,
  onUserChange,
  showBackButton = false,
  backHref = "/",
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
    <div className="bg-white border-b border-beige-frame px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showBackButton && (
          <Link
            href={backHref}
            className="flex-shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-sm text-gray-dark hover:bg-beige-light transition-colors touch-manipulation"
            data-testid="messages-back-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 sm:w-5 sm:h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
        )}
        <h1 
          data-testid={conversationTitle ? "chat-thread-title" : "messages-title"} 
          className="text-base sm:text-lg font-semibold text-gray-dark truncate"
        >
          {conversationTitle || "Messages"}
        </h1>
      </div>
      <div className="relative flex-shrink-0">
        <button
          data-testid="chat-user-switcher"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-beige-light transition-colors touch-manipulation"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-accent flex items-center justify-center text-white text-xs sm:text-sm font-medium">
            {currentUser.name.charAt(0)}
          </div>
          <span className="text-xs sm:text-sm text-gray-dark hidden sm:inline">{currentUser.name}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-medium"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div 
              data-testid="chat-user-dropdown"
              className="absolute right-0 mt-2 w-48 bg-white border border-beige-frame rounded-lg shadow-lg z-20"
            >
              <div className="py-1">
                {DEMO_USERS.map((user) => (
                  <button
                    key={user.id}
                    data-testid={`chat-user-option-${user.id}`}
                    onClick={() => handleUserChange(user.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-beige-light transition-colors flex items-center gap-2 touch-manipulation ${
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
          </>
        )}
      </div>
    </div>
  );
}

