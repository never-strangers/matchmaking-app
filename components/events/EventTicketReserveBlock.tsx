"use client";

import { useState } from "react";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    if (!selectedId) {
      setError("Select a ticket type");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Step 1: Reserve the ticket (handles capacity locking)
      const reserveRes = await fetch(`/api/events/${eventId}/reserve-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticket_type_id: selectedId }),
      });
      const reserveData = await reserveRes.json().catch(() => ({}));
      if (!reserveRes.ok) {
        setError(reserveData?.error || "Failed to reserve ticket");
        return;
      }

      // Step 2: Immediately create Stripe checkout and redirect
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

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
        Select a ticket
      </p>
      <div className="space-y-2">
        {ticketTypes.map((t) => {
          const left = t.cap - t.sold;
          return (
            <label
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
              style={{
                borderColor: selectedId === t.id ? "var(--primary)" : "var(--border)",
                backgroundColor: selectedId === t.id ? "var(--primary)" + "15" : "transparent",
              }}
            >
              <input
                type="radio"
                name="ticket-type"
                value={t.id}
                checked={selectedId === t.id}
                onChange={() => setSelectedId(t.id)}
                className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
              />
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--text)" }}>
                {t.name}
              </span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {(t.price_cents / 100).toFixed(2)} {t.currency.toUpperCase()} · {left} left
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <Button
        onClick={handleBuy}
        size="md"
        disabled={loading || !selectedId}
        data-testid="reserve-ticket-button"
      >
        {loading ? "Redirecting to payment…" : "Buy ticket"}
      </Button>
    </div>
  );
}
