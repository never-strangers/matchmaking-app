"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;
  const [status, setStatus] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  const poll = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.payment_status ?? null);
      if (data.payment_status === "paid") {
        setPolling(false);
        router.replace("/events");
      }
    } catch {
      // ignore
    }
  }, [eventId, router]);

  useEffect(() => {
    if (!eventId) return;
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [eventId, poll]);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Payment received"
        subtitle="Confirming your seat…"
      />
      <Card padding="lg">
        {polling ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your payment was successful. You will be redirected to events shortly.
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--text)" }}>
            Seat confirmed. Taking you to events…
          </p>
        )}
        <div className="mt-4">
          <Link
            href="/events"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--primary)" }}
          >
            → Back to Events
          </Link>
        </div>
      </Card>
    </div>
  );
}
