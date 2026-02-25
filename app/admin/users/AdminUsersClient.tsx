"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CITIES, ATTRACTED_TO_OPTIONS } from "@/lib/constants/profileOptions";

type StatusFilter = "pending_verification" | "approved" | "rejected" | "all";

type ProfileRow = {
  id: string;
  full_name: string | null;
  instagram: string | null;
  reason: string | null;
  email: string | null;
  dob: string | null;
  city: string | null;
  status: string | null;
  created_at: string | null;
  attracted_to: string | null;
};

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending_verification", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const GENDER_OPTIONS = [
  { value: "", label: "All genders" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

function buildUsersUrl(params: {
  status: string;
  gender: string | null;
  attraction: string | null;
  city: string | null;
  sort?: string;
  order?: string;
}): string {
  const search = new URLSearchParams();
  search.set("status", params.status);
  if (params.gender) search.set("gender", params.gender);
  if (params.attraction) search.set("attraction", params.attraction);
  if (params.city) search.set("city", params.city);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  return `/admin/users?${search.toString()}`;
}

export function UserRowActions({ profileId, status }: { profileId: string; status: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatus = async (newStatus: string) => {
    setLoading(newStatus);
    try {
      const res = await fetch("/api/admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profile_id: profileId, new_status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to update status");
        return;
      }
      router.refresh();
    } catch (e) {
      alert("Request failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {status !== "approved" && (
        <Button
          size="sm"
          variant="primary"
          disabled={!!loading}
          onClick={() => handleStatus("approved")}
          data-testid={`admin-approve-${profileId}`}
        >
          {loading === "approved" ? "…" : "Approve"}
        </Button>
      )}
      {status !== "rejected" && (
        <Button
          size="sm"
          variant="danger"
          disabled={!!loading}
          onClick={() => handleStatus("rejected")}
          data-testid={`admin-reject-${profileId}`}
        >
          {loading === "rejected" ? "…" : "Reject"}
        </Button>
      )}
      {status !== "pending_verification" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={!!loading}
          onClick={() => handleStatus("pending_verification")}
          data-testid={`admin-pending-${profileId}`}
        >
          {loading === "pending_verification" ? "…" : "Pending"}
        </Button>
      )}
      <Link href={`/admin/users/${profileId}`}>
        <Button size="sm" variant="ghost" data-testid={`admin-view-${profileId}`}>
          View
        </Button>
      </Link>
    </div>
  );
}

export function AdminUsersClient({
  statusFilter,
  genderFilter,
  attractionFilter,
  cityFilter,
  sortField,
  sortOrder,
  profiles,
}: {
  statusFilter: StatusFilter;
  genderFilter: string | null;
  attractionFilter: string | null;
  cityFilter: string | null;
  sortField: string;
  sortOrder: string;
  profiles: ProfileRow[];
}) {
  const router = useRouter();
  const currentParams = {
    status: statusFilter,
    gender: genderFilter,
    attraction: attractionFilter,
    city: cityFilter,
    sort: sortField,
    order: sortOrder,
  };

  const handleFilterChange = (
    key: "gender" | "attraction" | "city",
    value: string
  ) => {
    const next = {
      ...currentParams,
      [key]: value.trim() || null,
    };
    router.push(buildUsersUrl(next));
  };

  return (
    <div className="space-y-4 mb-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildUsersUrl({ ...currentParams, status: tab.value })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--bg-muted)] hover:bg-[var(--border)]"
            }`}
            style={statusFilter !== tab.value ? { color: "var(--text-muted)" } : undefined}
            data-testid={`admin-users-tab-${tab.value}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <span>Gender</span>
          <select
            value={genderFilter ?? ""}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
            className="px-2 py-1.5 rounded-md border bg-[var(--bg-panel)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-filter-gender"
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <span>Attraction</span>
          <select
            value={attractionFilter ?? ""}
            onChange={(e) => handleFilterChange("attraction", e.target.value)}
            className="px-2 py-1.5 rounded-md border bg-[var(--bg-panel)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-filter-attraction"
          >
            <option value="">All</option>
            {ATTRACTED_TO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <span>City</span>
          <select
            value={cityFilter ?? ""}
            onChange={(e) => handleFilterChange("city", e.target.value)}
            className="px-2 py-1.5 rounded-md border bg-[var(--bg-panel)]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-users-filter-city"
          >
            <option value="">All</option>
            {CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

