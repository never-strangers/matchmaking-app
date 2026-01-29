"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { listUsersAsync } from "@/lib/demo/userStore";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

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
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/");
      return;
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

    if (user?.email) {
      const userConversations = getConversationsForUser(user.email);
      setConversations(userConversations);
    }
  }, [isLoggedIn, isLoading, router, user, getConversationsForUser]);

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

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  const sortedConversations = [...conversations].sort((a, b) => {
    const msgA = getLastMessage(a.id);
    const msgB = getLastMessage(b.id);
    const timeA = msgA
      ? new Date(msgA.createdAt).getTime()
      : new Date(a.createdAt).getTime();
    const timeB = msgB
      ? new Date(msgB.createdAt).getTime()
      : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Messages"
        subtitle="Your conversations with mutual connections"
      />

      {sortedConversations.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title="No conversations yet"
            description="Express interest on the Introductions page and wait for mutual interest to start messaging."
            action={
              <Link href="/match">
                <Button variant="outline" size="md">
                  View Introductions
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedConversations.map((conversation) => {
            const otherEmail = getOtherUserEmail(conversation);
            const otherName = getOtherUserName(conversation);
            const lastMessage = getLastMessage(conversation.id);
            const otherUser = sessionUsers[otherEmail];

            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="block"
              >
                <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    {otherUser?.picture && (
                      <img
                        src={otherUser.picture}
                        alt={otherName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold truncate" style={{ color: "var(--text)" }}>
                        {otherName}
                      </h3>
                      {lastMessage && (
                        <p className="text-sm truncate mt-1" style={{ color: "var(--text-muted)" }}>
                          {lastMessage.body}
                        </p>
                      )}
                      {lastMessage && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
                          {new Date(lastMessage.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/match"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Introductions
        </Link>
      </div>
    </div>
  );
}
