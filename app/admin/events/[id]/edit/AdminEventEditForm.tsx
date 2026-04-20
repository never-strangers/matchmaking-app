"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EventTicketTypesEditor, type TicketType } from "@/components/admin/EventTicketTypesEditor";
import { useCityConfig } from "@/lib/cities/useCityConfig";

const CATEGORIES = [
  { value: "friends", label: "Friends" },
  { value: "dating", label: "Dating" },
] as const;

type EventData = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  city: string | null;
  category: string;
  whats_included: string | null;
  poster_path: string | null;
  price_cents: number;
  payment_required: boolean;
};

type Props = {
  eventId: string;
  event: EventData;
  ticketTypes: TicketType[];
  posterPublicUrl: string | null;
};

function formatDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminEventEditForm({ eventId, event, ticketTypes, posterPublicUrl }: Props) {
  const cityConfig = useCityConfig();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(event.title || "");
  const [description, setDescription] = useState(event.description || "");
  const [startAt, setStartAt] = useState(formatDateTimeLocal(event.start_at));
  const [endAt, setEndAt] = useState(formatDateTimeLocal(event.end_at));
  const [city, setCity] = useState(event.city || "");
  const [category, setCategory] = useState<"friends" | "dating">(
    event.category === "dating" ? "dating" : "friends"
  );
  const [whatsIncluded, setWhatsIncluded] = useState(event.whats_included || "");
  const [priceCents, setPriceCents] = useState(String(event.price_cents ?? 0));
  const [paymentRequired, setPaymentRequired] = useState(event.payment_required !== false);
  const [posterUrl, setPosterUrl] = useState<string | null>(posterPublicUrl);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [types, setTypes] = useState<TicketType[]>(ticketTypes);
  useEffect(() => {
    setTypes(ticketTypes);
  }, [ticketTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
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
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          start_at: startAt || null,
          end_at: endAt || null,
          city: city || null,
          category,
          whats_included: whatsIncluded.trim() || null,
          price_cents: priceCents === "" ? 0 : parseInt(priceCents, 10) || 0,
          payment_required: paymentRequired,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || res.statusText || "Update failed");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    setUploadingPoster(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/events/${eventId}/poster`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Upload failed");
        return;
      }
      if (data.poster_path) {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const path = data.poster_path;
        setPosterUrl(base ? `${base}/storage/v1/object/public/event-posters/${path}` : null);
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Upload failed");
    } finally {
      setUploadingPoster(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href={`/admin/events/${eventId}`}
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Event
        </Link>
      </div>
      <PageHeader title="Edit Event" subtitle="Update details and ticket types" />

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

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Poster</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt="Event poster"
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
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploadingPoster}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingPoster ? "Uploading…" : "Upload poster"}
                </Button>
                <p className="text-xs mt-1 text-[var(--text-muted)]">JPG, PNG, WebP. Max 10MB.</p>
              </div>
            </div>
          </div>

          <Input
            label="Title"
            required
            placeholder="Event name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Description</label>
            <textarea
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[80px]"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            disabled={isSubmitting}
            min={new Date().toISOString().slice(0, 16)}
          />
          <Input
            label="End (optional)"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            disabled={isSubmitting}
            min={startAt || new Date().toISOString().slice(0, 16)}
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Category</label>
            <select
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={category}
              onChange={(e) => setCategory(e.target.value as "friends" | "dating")}
              disabled={isSubmitting}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">City</label>
            <select
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select city</option>
              <optgroup label="Live now">
                {cityConfig.live.map((c) => (
                  <option key={c.value} value={c.label}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Coming soon">
                {cityConfig.comingSoon.map((c) => (
                  <option key={c.value} value={c.label}>{c.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              What&apos;s Included (one line or bullet per line)
            </label>
            <textarea
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[80px]"
              placeholder="e.g. Welcome drink&#10;Networking session"
              value={whatsIncluded}
              onChange={(e) => setWhatsIncluded(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Price (SGD cents)"
            type="number"
            min={0}
            placeholder="5000"
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="payment-required-edit"
              checked={paymentRequired}
              onChange={(e) => setPaymentRequired(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
            />
            <label htmlFor="payment-required-edit" className="text-sm font-medium text-[var(--text)]">
              Payment required to confirm seat
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
            <Link href={`/admin/events/${eventId}`}>
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <EventTicketTypesEditor
          eventId={eventId}
          initialTypes={types}
          onUpdate={() => {
            setTypes((prev) => [...prev]);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
