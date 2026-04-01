"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type UserResult = {
  id: string;
  full_name: string | null;
  name: string | null;
  email: string | null;
  city: string | null;
  gender: string | null;
  instagram: string | null;
};

type PaymentState = "paid" | "pending" | "free";

function displayName(u: UserResult): string {
  return u.full_name || u.name || u.email || "Unknown";
}

function useDebounce(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ms]);
  return debounced;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  backgroundColor: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  backgroundColor: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

export function AddAttendeePanel({
  eventId,
  paymentRequired,
}: {
  eventId: string;
  paymentRequired: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>(
    paymentRequired ? "paid" : "free"
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(q)}&limit=20`,
        { credentials: "include" }
      );
      const json = await res.json();
      setResults(Array.isArray(json.users) ? json.users : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  const handleSelect = (user: UserResult) => {
    setSelected(user);
    setQuery("");
    setResults([]);
    setMessage(null);
    // Reset payment state to sensible default
    setPaymentState(paymentRequired ? "paid" : "free");
  };

  const handleAdd = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendees/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profile_id: selected.id, payment_state: paymentState }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: json.error || "Failed to add attendee" });
      } else {
        const label = json.attendee?.already_existed
          ? "Payment status updated for"
          : "Added";
        setMessage({ type: "ok", text: `${label} ${displayName(selected)}` });
        setSelected(null);
        router.refresh();
      }
    } catch {
      setMessage({ type: "err", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search */}
      <div ref={containerRef} style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Search approved users by name, email, or Instagram…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setMessage(null);
          }}
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,15,20,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />

        {/* Searching indicator */}
        {searching && (
          <span
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Searching…
          </span>
        )}

        {/* Dropdown results */}
        {results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-card)",
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelect(u)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  gap: 2,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--bg-muted)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                  {displayName(u)}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {[u.email, u.city, u.gender].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!searching && query.trim() && results.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            No approved users found for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Selected user row + payment state + actions */}
      {selected && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "10px 14px",
            backgroundColor: "var(--bg-muted)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
              {displayName(selected)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {[selected.email, selected.city].filter(Boolean).join(" · ")}
            </div>
          </div>

          <select
            value={paymentState}
            onChange={(e) => setPaymentState(e.target.value as PaymentState)}
            style={selectStyle}
          >
            {paymentRequired ? (
              <>
                <option value="paid">Paid (comp / cash)</option>
                <option value="pending">Pending / Reserved</option>
              </>
            ) : (
              <option value="free">Free</option>
            )}
          </select>

          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            style={{
              padding: "8px 18px",
              backgroundColor: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
            data-testid="add-attendee-submit"
          >
            {submitting ? "Adding…" : "Add to event"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setMessage(null);
            }}
            style={{
              padding: "8px 10px",
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              cursor: "pointer",
            }}
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div
          style={{
            fontSize: 13,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor:
              message.type === "ok"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            color: message.type === "ok" ? "#16a34a" : "var(--danger)",
            border: `1px solid ${
              message.type === "ok"
                ? "rgba(34,197,94,0.3)"
                : "rgba(239,68,68,0.3)"
            }`,
          }}
        >
          {message.type === "ok" ? "✓ " : "⚠ "}
          {message.text}
        </div>
      )}
    </div>
  );
}
