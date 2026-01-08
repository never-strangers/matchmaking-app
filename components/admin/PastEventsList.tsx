import Link from "next/link";
import { PastEvent } from "@/lib/admin/mock";
import Card from "./Card";

interface PastEventsListProps {
  events: PastEvent[];
}

export default function PastEventsList({ events }: PastEventsListProps) {
  return (
    <Card>
      <h2 className="text-xs text-gray-medium uppercase tracking-wider mb-4">
        Past Events
      </h2>
      <div className="space-y-3" data-testid="admin-events-table">
        {events.map((event, index) => (
          <div
            key={index}
            data-testid={`admin-past-event-${index}`}
            className="flex justify-between items-center py-3 border-b border-beige-frame last:border-0"
          >
            <div className="flex items-center gap-4 flex-1">
              <span className="text-xs text-gray-medium font-mono">
                {event.date}
              </span>
              <span className="text-sm text-gray-dark">{event.title}</span>
            </div>
            <Link
              href="/admin/matches"
              data-testid={`admin-past-event-manage-${index}`}
              className="text-xs text-gray-medium hover:text-gray-dark transition-colors whitespace-nowrap ml-4"
            >
              Manage Matches →
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}

