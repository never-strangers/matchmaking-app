"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type StatusFilter = "pending_verification" | "approved" | "rejected" | "all";

type ProfileRow = {
  id: string;
  username: string | null;
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
  profiles,
}: {
  statusFilter: StatusFilter;
  profiles: ProfileRow[];
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/admin/users?status=${tab.value}`}
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
  );
}

