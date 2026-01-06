"use client";

import Link from "next/link";
import { Conversation } from "@/types/chat";
import { getUnreadCount, getCurrentUserId } from "@/lib/chatStore";
import { DEMO_USERS } from "@/lib/chatStore";

interface ConversationListItemProps {
  conversation: Conversation;
}

export default function ConversationListItem({
  conversation,
}: ConversationListItemProps) {
  const unreadCount = getUnreadCount(conversation.id);
  const currentUserId = getCurrentUserId();
  const otherMemberId = conversation.memberIds.find(
    (id) => id !== currentUserId
  );
  const otherUser = DEMO_USERS.find((u) => u.id === otherMemberId);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="block px-4 py-3 hover:bg-beige-light transition-colors border-b border-beige-frame"
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-red-accent flex items-center justify-center text-white font-medium">
            {otherUser?.name.charAt(0) || "?"}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-dark truncate">
              {conversation.title}
            </h3>
            <span className="text-xs text-gray-medium whitespace-nowrap ml-2">
              {formatTime(conversation.updatedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-medium truncate">
              {conversation.lastMessagePreview || "No messages yet"}
            </p>
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-accent text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

