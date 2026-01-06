"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import ChatHeader from "@/components/Chat/ChatHeader";
import MessageBubble from "@/components/Chat/MessageBubble";
import MessageComposer from "@/components/Chat/MessageComposer";
import {
  getConversation,
  listMessages,
  subscribe,
  getCurrentUserId,
  ensureConversation,
} from "@/lib/chatStore";
import { ChatMessage, Conversation } from "@/types/chat";
import Link from "next/link";

const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState(getCurrentUserId());

  useEffect(() => {
    if (!isChatEnabled || !conversationId) return;

    const loadConversation = () => {
      const conv = getConversation(conversationId);
      if (conv) {
        setConversation(conv);
        setMessages(listMessages(conversationId));
      } else {
        // If conversation doesn't exist, try to ensure it with current user
        const currentUserId = getCurrentUserId();
        const otherUserId = conversationId.replace(`conv_${currentUserId}_`, "").replace(`conv_`, "").split("_").find(id => id !== currentUserId);
        if (otherUserId) {
          const newConv = ensureConversation(conversationId, [currentUserId, otherUserId]);
          setConversation(newConv);
          setMessages(listMessages(conversationId));
        }
      }
    };

    loadConversation();

    const unsubscribe = subscribe((event) => {
      if (
        event.type === "message_created" &&
        event.conversationId === conversationId
      ) {
        loadConversation();
      }
    });

    // Also listen for storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes(conversationId)) {
        loadConversation();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Reload when user changes
    const checkUser = () => {
      const newUserId = getCurrentUserId();
      if (newUserId !== currentUser) {
        setCurrentUser(newUserId);
        setMessages(listMessages(conversationId));
      }
    };
    const interval = setInterval(checkUser, 500);
    return () => clearInterval(interval);
  }, [conversationId, currentUser]);

  if (!isChatEnabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-dark mb-4">Chat Disabled</h1>
        <p className="text-gray-medium mb-8">
          Chat functionality is currently disabled.
        </p>
        <a href="/" className="text-red-accent hover:underline">
          Back to Home
        </a>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-dark mb-4">
          Conversation not found
        </h1>
        <Link href="/messages" className="text-red-accent hover:underline">
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-beige-light">
      <div className="hidden md:block w-96 border-r border-beige-frame bg-white">
        <div className="p-4">
          <Link
            href="/messages"
            className="text-sm text-gray-medium hover:text-gray-dark"
          >
            ← Back to conversations
          </Link>
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-white">
        <ChatHeader conversationTitle={conversation.title} />
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-medium py-8">
              <p>No messages yet.</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <MessageComposer
          conversationId={conversationId}
          onMessageSent={() => {
            setMessages(listMessages(conversationId));
          }}
        />
      </div>
    </div>
  );
}

