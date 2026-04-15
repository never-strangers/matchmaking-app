"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type MatchCardProps = {
  eventId: string;
  otherProfileId: string;
  displayName: string;
  score: number;
  aligned: string[];
  mismatched: string[];
  likedByMe?: boolean;
  mutual?: boolean;
  whatsappUrl?: string | null;
  conversationId?: string | null;
  matchResultId?: string;
  currentUserInstagram?: string | null;
  instagramSharedByMe?: boolean;
  matchType?: "date" | "friend";
};

export function MatchCard({
  eventId,
  otherProfileId,
  displayName,
  score,
  aligned,
  mismatched,
  conversationId,
  matchResultId,
  currentUserInstagram = null,
  instagramSharedByMe = false,
  matchType = "date",
}: MatchCardProps) {
  const router = useRouter();
  const [chatLoading, setChatLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [sharedLocal, setSharedLocal] = useState(false);

  const handleChatNow = async () => {
    let cid = conversationId ?? null;
    if (!cid && matchResultId) {
      setChatLoading(true);
      try {
        const res = await fetch("/api/conversations/ensure-for-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ match_result_id: matchResultId }),
        });
        if (!res.ok) {
          const err = (await res.json()).error || "Failed to open chat";
          alert(err);
          setChatLoading(false);
          return;
        }
        const data = (await res.json()) as { conversationId: string };
        cid = data.conversationId;
      } catch {
        alert("Failed to open chat");
        setChatLoading(false);
        return;
      }
      setChatLoading(false);
    }
    if (cid) router.push(`/messages?c=${cid}`);
  };

  const ensureConversationThenShare = async (): Promise<string | null> => {
    let cid = conversationId ?? null;
    if (!cid && matchResultId) {
      const res = await fetch("/api/conversations/ensure-for-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ match_result_id: matchResultId }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { conversationId: string };
      cid = data.conversationId;
    }
    return cid;
  };

  const handleShareInstagram = async () => {
    setShareModalOpen(false);
    setShareLoading(true);
    try {
      const cid = await ensureConversationThenShare();
      if (!cid) {
        alert("Failed to open conversation");
        setShareLoading(false);
        return;
      }
      const res = await fetch(`/api/conversations/${cid}/share-instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Failed to share");
        setShareLoading(false);
        return;
      }
      setSharedLocal(true);
    } catch {
      alert("Failed to share");
    }
    setShareLoading(false);
  };

  const showShared = instagramSharedByMe || sharedLocal;

  return (
    <Card variant="elevated" padding="md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text)" }}
          >
            {displayName}
            {(matchType ?? "date") === "date" ? (
              <span
                className="ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full align-middle"
                style={{
                  backgroundColor: "rgba(220,80,80,0.10)",
                  color: "var(--primary, #c0392b)",
                  border: "1px solid rgba(220,80,80,0.25)",
                }}
                data-testid="match-type-badge"
                data-match-type="date"
              >
                ❤️ Date match
              </span>
            ) : (
              <span
                className="ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full align-middle"
                style={{
                  backgroundColor: "var(--bg-subtle, rgba(120,120,120,0.12))",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
                data-testid="match-type-badge"
                data-match-type="friend"
              >
                👥 Friend match
              </span>
            )}
          </h3>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Profile: {otherProfileId}
          </p>
          <div className="mt-3">
            <span
              className="text-3xl font-bold"
              style={{ color: "var(--primary)" }}
            >
              {score}%
            </span>
            <span
              className="text-sm ml-2"
              style={{ color: "var(--text-muted)" }}
            >
              Compatibility
            </span>
          </div>
          {(aligned.length > 0 || mismatched.length > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Top Aligned
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {aligned.slice(0, 3).map((reason, idx) => (
                    <li
                      key={idx}
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Top Mismatch
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {mismatched[0] || "No notable mismatches"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleChatNow}
            disabled={chatLoading}
            data-testid="match-chat-now"
          >
            {chatLoading ? "Opening…" : "Chat now"}
          </Button>
          {showShared ? (
            <span
              className="text-sm px-3 py-1.5 rounded-lg border text-center"
              style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
              data-testid="match-instagram-shared"
            >
              Instagram shared ✓
            </span>
          ) : !currentUserInstagram ? (
            <Link
              href="/profile"
              className="text-sm font-medium px-3 py-1.5 rounded-lg border text-center block"
              style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
              data-testid="match-add-instagram-link"
            >
              Add your Instagram in Profile
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                disabled={shareLoading}
                className="text-sm font-medium px-3 py-1.5 rounded-lg border w-full sm:w-auto"
                style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
                data-testid="match-share-instagram"
              >
                {shareLoading ? "Sharing…" : "Share Instagram"}
              </button>
              {shareModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="share-instagram-title"
                  onClick={() => setShareModalOpen(false)}
                >
                  <div
                    className="rounded-xl border p-6 max-w-sm w-full"
                    style={{
                      backgroundColor: "var(--bg-panel)",
                      borderColor: "var(--border)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 id="share-instagram-title" className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                      Share your Instagram with {displayName}?
                    </h2>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button
                        type="button"
                        onClick={() => setShareModalOpen(false)}
                        className="px-4 py-2 rounded-lg border text-sm font-medium"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        Cancel
                      </button>
                      <Button variant="primary" size="md" onClick={handleShareInstagram}>
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
