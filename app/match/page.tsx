"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { listUsersAsync } from "@/lib/demo/userStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

function MatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, isLoading, isAdmin } = useSession();
  const {
    listEvents,
    getMatches,
    isLiked,
    likeUser,
    hasMutualLike,
    getOrCreateConversation,
  } = useDemoStore();

  const [events, setEvents] = useState(useDemoStore.getState().listEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get("eventId") || null
  );
  const [matches, setMatches] = useState<
    Array<{
      otherEmail: string;
      score: number;
      aligned?: string[];
      mismatched?: string[];
    }>
  >([]);
  const [sessionUsers, setSessionUsers] = useState<
    Record<string, { name: string; picture?: string; phone?: string }>
  >({});

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/register");
      return;
    }

    setEvents(useDemoStore.getState().listEvents());
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }

    (async () => {
      const all = await listUsersAsync();
      const users: Record<string, { name: string; picture?: string; phone?: string }> = {};
      all.forEach((u) => {
        if (!u.email) return;
        users[u.email] = { name: u.name, picture: u.profilePhotoUrl, phone: u.phone };
      });
      setSessionUsers(users);
    })();
  }, [isLoggedIn, isLoading, router, events.length, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId || !user?.email) return;
    const eventMatches = getMatches(selectedEventId, user.email);
    setMatches(eventMatches.slice(0, 3));
  }, [selectedEventId, user, getMatches]);

  const handleLike = (otherEmail: string) => {
    if (!selectedEventId || !user?.email) return;
    likeUser(selectedEventId, user.email, otherEmail);

    if (hasMutualLike(selectedEventId, user.email, otherEmail)) {
      getOrCreateConversation(selectedEventId, user.email, otherEmail);
      alert(
        `You and ${sessionUsers[otherEmail]?.name || otherEmail} liked each other! You can now message.`
      );
    }

    const eventMatches = getMatches(selectedEventId, user.email);
    setMatches(eventMatches.slice(0, 3));
  };

  const getUserName = (email: string) => {
    return sessionUsers[email]?.name || email;
  };

  const getUserPicture = (email: string) => {
    return sessionUsers[email]?.picture;
  };

  const getUserPhone = (email: string) => {
    return sessionUsers[email]?.phone;
  };

  /** Phone for WhatsApp: from session or derived from phone_XXXX@demo.local */
  const getPhoneForWhatsApp = (email: string): string | null => {
    const fromSession = sessionUsers[email]?.phone;
    if (fromSession) return fromSession;
    const m = String(email).match(/^phone_(\d+)@demo\.local$/);
    return m ? `+${m[1]}` : null;
  };

  const getWhatsAppUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
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

  const selectedEvent = selectedEventId
    ? useDemoStore.getState().getEvent(selectedEventId)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Your Introductions"
        subtitle="View your compatibility scores and express interest to unlock messaging"
      />

      {events.length === 0 ? (
        <EmptyState
          title="No events available"
          description="Join an event first to see your potential introductions."
        />
      ) : (
        <>
          <div className="mb-6">
            <Select
              label="Select Event"
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              options={events.map((event) => ({
                value: event.id,
                label: `${event.title} (${event.city})`,
              }))}
            />
          </div>

          {selectedEvent && (
            <>
              {matches.length === 0 ? (
                <Card padding="lg">
                  <EmptyState
                    title="No introductions yet"
                    description="Admin needs to run matching for this event."
                    action={
                      isAdmin ? (
                        <Link href={`/admin?demo_admin=1`}>
                          <Button variant="outline" size="md">
                            Go to Admin Dashboard
                          </Button>
                        </Link>
                      ) : undefined
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => {
                    const liked = selectedEventId
                      ? isLiked(selectedEventId, user.email, match.otherEmail)
                      : false;
                    const mutual = selectedEventId
                      ? hasMutualLike(
                          selectedEventId,
                          user.email,
                          match.otherEmail
                        )
                      : false;

                    return (
                      <Card key={match.otherEmail} variant="elevated" padding="md">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {getUserPicture(match.otherEmail) && (
                                <img
                                  src={getUserPicture(match.otherEmail)}
                                  alt={getUserName(match.otherEmail)}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                                  {getUserName(match.otherEmail)}
                                </h3>
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                  {match.otherEmail}
                                </p>
                              </div>
                            </div>
                            <div className="mb-4">
                              <span className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
                                {match.score}%
                              </span>
                              <span className="text-sm ml-2" style={{ color: "var(--text-muted)" }}>
                                Compatibility
                              </span>
                            </div>
                            {(match.aligned && match.aligned.length > 0) ||
                            (match.mismatched && match.mismatched.length > 0) ? (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>
                                    Top Aligned
                                  </div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {(match.aligned || []).map((reason, idx) => (
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
                                  <div className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>
                                    Top Mismatch
                                  </div>
                                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {match.mismatched && match.mismatched[0]
                                      ? match.mismatched[0]
                                      : "No notable mismatches"}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {liked && <Badge variant="success">✓ Liked</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:ml-4">
                            {!liked ? (
                              <Button
                                onClick={() => handleLike(match.otherEmail)}
                                size="md"
                              >
                                Express Interest
                              </Button>
                            ) : mutual ? (
                              getPhoneForWhatsApp(match.otherEmail) ? (
                                <a
                                  href={getWhatsAppUrl(getPhoneForWhatsApp(match.otherEmail)!)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex w-full items-center justify-center font-medium transition-all duration-200 rounded-xl touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2.5 text-base bg-[var(--bg-muted)] text-[var(--text)] hover:bg-[var(--border)] focus:ring-[var(--primary)] no-underline"
                                  style={{ WebkitTapHighlightColor: "transparent" }}
                                >
                                  Message
                                </a>
                              ) : (
                                <Link
                                  href={`/messages/${selectedEventId}:${[user.email, match.otherEmail].sort().join(":")}`}
                                  className="block w-full"
                                >
                                  <Button variant="secondary" size="md" fullWidth>
                                    Message
                                  </Button>
                                </Link>
                              )
                            ) : (
                              <span className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                                Waiting for mutual interest
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="mt-8">
        <Link
          href="/events"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16">
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      }
    >
      <MatchPageContent />
    </Suspense>
  );
}
