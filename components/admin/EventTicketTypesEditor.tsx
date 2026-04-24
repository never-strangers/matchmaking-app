"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type TicketType = {
  id: string;
  event_id: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  cap: number;
  sold: number;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  eventId: string;
  initialTypes: TicketType[];
  onUpdate: () => void;
};

export function EventTicketTypesEditor({ eventId, initialTypes, onUpdate }: Props) {
  const [types, setTypes] = useState<TicketType[]>(initialTypes);
  useEffect(() => {
    setTypes(initialTypes);
  }, [initialTypes]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPriceCents, setNewPriceCents] = useState("");
  const [newCap, setNewCap] = useState("");

  const applyTemplate = async () => {
    setLoading("template");
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/ticket-types/template`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Failed to apply template");
        return;
      }
      setTypes(Array.isArray(data) ? data : []);
      onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const addType = async () => {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) {
      setError("Code and name required");
      return;
    }
    const priceCents = parseInt(newPriceCents, 10) || 0;
    const cap = parseInt(newCap, 10) || 0;
    if (cap < 0) {
      setError("Cap must be >= 0");
      return;
    }
    setLoading("add");
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/ticket-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          name,
          price_cents: priceCents,
          cap,
          is_active: true,
          sort_order: types.length,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Failed to add");
        return;
      }
      setTypes((prev) => [...prev, data]);
      setNewCode("");
      setNewName("");
      setNewPriceCents("");
      setNewCap("");
      onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const updateType = async (tid: string, updates: Partial<TicketType>) => {
    setLoading(tid);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/ticket-types/${tid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Update failed");
        return;
      }
      const data = await res.json();
      setTypes((prev) => prev.map((t) => (t.id === tid ? { ...t, ...data } : t)));
      onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const deleteType = async (tid: string) => {
    if (!confirm("Remove this ticket type? Attendees with this type will keep their reservation but the type will be deleted.")) return;
    setLoading(tid);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/ticket-types/${tid}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Delete failed");
        return;
      }
      setTypes((prev) => prev.filter((t) => t.id !== tid));
      onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const activeCap = types.filter((t) => t.is_active).reduce((s, t) => s + t.cap, 0);
  const activeSold = types.filter((t) => t.is_active).reduce((s, t) => s + t.sold, 0);
  const activeRemaining = activeCap - activeSold;

  return (
    <Card padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Ticket types
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading !== null}
          onClick={applyTemplate}
        >
          {loading === "template" ? "Applying…" : "Apply default template (Early Bird + Regular)"}
        </Button>
      </div>
      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {types.length > 0 && (
        <div className="space-y-3 mb-3">
          {types.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="font-medium text-[var(--text)] w-24">{t.name}</span>
              <span className="text-sm text-[var(--text-muted)]">
                {(t.price_cents / 100).toFixed(2)} {t.currency.toUpperCase()} · cap {t.cap} · sold {t.sold}
              </span>
              <label className="flex items-center gap-1.5 ml-auto">
                <input
                  type="checkbox"
                  checked={t.is_active}
                  onChange={(e) => updateType(t.id, { is_active: e.target.checked })}
                  disabled={loading === t.id}
                  className="rounded border-[var(--border)] text-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-muted)]">Active</span>
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading === t.id}
                onClick={() => deleteType(t.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {types.length > 0 && (
        <div className="flex items-center gap-5 mb-5 px-3 py-2 rounded-md text-sm" style={{ background: "var(--bg-subtle, rgba(0,0,0,0.04))", color: "var(--text-muted)" }}>
          <span>Total capacity: <strong style={{ color: "var(--text)" }}>{activeCap}</strong></span>
          <span>Sold: <strong style={{ color: "var(--text)" }}>{activeSold}</strong></span>
          <span>Remaining: <strong style={{ color: activeRemaining > 0 ? "inherit" : "var(--danger, #dc2626)" }}>{activeRemaining}</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <Input
          label="Code"
          placeholder="e.g. early_bird"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          disabled={!!loading}
        />
        <Input
          label="Name"
          placeholder="Display name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={!!loading}
        />
        <Input
          label="Price (cents)"
          type="number"
          min={0}
          placeholder="5000"
          value={newPriceCents}
          onChange={(e) => setNewPriceCents(e.target.value)}
          disabled={!!loading}
        />
        <Input
          label="Cap"
          type="number"
          min={0}
          placeholder="30"
          value={newCap}
          onChange={(e) => setNewCap(e.target.value)}
          disabled={!!loading}
        />
        <div className="sm:col-span-2">
          <Button type="button" onClick={addType} disabled={!!loading || loading === "add"}>
            {loading === "add" ? "Adding…" : "Add ticket type"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
