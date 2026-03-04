"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useInviteSession } from "@/lib/auth/useInviteSession";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_RETRIES = 3;
const INITIAL_BACKOFF_MS = 4000;

type ApiConversation = {
  id: string;
  eventId: string;
  eventTitle: string;
  otherProfileId: string;
  otherDisplayName: string;
  created_at: string;
};

type ApiMessage = {
  id: string;
  senderId: string | null;
  kind: string;
  body: string | null;
  payload: unknown;
  createdAt: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams?.get("c") ?? null;
  const { user, isLoggedIn, isLoading: sessionLoading } = useInviteSession();

  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<{
    id: string;
    otherDisplayName: string;
    otherProfileId: string;
    currentUserInstagram: string | null;
    instagramSharedByMe: boolean;
    mySharedHandle: string | null;
  } | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const profileIdRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const messagesInFlightRef = useRef(false);
  const pollRetryCountRef = useRef(0);

  const profileId = user?.profileId ?? null;
  if (profileId !== profileIdRef.current) profileIdRef.current = profileId;

  useEffect(() => {
    if (sessionLoading) return;
    if (!isLoggedIn || !user) {
      router.replace("/login");
      return;
    }
  }, [sessionLoading, isLoggedIn, user, router]);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations || []);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !profileId) return;
    setConversationsLoading(true);
    fetchConversations().finally(() => setConversationsLoading(false));
  }, [isLoggedIn, profileId, fetchConversations]);

  const fetchMessagesForConversation = useCallback(
    async (cid: string, signal?: AbortSignal) => {
      if (messagesInFlightRef.current) return;
      messagesInFlightRef.current = true;
      try {
        const res = await fetch(`/api/conversations/${cid}/messages`, {
          credentials: "include",
          signal,
        });
        if (signal?.aborted) return;
        if (!res.ok) {
          pollRetryCountRef.current += 1;
          return;
        }
        pollRetryCountRef.current = 0;
        const data = await res.json();
        if (signal?.aborted) return;
        setMessages(data.messages || []);
      } finally {
        messagesInFlightRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    if (!openId || !profileId) return;

    const abort = new AbortController();
    fetchAbortRef.current = abort;
    setMessagesLoading(true);
    setActiveConv(null);

    (async () => {
      try {
        const res = await fetch(`/api/conversations/${openId}`, {
          credentials: "include",
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        if (!res.ok) {
          setMessagesLoading(false);
          if (res.status === 403 || res.status === 404) router.replace("/messages");
          return;
        }
        const conv = await res.json();
        if (abort.signal.aborted) return;
        setActiveConv({
          id: conv.id,
          otherDisplayName: conv.otherDisplayName || conv.otherProfileId,
          otherProfileId: conv.otherProfileId,
          currentUserInstagram: conv.currentUserInstagram ?? null,
          instagramSharedByMe: conv.instagramSharedByMe ?? false,
          mySharedHandle: conv.mySharedHandle ?? null,
        });
        await fetchMessagesForConversation(openId, abort.signal);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setMessagesLoading(false);
      } finally {
        if (!abort.signal.aborted) setMessagesLoading(false);
      }
    })();

    return () => {
      abort.abort();
      fetchAbortRef.current = null;
    };
  }, [openId, profileId, router, fetchMessagesForConversation]);

  useEffect(() => {
    if (!openId) return;

    const cid = openId;
    pollRetryCountRef.current = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      if (pollRetryCountRef.current >= MAX_POLL_RETRIES) return;
      const delay =
        pollRetryCountRef.current > 0
          ? Math.min(INITIAL_BACKOFF_MS * Math.pow(2, pollRetryCountRef.current - 1), 30000)
          : POLL_INTERVAL_MS;
      timeoutId = setTimeout(tick, delay);
    };

    const tick = () => {
      timeoutId = null;
      if (cancelled) return;
      if (document.hidden) {
        scheduleNext();
        return;
      }
      if (messagesInFlightRef.current) {
        scheduleNext();
        return;
      }
      fetchMessagesForConversation(cid).then(scheduleNext);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [openId, fetchMessagesForConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleShareInstagram = async () => {
    if (!openId || !activeConv || sharing) return;
    if (!confirm(`Share your Instagram with ${activeConv.otherDisplayName}?`)) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/conversations/${openId}/share-instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Failed to share");
        setSharing(false);
        return;
      }
      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              instagramSharedByMe: true,
              mySharedHandle: j.handle ?? prev.mySharedHandle,
            }
          : null
      );
      await fetchMessagesForConversation(openId);
    } catch {
      alert("Failed to share");
    }
    setSharing(false);
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !openId || !user || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${openId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error || "Failed to send");
        setSending(false);
        return;
      }
      const msg = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          senderId: msg.senderId,
          kind: msg.kind,
          body: msg.body,
          payload: msg.payload,
          createdAt: msg.createdAt,
        },
      ]);
      setNewMessage("");
    } catch {
      alert("Failed to send");
    }
    setSending(false);
  };

  if (sessionLoading || (!isLoggedIn && !user)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  if (openId && activeConv) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/messages"
            className="text-sm hover:underline inline-block mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to Messages
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
              {activeConv.otherDisplayName}
            </h1>
            {activeConv.instagramSharedByMe && activeConv.mySharedHandle ? (
              <span
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                data-testid="chat-instagram-shared-chip"
              >
                @{activeConv.mySharedHandle}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeConv.mySharedHandle!);
                  }}
                  className="text-xs font-medium"
                  style={{ color: "var(--primary)" }}
                  aria-label="Copy handle"
                >
                  Copy
                </button>
              </span>
            ) : activeConv.currentUserInstagram ? (
              <button
                type="button"
                onClick={handleShareInstagram}
                disabled={sharing}
                className="text-sm font-medium px-3 py-1.5 rounded-lg border"
                style={{
                  color: "var(--text-muted)",
                  borderColor: "var(--border)",
                }}
                data-testid="chat-share-instagram"
              >
                {sharing ? "Sharing…" : "Share Instagram"}
              </button>
            ) : (
              <Link
                href="/profile"
                className="text-sm font-medium px-3 py-1.5 rounded-lg border inline-block"
                style={{
                  color: "var(--text-muted)",
                  borderColor: "var(--border)",
                }}
                data-testid="chat-add-instagram-link"
              >
                Add your Instagram in Profile
              </Link>
            )}
          </div>
        </div>
        <div
          className="border rounded-xl flex flex-col overflow-hidden"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-panel)",
            height: "480px",
          }}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !messagesLoading ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
                No messages yet. Say hi!
              </p>
            ) : (
              messages.map((m) => {
                const isOwn = m.senderId === user.profileId;
                const isSystem = m.kind === "system";
                const isContactShare = m.kind === "contact_share";
                const payload = m.payload as { type?: string; handle?: string; value?: string } | null;
                const isInstagramShare = payload?.type === "instagram";
                const instagramHandle = isInstagramShare
                  ? (payload?.handle ?? payload?.value ?? null)
                  : null;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    data-testid="message-item"
                  >
                    {isSystem ? (
                      <p className="text-xs text-center w-full" style={{ color: "var(--text-muted)" }}>
                        {m.body}
                      </p>
                    ) : isContactShare && isInstagramShare && instagramHandle ? (
                      <div
                        className="max-w-xs px-4 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: "var(--bg)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                        }}
                      >
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {isOwn ? "You" : activeConv.otherDisplayName} shared Instagram
                        </p>
                        <a
                          href={`https://instagram.com/${instagramHandle.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--primary)] hover:underline break-all"
                        >
                          @{instagramHandle.replace(/^@/, "")}
                        </a>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] px-4 py-2 rounded-xl text-sm ${
                          isOwn
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                            : "bg-[var(--bg)] border border-[var(--border)]"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p
                          className={`text-xs mt-1 ${isOwn ? "opacity-80" : ""}`}
                          style={{ color: "var(--text-muted)" }}
                        >
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <div
            className="border-t p-4 flex gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg)",
                color: "var(--text)",
              }}
              data-testid="message-input"
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              data-testid="message-send"
            >
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (openId && messagesLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p style={{ color: "var(--text-muted)" }}>Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Messages"
        subtitle="Your conversations with matches"
      />
      {conversationsLoading ? (
        <Card padding="lg">
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        </Card>
      ) : conversations.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title="No conversations yet"
            description="After a match is revealed, use Chat now on the match card to start a conversation."
            action={
              <Link href="/match">
                <Button variant="outline" size="md">
                  View Matches
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages?c=${c.id}`}
              className="block"
              data-testid={`conversation-${c.id}`}
            >
              <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {(c.otherDisplayName || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate" style={{ color: "var(--text)" }}>
                      {c.otherDisplayName}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {c.eventTitle}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-8">
        <Link
          href="/match"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Matches
        </Link>
      </div>
    </div>
  );
}
