"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

const CITIES = [
  { value: "", label: "Select city" },
  { value: "Singapore", label: "Singapore" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Bangkok", label: "Bangkok" },
  { value: "Tokyo", label: "Tokyo" },
] as const;

export default function AdminCreateEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [city, setCity] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    if (startAt) {
      const startDate = new Date(startAt);
      if (startDate < new Date()) {
        setError("Start date cannot be in the past");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          start_at: startAt || undefined,
          city: city || undefined,
          price_cents: priceCents === "" ? 0 : parseInt(priceCents, 10) || 0,
          payment_required: paymentRequired,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || (typeof data === "string" ? data : res.statusText) || "Failed to create event");
        return;
      }

      const eventId = data?.event_id;
      if (eventId) {
        router.push(`/admin/events/${eventId}`);
      } else {
        router.push("/admin/events");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/admin/events"
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
      <PageHeader
        title="Create Event"
        subtitle="Create a new event with the default 20-question set."
      />

      <Card padding="lg" className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: "var(--danger)", color: "var(--danger-foreground)" }}
            >
              {error}
            </div>
          )}

          <Input
            label="Name"
            required
            placeholder="Event name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            data-testid="create-event-name"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Description
            </label>
            <textarea
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] min-h-[80px]"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              data-testid="create-event-description"
            />
          </div>

          <Input
            label="Start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            disabled={isSubmitting}
            min={new Date().toISOString().slice(0, 16)}
            data-testid="create-event-start-at"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              City
            </label>
            <select
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isSubmitting}
              data-testid="create-event-city"
            >
              {CITIES.map((c) => (
                <option key={c.value || "empty"} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Price (SGD cents)"
            type="number"
            min={0}
            placeholder="e.g. 5000 for 50.00 SGD"
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            disabled={isSubmitting}
            data-testid="create-event-price-cents"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="payment-required"
              checked={paymentRequired}
              onChange={(e) => setPaymentRequired(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
            />
            <label htmlFor="payment-required" className="text-sm font-medium text-[var(--text)]">
              Payment required to confirm seat
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="create-event-submit"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/events")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
