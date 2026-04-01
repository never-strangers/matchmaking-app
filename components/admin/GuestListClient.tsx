"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { AttendeeRow } from "@/lib/admin/getAttendeesByEvent";
import { AttendeeCheckInButton } from "@/components/admin/AttendeeCheckInButton";
import { ExportEmailsControls } from "@/components/admin/ExportEmailsControls";

type Props = {
  allAttendees: AttendeeRow[];
  eventId: string;
  paymentRequired: boolean;
};

function useDebounce(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), ms);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, ms]);
  return debounced;
}

function searchKey(a: AttendeeRow): string {
  return `${a.displayName} ${a.phoneLast4}`.toLowerCase();
}

function AttendeeTable({
  rows,
  eventId,
  showAction,
}: {
  rows: AttendeeRow[];
  eventId: string;
  showAction: boolean;
}) {
  return (
    <div className="overflow-x-auto -mx-1 sm:mx-0 mb-4" style={{ minHeight: "1px" }}>
      <table className="w-full text-sm min-w-[320px]">
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Name</th>
            <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Phone</th>
            <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Payment</th>
            <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Ticket</th>
            <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Questions</th>
            <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Check-in</th>
            <th className="text-left py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr
              key={a.id}
              data-testid={`guest-row-${a.id}`}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <td className="py-2 pr-2 sm:pr-4" style={{ color: "var(--text)" }}>
                {a.displayName}
              </td>
              <td
                className="py-2 pr-2 sm:pr-4 font-mono text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {a.phoneLast4}
              </td>
              <td className="py-2 pr-2 sm:pr-4" style={{ color: "var(--text-muted)" }}>
                {a.paymentStatus === "free" || a.paymentStatus === "not_required"
                  ? "Free"
                  : a.paymentStatus}
              </td>
              <td className="py-2 pr-2 sm:pr-4" style={{ color: "var(--text-muted)" }}>
                {a.ticketStatus}
              </td>
              <td className="py-2 pr-2 sm:pr-4" style={{ color: "var(--text)" }}>
                {a.totalQuestions > 0 ? (
                  <span
                    className={
                      a.answersCount >= a.totalQuestions ? "text-green-600" : ""
                    }
                  >
                    {a.answersCount}/{a.totalQuestions}
                    {a.answersCount >= a.totalQuestions ? " ✓" : ""}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-2 sm:pr-4" style={{ color: "var(--text-muted)" }}>
                {a.checkedIn ? "✓ Checked in" : "—"}
              </td>
              <td className="py-2">
                {showAction ? (
                  <AttendeeCheckInButton
                    eventId={eventId}
                    attendeeId={a.id}
                    checkedIn={a.checkedIn}
                    testId={`guest-checkin-${a.id}`}
                  />
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Pay first</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GuestListClient({ allAttendees, eventId, paymentRequired }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const paidAttendees = useMemo(
    () =>
      paymentRequired
        ? allAttendees.filter(
            (a) =>
              a.paymentStatus === "paid" ||
              a.paymentStatus === "free" ||
              a.paymentStatus === "not_required"
          )
        : allAttendees,
    [allAttendees, paymentRequired]
  );

  const pendingAttendees = useMemo(
    () =>
      paymentRequired
        ? allAttendees.filter(
            (a) =>
              a.paymentStatus === "unpaid" ||
              a.paymentStatus === "checkout_created"
          )
        : [],
    [allAttendees, paymentRequired]
  );

  const q = debouncedQuery.trim().toLowerCase();

  const filteredPaid = useMemo(
    () => (q ? paidAttendees.filter((a) => searchKey(a).includes(q)) : paidAttendees),
    [paidAttendees, q]
  );

  const filteredPending = useMemo(
    () => (q ? pendingAttendees.filter((a) => searchKey(a).includes(q)) : pendingAttendees),
    [pendingAttendees, q]
  );

  const visibleCount = filteredPaid.length + filteredPending.length;
  const totalCount = allAttendees.length;

  if (allAttendees.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No one has joined this event yet.
      </p>
    );
  }

  return (
    <>
      {/* Export controls */}
      <ExportEmailsControls eventId={eventId} paymentRequired={paymentRequired} />

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            data-testid="guest-search-input"
            placeholder="Search guests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              ×
            </button>
          )}
        </div>
        {/* Count */}
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
          {q
            ? `Showing ${visibleCount} of ${totalCount}`
            : `${totalCount} guest${totalCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {paymentRequired ? (
        <>
          <h4
            className="text-sm font-medium mt-4 mb-2"
            style={{ color: "var(--text)" }}
          >
            Paid attendees ({filteredPaid.length}
            {q && filteredPaid.length !== paidAttendees.length
              ? ` of ${paidAttendees.length}`
              : ""}
            )
          </h4>
          {filteredPaid.length === 0 ? (
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              {q ? "No paid attendees match your search." : "No paid attendees yet."}
            </p>
          ) : (
            <AttendeeTable rows={filteredPaid} eventId={eventId} showAction />
          )}

          <h4
            className="text-sm font-medium mt-2 mb-2"
            style={{ color: "var(--text)" }}
          >
            Payment pending ({filteredPending.length}
            {q && filteredPending.length !== pendingAttendees.length
              ? ` of ${pendingAttendees.length}`
              : ""}
            )
          </h4>
          {filteredPending.length === 0 ? (
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              {q ? "No pending attendees match your search." : "No one in payment pending."}
            </p>
          ) : (
            <AttendeeTable rows={filteredPending} eventId={eventId} showAction={false} />
          )}
        </>
      ) : (
        filteredPaid.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No guests match your search.
          </p>
        ) : (
          <AttendeeTable rows={filteredPaid} eventId={eventId} showAction />
        )
      )}
    </>
  );
}
