"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useSession();
  const { getConversationsForUser, getMessages } = useDemoStore();

  const [conversations, setConversations] = useState(
    useDemoStore.getState().getConversationsForUser(user?.email || "")
  );
  const [sessionUsers, setSessionUsers] = useState<
    Record<string, { name: string; picture?: string }>
  >({});

  useEffect(() => {
    // Wait for session to load before checking
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    // Load session users for names
    try {
      const sessionData = localStorage.getItem("ns_session_v1");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        const users: Record<string, { name: string; picture?: string }> = {};
        Object.keys(parsed.users || {}).forEach((email) => {
          users[email] = parsed.users[email];
        });
        setSessionUsers(users);
      }
    } catch {}

    // Load conversations
    if (user?.email) {
      const userConversations = getConversationsForUser(user.email);
      setConversations(userConversations);
    }
  }, [isLoggedIn, isLoading, router, user, getConversationsForUser]);

  // Refresh conversations periodically
  useEffect(() => {
    if (!user?.email) return;
    const interval = setInterval(() => {
      const userConversations = getConversationsForUser(user.email);
      setConversations(userConversations);
    }, 2000);
    return () => clearInterval(interval);
  }, [user, getConversationsForUser]);

  const getOtherUserEmail = (conversation: any) => {
    if (!user?.email) return "";
    return conversation.a === user.email ? conversation.b : conversation.a;
  };

  const getOtherUserName = (conversation: any) => {
    const otherEmail = getOtherUserEmail(conversation);
    return sessionUsers[otherEmail]?.name || otherEmail;
  };

  const getLastMessage = (conversationId: string) => {
    const messages = getMessages(conversationId);
    return messages.length > 0 ? messages[messages.length - 1] : null;
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return null; // Will redirect
  }

  const sortedConversations = [...conversations].sort((a, b) => {
    const msgA = getLastMessage(a.id);
    const msgB = getLastMessage(b.id);
    const timeA = msgA ? new Date(msgA.createdAt).getTime() : new Date(a.createdAt).getTime();
    const timeB = msgB ? new Date(msgB.createdAt).getTime() : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-dark mb-2">Messages</h1>
        <p className="text-gray-medium">
          Your conversations with mutual matches.
        </p>
      </div>

      {sortedConversations.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-800 mb-2">No conversations yet.</p>
          <p className="text-sm text-blue-600 mb-4">
            Like someone on the Match page and wait for them to like you back to start messaging.
          </p>
          <Link
            href="/match"
            className="text-blue-600 underline text-sm"
          >
            Go to Matches
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedConversations.map((conversation) => {
            const otherEmail = getOtherUserEmail(conversation);
            const otherName = getOtherUserName(conversation);
            const lastMessage = getLastMessage(conversation.id);
            const otherUser = sessionUsers[otherEmail];

            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="block border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {otherUser?.picture && (
                    <img
                      src={otherUser.picture}
                      alt={otherName}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-dark truncate">
                      {otherName}
                    </h3>
                    {lastMessage && (
                      <p className="text-sm text-gray-medium truncate">
                        {lastMessage.body}
                      </p>
                    )}
                    {lastMessage && (
                      <p className="text-xs text-gray-medium mt-1">
                        {new Date(lastMessage.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/match"
          className="text-gray-medium hover:text-gray-dark text-sm"
        >
          ← Back to Matches
        </Link>
      </div>
    </div>
  );
}
