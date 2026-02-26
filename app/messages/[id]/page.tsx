"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { listUsersAsync } from "@/lib/demo/userStore";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const conversationId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";
  const { user, isLoggedIn, isLoading } = useSession();
  const { getConversation, getMessages, addMessage, hasMutualLike } = useDemoStore();
  const [conversation, setConversation] = useState(
    useDemoStore.getState().getConversation(conversationId)
  );
  const [messages, setMessages] = useState(
    useDemoStore.getState().getMessages(conversationId)
  );
  const [newMessage, setNewMessage] = useState("");
  const [sessionUsers, setSessionUsers] = useState<
    Record<string, { name: string; picture?: string }>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for session to load before checking
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/");
      return;
    }

    const conv = getConversation(conversationId);
    if (!conv) {
      router.replace("/messages");
      return;
    }
    setConversation(conv);

    // Check mutual like
    if (user?.email) {
      const otherEmail = conv.a === user.email ? conv.b : conv.a;
      const mutual = hasMutualLike(conv.eventId, user.email, otherEmail);
      if (!mutual) {
        alert("You can only message users you have a mutual like with.");
        router.replace("/messages");
        return;
      }
    }

    (async () => {
      const all = await listUsersAsync();
      const users: Record<string, { name: string; picture?: string }> = {};
      all.forEach((u) => {
        if (!u.email) return;
        users[u.email] = { name: u.name, picture: u.profilePhotoUrl };
      });
      setSessionUsers(users);
    })();

    // Load messages
    const msgs = getMessages(conversationId);
    setMessages(msgs);
  }, [conversationId, isLoggedIn, isLoading, user, router, getConversation, getMessages, hasMutualLike]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refresh messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = getMessages(conversationId);
      setMessages(msgs);
    }, 2000);
    return () => clearInterval(interval);
  }, [conversationId, getMessages]);

  const handleSend = () => {
    if (!newMessage.trim() || !user?.email || !conversation) return;

    // Check mutual like again
    const otherEmail = conversation.a === user.email ? conversation.b : conversation.a;
    const mutual = hasMutualLike(conversation.eventId, user.email, otherEmail);
    if (!mutual) {
      alert("You can only message users you have a mutual like with.");
      return;
    }

    addMessage(conversationId, user.email, newMessage.trim());
    setNewMessage("");
    const msgs = getMessages(conversationId);
    setMessages(msgs);
  };

  const getOtherUserEmail = () => {
    if (!conversation || !user?.email) return "";
    return conversation.a === user.email ? conversation.b : conversation.a;
  };

  const getOtherUserName = () => {
    const otherEmail = getOtherUserEmail();
    return sessionUsers[otherEmail]?.name || otherEmail;
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user || !conversation) {
    return null; // Will redirect
  }

  const otherEmail = getOtherUserEmail();
  const otherName = getOtherUserName();
  const otherUser = sessionUsers[otherEmail];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-6">
        <Link
          href="/messages"
          className="text-gray-medium hover:text-gray-dark text-sm mb-4 inline-block"
        >
          ← Back to Messages
        </Link>
        <div className="flex items-center gap-3">
          {otherUser?.picture && (
            <img
              src={otherUser.picture}
              alt={otherName}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-dark">{otherName}</h1>
            <p className="text-sm text-gray-medium">{otherEmail}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-beige-frame rounded-lg flex flex-col" style={{ height: "600px" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-medium py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender === user.email;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwn
                        ? "bg-red-accent text-white"
                        : "bg-beige-frame text-gray-dark"
                    }`}
                  >
                    <p className="text-sm">{message.body}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? "text-red-100" : "text-gray-medium"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-beige-frame p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-beige-frame rounded-lg focus:outline-none focus:ring-2 focus:ring-red-accent"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="bg-red-accent text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
