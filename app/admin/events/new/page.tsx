"use client";

import { useState, useRef } from "react";
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

const CATEGORIES = [
  { value: "friends", label: "Friends" },
  { value: "dating", label: "Dating" },
] as const;

export default function AdminCreateEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<"friends" | "dating">("friends");
  const [whatsIncluded, setWhatsIncluded] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Use JPG, PNG, or WebP.");
      return;
    }

    setError(null);
    setPosterFile(file);
    try {
      const url = URL.createObjectURL(file);
      setPosterPreview(url);
    } catch {
      setPosterPreview(null);
    }
  };

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
          end_at: endAt || undefined,
          city: city || undefined,
          category,
          whats_included: whatsIncluded.trim() || undefined,
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
      if (eventId && posterFile) {
        try {
          const formData = new FormData();
          formData.append("file", posterFile);
          const uploadRes = await fetch(`/api/admin/events/${eventId}/poster`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
          if (!uploadRes.ok) {
            const uploadData = await uploadRes.json().catch(() => ({}));
            console.error("Poster upload during create failed:", uploadData);
          }
        } catch (uploadErr) {
          console.error("Error uploading poster during create:", uploadErr);
        }
      }
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

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Poster (optional)
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {posterPreview ? (
                <img
                  src={posterPreview}
                  alt="Event poster preview"
                  className="w-32 h-32 object-cover rounded-xl border border-[var(--border)]"
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-xl border border-dashed flex items-center justify-center text-sm text-[var(--text-muted)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  No image
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePosterChange}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  Choose poster
                </Button>
                <p className="text-xs mt-1 text-[var(--text-muted)]">JPG, PNG, WebP. Max 10MB.</p>
              </div>
            </div>
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

          <Input
            label="End (optional)"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            disabled={isSubmitting}
            min={startAt || new Date().toISOString().slice(0, 16)}
            data-testid="create-event-end-at"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Category
            </label>
            <select
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              value={category}
              onChange={(e) => setCategory(e.target.value as "friends" | "dating")}
              disabled={isSubmitting}
              data-testid="create-event-category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              What&apos;s Included (optional, one line or bullet per line)
            </label>
            <textarea
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] min-h-[80px]"
              placeholder="e.g. Welcome drink&#10;Networking session&#10;Light bites"
              value={whatsIncluded}
              onChange={(e) => setWhatsIncluded(e.target.value)}
              disabled={isSubmitting}
              data-testid="create-event-whats-included"
            />
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
