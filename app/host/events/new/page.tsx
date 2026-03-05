"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRole, getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById } from "@/lib/demo/userStore";
import { createEvent } from "@/lib/demo/eventStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { Event } from "@/types/event";

export default function HostCreateEventPage() {
  const router = useRouter();
  const [hostCity, setHostCity] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState("");
  const [capacity, setCapacity] = useState<number>(20);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (role !== "host" && role !== "admin") {
      router.push("/events");
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      router.push("/host");
      return;
    }

    const user = getUserById(userId);
    if (!user) {
      router.push("/host");
      return;
    }

    setHostCity(user.city);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hostCity) {
      alert("Unable to determine your city. Please contact support.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter an event title.");
      return;
    }

    if (!datetime) {
      alert("Please select a date and time.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse datetime and create ISO string
      const dateObj = new Date(datetime);
      if (isNaN(dateObj.getTime())) {
        alert("Invalid date/time format.");
        setIsSubmitting(false);
        return;
      }

      // Default to 10 questions from the question pool
      const defaultQuestionIds = QUESTIONS.slice(0, 10).map((q) => q.id);

      const newEvent: Omit<Event, "id" | "createdAt"> = {
        title: title.trim(),
        city: hostCity,
        datetime: dateObj.toISOString(),
        endTime: new Date(dateObj.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
        description: description.trim() || undefined,
        capacity: capacity > 0 ? capacity : undefined,
        questionnaireTemplate: {
          questionIds: defaultQuestionIds,
        },
        requiresApproval: true,
        requiresPayment,
        createdByAdminId: getCurrentUserId() || "host",
      };

      createEvent(newEvent);
      alert("Event created successfully!");
      router.push("/host");
    } catch (err: any) {
      alert(err.message || "Failed to create event");
      setIsSubmitting(false);
    }
  };

  if (!hostCity) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  // Get current date/time for min attribute
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="mb-6">
        <Link
          href="/host"
          className="text-[var(--text-muted)] hover:text-[var(--text)] text-sm mb-4 inline-block"
        >
          ← Back to Host Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Create Event
        </h1>
        <p className="text-[var(--text-muted)]">
          Creating event in <strong>{hostCity}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--border)] rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Event Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter event title"
            required
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-accent"
            data-testid="host-event-title-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter event description"
            rows={4}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-accent"
            data-testid="host-event-description-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Date & Time *
          </label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            min={minDateTime}
            required
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-accent"
            data-testid="host-event-datetime-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Capacity
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
            min="1"
            placeholder="Leave empty for unlimited"
            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-accent"
            data-testid="host-event-capacity-input"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Leave empty or set to 0 for unlimited capacity
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={requiresPayment}
              onChange={(e) => setRequiresPayment(e.target.checked)}
              className="w-4 h-4 text-red-accent border-[var(--border)] focus:ring-red-accent"
              data-testid="host-event-payment-checkbox"
            />
            <span className="text-sm font-medium text-[var(--text)]">
              Requires Payment
            </span>
          </label>
          <p className="text-xs text-[var(--text-muted)] mt-1 ml-6">
            Check this if attendees need to pay to RSVP
          </p>
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <div className="flex gap-4">
            <Link
              href="/host"
              className="px-6 py-2 border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--bg-dark)] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-red-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="host-create-event-submit"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
