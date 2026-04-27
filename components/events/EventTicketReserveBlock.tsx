"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type TicketType = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  cap: number;
  sold: number;
};

type Props = {
  eventId: string;
  ticketTypes: TicketType[];
};

export function EventTicketReserveBlock({ eventId, ticketTypes }: Props) {
  const router = useRouter();
  const single = ticketTypes.length === 1 ? ticketTypes[0] : null;
  const [selectedId, setSelectedId] = useState<string | null>(single?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  const handleBuy = async () => {
    if (!selectedId) {
      setError("Select a ticket type");
      return;
    }
    setLoading(true);
    setError(null);
    setWaitlistMessage(null);
    try {
      // Step 1: Reserve (also handles gender cap → waitlist)
      const reserveRes = await fetch(`/api/events/${eventId}/reserve-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticket_type_id: selectedId }),
      });
      const reserveData = await reserveRes.json().catch(() => ({}));

      if (reserveData?.waitlisted) {
        // Gender cap hit — user is now waitlisted
        setWaitlistMessage(reserveData.message ?? "You\'ve been added to the waitlist.");
        router.refresh();
        return;
      }

      if (!reserveRes.ok) {
        setError(reserveData?.error || "Failed to reserve ticket");
        return;
      }

      // Step 2: Proceed to Stripe checkout
      const checkoutRes = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event_id: eventId }),
      });
      const checkoutData = await checkoutRes.json().catch(() => ({}));
      if (!checkoutRes.ok) {
        setError(checkoutData?.error || "Failed to start checkout");
        return;
      }
      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
        return;
      }
      setError("Unexpected error — please try again");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const allSoldOut = ticketTypes.every((t) => t.cap - t.sold <= 0);

  // Single ticket: skip selector
  if (single) {
    const singleSoldOut = single.cap - single.sold <= 0;
    return (
      <div className="mt-4 space-y-3">
        {singleSoldOut ? (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium"
            style={{ opacity: 0.5, borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle, rgba(0,0,0,0.04))" }}
          >
            Full
          </div>
        ) : (
          <>
            {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
            {waitlistMessage && (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--warning-subtle, #fef9c3)", border: "1px solid var(--warning, #eab308)", color: "var(--text)" }}>
                {waitlistMessage}
              </div>
            )}
            {!waitlistMessage && (
              <Button onClick={handleBuy} size="md" disabled={loading} data-testid="reserve-ticket-button">
                {loading ? "Redirecting to payment…" : "Book slot"}
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // Multiple tickets: show selector
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
        Select a ticket
      </p>
      <div className="space-y-2">
        {ticketTypes.map((t) => {
          const left = t.cap - t.sold;
          const soldOut = left <= 0;
          return (
            <label
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
              style={{
                borderColor: selectedId === t.id ? "var(--primary)" : "var(--border)",
                backgroundColor: selectedId === t.id ? "var(--primary)" + "15" : "transparent",
                opacity: soldOut ? 0.5 : 1,
                pointerEvents: soldOut ? "none" : "auto",
                cursor: soldOut ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="radio"
                name="ticket-type"
                value={t.id}
                checked={selectedId === t.id}
                onChange={() => setSelectedId(t.id)}
                disabled={soldOut}
                className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
              />
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--text)" }}>
                {t.name}
              </span>
              <span className="text-sm font-medium" style={{ color: soldOut ? "var(--text-muted)" : "var(--text-muted)" }}>
                {soldOut
                  ? <span style={{ color: "var(--danger, #dc2626)" }}>Full</span>
                  : `${(t.price_cents / 100).toFixed(2)} ${t.currency.toUpperCase()} · ${left} left`}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      {waitlistMessage && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--warning-subtle, #fef9c3)", border: "1px solid var(--warning, #eab308)", color: "var(--text)" }}>
          {waitlistMessage}
        </div>
      )}
      {!waitlistMessage && !allSoldOut && (
        <Button
          onClick={handleBuy}
          size="md"
          disabled={loading || !selectedId}
          data-testid="reserve-ticket-button"
        >
          {loading ? "Redirecting to payment…" : "Book slot"}
        </Button>
      )}
      {allSoldOut && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          All ticket tiers are currently full.
        </p>
      )}
    </div>
  );
}
