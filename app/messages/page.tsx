"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChatHeader from "@/components/Chat/ChatHeader";
import ConversationListItem from "@/components/Chat/ConversationListItem";
import {
  listConversations,
  subscribe,
  getCurrentUserId,
} from "@/lib/chatStore";
import { Conversation } from "@/types/chat";

const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!isChatEnabled) return;

    const loadConversations = () => {
      setConversations(listConversations());
    };

    loadConversations();

    const unsubscribe = subscribe((event) => {
      if (event.type === "message_created") {
        loadConversations();
      }
    });

    // Also listen for storage events
    const handleStorage = () => {
      loadConversations();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!isChatEnabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-dark mb-4">Chat Disabled</h1>
        <p data-testid="chat-disabled" className="text-gray-medium mb-8">
          Chat functionality is currently disabled.
        </p>
        <Link
          href="/"
          className="text-red-accent hover:underline"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-beige-light">
      <div className="w-full md:w-96 border-r border-beige-frame bg-white flex flex-col">
        <ChatHeader />
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-medium">
              <p>No conversations yet.</p>
              <p className="text-sm mt-2">
                Start a conversation from the Match page.
              </p>
            </div>
          ) : (
            conversations
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              )
              .map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                />
              ))
          )}
        </div>
      </div>
      <div className="hidden md:flex flex-1 items-center justify-center text-gray-medium">
        <div className="text-center">
          <p className="text-lg mb-2">Select a conversation</p>
          <p className="text-sm">or start a new one from the Match page</p>
        </div>
      </div>
    </div>
  );
}

