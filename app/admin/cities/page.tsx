"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import type { CityOption } from "@/lib/constants/cities";

type CityRow = CityOption & { sort_order: number };

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add city form state
  const [addValue, setAddValue] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addStatus, setAddStatus] = useState<"live" | "coming_soon">("coming_soon");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchCities = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cities");
    const data = await res.json();
    const all: CityRow[] = [
      ...(data.live ?? []).map((c: CityOption, i: number) => ({ ...c, sort_order: i })),
      ...(data.comingSoon ?? []).map((c: CityOption, i: number) => ({
        ...c,
        sort_order: (data.live?.length ?? 0) + i,
      })),
    ];
    setCities(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const toggle = async (city: CityRow) => {
    setToggling(city.value);
    setError(null);
    const newStatus = city.status === "live" ? "coming_soon" : "live";
    const res = await fetch(`/api/admin/cities/${city.value}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setError(`Failed to update ${city.label}`);
    } else {
      await fetchCities();
    }
    setToggling(null);
  };


  const deleteCity = async (city: CityRow) => {
    if (!confirm(`Delete "${city.label}"? This cannot be undone.`)) return;
    setDeleting(city.value);
    setError(null);
    const res = await fetch(`/api/admin/cities/${city.value}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`Failed to delete ${city.label}`);
    } else {
      await fetchCities();
    }
    setDeleting(null);
  };
  const addCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: addValue.trim(), label: addLabel.trim(), status: addStatus }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAddError(body.error ?? "Failed to add city");
    } else {
      setAddValue("");
      setAddLabel("");
      setAddStatus("coming_soon");
      await fetchCities();
    }
    setAdding(false);
  };

  const live = cities.filter((c) => c.status === "live");
  const comingSoon = cities.filter((c) => c.status === "coming_soon");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Admin Dashboard
        </Link>
      </div>
      <PageHeader
        title="Cities"
        subtitle="Toggle cities between Live and Coming Soon. Changes apply immediately — no redeploy needed."
      />

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      )}

      {loading ? (
        <p className="mt-8 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Live now ({live.length})
            </h2>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {live.map((city) => (
                <CityRowItem key={city.value} city={city} toggling={toggling} deleting={deleting} onToggle={toggle} onDelete={deleteCity} />
              ))}
              {live.length === 0 && (
                <p className="py-3 text-sm" style={{ color: "var(--text-muted)" }}>No live cities.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Coming soon ({comingSoon.length})
            </h2>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {comingSoon.map((city) => (
                <CityRowItem key={city.value} city={city} toggling={toggling} deleting={deleting} onToggle={toggle} onDelete={deleteCity} />
              ))}
              {comingSoon.length === 0 && (
                <p className="py-3 text-sm" style={{ color: "var(--text-muted)" }}>No coming-soon cities.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Add city
            </h2>
            <form onSubmit={addCity} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Code (e.g. sby)
                  </label>
                  <input
                    type="text"
                    placeholder="sby"
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value.toLowerCase())}
                    required
                    pattern="[a-z0-9_-]+"
                    className="w-full text-sm px-3 py-2 rounded-md border"
                    style={{ borderColor: "var(--border)", background: "var(--bg-input, var(--bg))", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Label (e.g. Surabaya)
                  </label>
                  <input
                    type="text"
                    placeholder="Surabaya"
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    required
                    className="w-full text-sm px-3 py-2 rounded-md border"
                    style={{ borderColor: "var(--border)", background: "var(--bg-input, var(--bg))", color: "var(--text)" }}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="addStatus"
                    value="coming_soon"
                    checked={addStatus === "coming_soon"}
                    onChange={() => setAddStatus("coming_soon")}
                  />
                  Coming soon
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="addStatus"
                    value="live"
                    checked={addStatus === "live"}
                    onChange={() => setAddStatus("live")}
                  />
                  Live
                </label>
              </div>
              {addError && (
                <p className="text-sm" style={{ color: "var(--danger)" }}>{addError}</p>
              )}
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? "Adding…" : "Add city"}
              </Button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function CityRowItem({
  city,
  toggling,
  deleting,
  onToggle,
  onDelete,
}: {
  city: CityRow;
  toggling: string | null;
  deleting: string | null;
  onToggle: (city: CityRow) => void;
  onDelete: (city: CityRow) => void;
}) {
  const isLive = city.status === "live";
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex items-center gap-3">
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: isLive ? "var(--success, #16a34a)" : "var(--text-subtle, #9ca3af)" }}
        />
        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
          {city.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{
          backgroundColor: isLive ? "rgba(22,163,74,0.1)" : "var(--bg-subtle, rgba(0,0,0,0.05))",
          color: isLive ? "var(--success, #16a34a)" : "var(--text-muted)",
        }}>
          {isLive ? "Live" : "Coming soon"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={toggling === city.value || deleting === city.value}
          onClick={() => onToggle(city)}
        >
          {toggling === city.value
            ? "Saving…"
            : isLive
            ? "Move to Coming soon"
            : "Move to Live"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={deleting === city.value || toggling === city.value}
          onClick={() => onDelete(city)}
          style={{ color: "var(--danger, #dc2626)" }}
        >
          {deleting === city.value ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
