import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/Card";
import { AdminUsersClient, UserRowActions } from "./AdminUsersClient";

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

const PROFILE_COLS =
  "id, username, full_name, name, instagram, reason, email, dob, city, status, created_at, attracted_to";

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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const { status: statusParam } = await searchParams;
  const validStatuses = ["pending_verification", "approved", "rejected", "all"] as const;
  const statusFilter =
    statusParam && validStatuses.includes(statusParam as (typeof validStatuses)[number])
      ? (statusParam as (typeof validStatuses)[number])
      : "pending_verification";

  const supabase = getServiceSupabaseClient();

  let query = supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("Error loading profiles:", error);
  }

  const profiles: ProfileRow[] = (rows || []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    username: (r.username as string) ?? null,
    full_name: (r.full_name as string) ?? (r.name as string) ?? null,
    instagram: (r.instagram as string) ?? null,
    reason: (r.reason as string) ?? null,
    email: (r.email as string) ?? null,
    dob: (r.dob as string) ?? null,
    city: (r.city as string) ?? null,
    status: (r.status as string) ?? null,
    created_at: (r.created_at as string) ?? null,
    attracted_to: (r.attracted_to as string) ?? null,
  }));

  return (
    <AdminShell twoColumn>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Users
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Review, approve, or reject user profiles.
          </p>
        </div>

        <AdminUsersClient
          statusFilter={statusFilter}
          profiles={profiles}
        />

        <Card>
          {profiles.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No users found for this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Username
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Name
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Instagram
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Reason
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Email
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      DOB
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      City
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Status
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Registered
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Attracted to
                    </th>
                    <th className="py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.username, 12)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.full_name, 14)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.instagram, 12)}
                      </td>
                      <td className="py-2 pr-3 max-w-[120px]" style={{ color: "var(--text)" }}>
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
                        {formatDate(p.created_at)}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--text)" }}>
                        {truncate(p.attracted_to, 10)}
                      </td>
                      <td className="py-2">
                        <UserRowActions profileId={p.id} status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <Link
              href="/admin"
              className="text-sm hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              ← Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
