"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRole, getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById } from "@/lib/demo/userStore";
import { listEvents } from "@/lib/demo/eventStore";
import { getRegistrationsForEvent } from "@/lib/demo/registrationStore";
import { Event } from "@/types/event";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

export default function HostPage() {
  const router = useRouter();
  const [hostCity, setHostCity] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const role = getRole();
    if (role !== "host" && role !== "admin") {
      router.push("/events");
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      router.push("/events");
      return;
    }

    const user = getUserById(userId);
    if (!user) {
      router.push("/events");
      return;
    }

    const userCity = user.city;
    setHostCity(userCity);

    const allEvents = listEvents();
    const cityEvents =
      role === "admin"
        ? allEvents
        : allEvents.filter((e) => e.city === userCity);
    setEvents(cityEvents);
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Host Dashboard"
        subtitle="Manage your events and check-in attendees"
        action={
          <Link href="/host/events/new">
            <Button size="md" data-testid="host-create-event">
              Create Event
            </Button>
          </Link>
        }
      />

      {hostCity && (
        <Card className="mb-6" style={{ backgroundColor: "var(--info-light)", borderColor: "var(--info)" }}>
          <p className="text-sm" style={{ color: "var(--info)" }}>
            Managing events in <strong>{hostCity}</strong>
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card padding="lg">
            <p style={{ color: "var(--text-muted)" }}>
              No events in your city. Create your first event to get started.
            </p>
          </Card>
        ) : (
          events.map((event) => {
            const registrations = getRegistrationsForEvent(event.id);
            const confirmedRegs = registrations.filter(
              (r) => r.rsvpStatus === "confirmed"
            );

            return (
              <Card
                key={event.id}
                variant="elevated"
                padding="md"
                data-testid={`host-event-row-${event.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>
                      {event.title}
                    </h2>
                    <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                      {event.city} • {formatDate(event.datetime)}
                    </p>
                    <div className="mt-2">
                      <Badge variant="info">
                        {confirmedRegs.length} confirmed attendees
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/host/events/${event.id}`}>
                    <Button variant="secondary" size="md">
                      Manage
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
