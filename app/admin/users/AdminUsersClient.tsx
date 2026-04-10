"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CITIES, ATTRACTED_TO_OPTIONS } from "@/lib/constants/profileOptions";
import Card from "@/components/admin/Card";
import { AvatarSquare } from "@/components/ui/AvatarSquare";

type StatusFilter = "pending_verification" | "approved" | "rejected" | "all";

type ProfileRow = {
  id: string;
  full_name: string | null;
  name: string | null;
  username: string | null;
  wp_user_login: string | null;
  instagram: string | null;
  reason: string | null;
  email: string | null;
  dob: string | null;
  city: string | null;
  status: string | null;
  created_at: string | null;
  wp_registered_at: string | null;
  attracted_to: string | null;
  gender: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

type ApiResponse = {
  items: ProfileRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_verification", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const GENDER_OPTIONS = [
  { value: "", label: "All genders" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const SORT_OPTIONS = [
  { value: "registered_desc", label: "Registered (newest)" },
  { value: "registered_asc", label: "Registered (oldest)" },
  { value: "status", label: "Status" },
  { value: "city", label: "City" },
];

function truncate(s: string | null | undefined, len: number): string {
  if (!s) return "—";
  return s.length > len ? s.slice(0, len) + "…" : s;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function displayUsername(p: ProfileRow): string {
  return p.username || p.wp_user_login || p.full_name || p.name || "—";
}

export function UserRowActions({
  profileId,
  status,
  onStatusChange,
}: {
  profileId: string;
  status: string | null;
  onStatusChange?: () => void;
}) {
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
      onStatusChange?.();
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

function buildQueryParams(params: {
  q: string;
  status: string;
  city: string;
  gender: string;
  attracted_to: string;
  sort: string;
  page: number;
  page_size: number;
}): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.city && params.city !== "all") sp.set("city", params.city);
  if (params.gender && params.gender !== "all") sp.set("gender", params.gender);
  if (params.attracted_to && params.attracted_to !== "all") sp.set("attracted_to", params.attracted_to);
  if (params.sort) sp.set("sort", params.sort);
  sp.set("page", String(params.page));
  sp.set("page_size", String(params.page_size));
  return sp.toString();
}

const DEFAULT_PARAMS = {
  q: "",
  status: "pending_verification" as StatusFilter,
  city: "all",
  gender: "all",
  attracted_to: "all",
  sort: "registered_desc",
  page: 1,
  page_size: 25,
};

export default function AdminUsersClient() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQueryParams({
        ...params,
        page_size: DEFAULT_PARAMS.page_size,
      });
      const res = await fetch(`/api/admin/users?${query}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Request failed (${res.status})`);
        setData(null);
        return;
      }
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError("Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((prev) => ({ ...prev, q: searchInput.trim(), page: 1 }));
  };

  const handleReset = () => {
    setSearchInput("");
    setParams(DEFAULT_PARAMS);
  };

  const hasActiveFilters =
    params.q ||
    params.status !== DEFAULT_PARAMS.status ||
    params.city !== "all" ||
    params.gender !== "all" ||
    params.attracted_to !== "all" ||
    params.sort !== DEFAULT_PARAMS.sort ||
    params.page !== 1;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const page = data?.page ?? 1;

  return (
    <div className="space-y-4">
      {/* Top bar: search + filters */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, username, Instagram, phone…"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-md border text-sm bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-search-input"
            />
            <Button type="submit" variant="primary" data-testid="admin-users-search-button">
              Search Users
            </Button>
            <select
              value={params.status}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  status: e.target.value as StatusFilter,
                  page: 1,
                }))
              }
              className="px-2 py-2 rounded-md border text-sm bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-filter-status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={params.city}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, city: e.target.value, page: 1 }))
              }
              className="px-2 py-2 rounded-md border text-sm bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-filter-city"
            >
              <option value="all">All cities</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={params.gender}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, gender: e.target.value, page: 1 }))
              }
              className="px-2 py-2 rounded-md border text-sm bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-filter-gender"
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value || "all"}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={params.attracted_to}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, attracted_to: e.target.value, page: 1 }))
              }
              className="px-2 py-2 rounded-md border text-sm bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-filter-attraction"
            >
              <option value="all">All</option>
              {ATTRACTED_TO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={params.sort}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, sort: e.target.value, page: 1 }))
              }
              className="px-2 py-2 rounded-md border text-sm bg-[var(--bg-panel)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-users-sort"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="text-sm hover:underline"
                style={{ color: "var(--text-muted)" }}
                data-testid="admin-users-reset-filters"
              >
                Reset filters
              </button>
            )}
          </div>
        </form>
      </Card>

      {/* Results table */}
      <Card>
        {error && (
          <p className="text-sm mb-4" style={{ color: "var(--destructive)" }}>
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No users found for this filter.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <th
                      className="py-2 pr-3 text-left font-medium w-16"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Photo
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Username
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Instagram
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Reason
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Email
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      DOB
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      City
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Status
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Gender
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Registered
                    </th>
                    <th
                      className="py-2 pr-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Attracted to
                    </th>
                    <th
                      className="py-2 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2 pr-3 align-middle">
                        <AvatarSquare
                          avatarPath={p.avatar_path}
                          cacheBust={p.avatar_updated_at}
                          size={40}
                          alt={displayUsername(p)}
                        />
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(displayUsername(p), 14)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.instagram, 12)}
                      </td>
                      <td
                        className="py-2 pr-3 max-w-[120px]"
                        style={{ color: "var(--text)" }}
                      >
                        {truncate(p.reason, 20)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.email, 16)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {p.dob ? formatDate(p.dob) : "—"}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {p.city ?? "—"}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {p.status ?? "—"}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {p.gender ?? "—"}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {formatDate(p.wp_registered_at || p.created_at)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.attracted_to, 10)}
                      </td>
                      <td className="py-2">
                        <UserRowActions
                          profileId={p.id}
                          status={p.status}
                          onStatusChange={fetchUsers}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-2"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Page {page} of {totalPages} ({total} users)
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
                    data-testid="admin-users-prev"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
                    data-testid="admin-users-next"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            <div
              className="mt-4 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Link
                href="/admin"
                className="text-sm hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                ← Dashboard
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}


export function ResetPasswordButton({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!confirm("Send a password-reset email to this user?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${profileId}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send reset email");
        return;
      }
      setSent(true);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <span className="text-sm font-medium" style={{ color: "var(--success, #2a7a4b)" }}>
        ✓ Reset email sent
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="secondary" disabled={loading} onClick={handleReset}>
        {loading ? "Sending…" : "Reset Password"}
      </Button>
      {error && (
        <span className="text-xs" style={{ color: "var(--danger, #c0392b)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
