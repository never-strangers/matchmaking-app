import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/Card";
import { AvatarSquare } from "@/components/ui/AvatarSquare";
import { AdminUsersClient, UserRowActions } from "./AdminUsersClient";

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
  gender: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

const PROFILE_COLS =
  "id, full_name, name, instagram, reason, email, dob, city, status, created_at, attracted_to, gender, avatar_path, avatar_updated_at";

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

type SearchParams = {
  status?: string;
  gender?: string;
  attraction?: string;
  city?: string;
  sort?: string;
  order?: string;
};

const VALID_STATUSES = ["pending_verification", "approved", "rejected", "all"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const SORT_FIELDS = ["name", "email", "dob", "created_at"] as const;
type SortField = (typeof SORT_FIELDS)[number];
const DEFAULT_SORT: SortField = "created_at";
const SORT_COLUMN: Record<SortField, string> = {
  name: "full_name",
  email: "email",
  dob: "dob",
  created_at: "created_at",
};

function buildUsersQuery(params: {
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getAuthUser();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const params = await searchParams;
  const statusFilter: StatusFilter =
    params.status && VALID_STATUSES.includes(params.status as StatusFilter)
      ? (params.status as StatusFilter)
      : "pending_verification";
  const genderFilter = params.gender?.trim() || null;
  const attractionFilter = params.attraction?.trim() || null;
  const cityFilter = params.city?.trim() || null;
  const sortField: SortField =
    params.sort && SORT_FIELDS.includes(params.sort as SortField)
      ? (params.sort as SortField)
      : DEFAULT_SORT;
  const sortOrder = params.order === "asc" ? "asc" : "desc";
  const orderCol = SORT_COLUMN[sortField];

  const supabase = getServiceSupabaseClient();

  let query = supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .order(orderCol, { ascending: sortOrder === "asc", nullsFirst: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (genderFilter) {
    query = query.eq("gender", genderFilter);
  }
  if (cityFilter) {
    query = query.eq("city", cityFilter);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("Error loading profiles:", error);
  }

  let mapped: ProfileRow[] = (rows || []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    full_name: (r.full_name as string) ?? (r.name as string) ?? null,
    instagram: (r.instagram as string) ?? null,
    reason: (r.reason as string) ?? null,
    email: (r.email as string) ?? null,
    dob: (r.dob as string) ?? null,
    city: (r.city as string) ?? null,
    status: (r.status as string) ?? null,
    created_at: (r.created_at as string) ?? null,
    attracted_to: (r.attracted_to as string) ?? null,
    gender: (r.gender as string) ?? null,
    avatar_path: (r.avatar_path as string) ?? null,
    avatar_updated_at: (r.avatar_updated_at as string) ?? null,
  }));

  // Attraction filter: match whole comma-separated values (so "men" does not match "women")
  if (attractionFilter) {
    mapped = mapped.filter((p) => {
      const raw = (p.attracted_to ?? "").trim();
      if (!raw) return false;
      const values = raw.split(/[,;]/).map((s) => s.trim().toLowerCase());
      return values.includes(attractionFilter.toLowerCase());
    });
  }

  const profiles = mapped;

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
          genderFilter={genderFilter}
          attractionFilter={attractionFilter}
          cityFilter={cityFilter}
          sortField={sortField}
          sortOrder={sortOrder}
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
                    <th className="py-2 pr-3 text-left font-medium w-16" style={{ color: "var(--text-muted)" }}>
                      Photo
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      <Link
                        href={buildUsersQuery({
                          status: statusFilter,
                          gender: genderFilter,
                          attraction: attractionFilter,
                          city: cityFilter,
                          sort: "name",
                          order: sortField === "name" && sortOrder === "asc" ? "desc" : "asc",
                        })}
                        className="inline-flex items-center gap-1 hover:underline"
                        data-testid="admin-users-sort-name"
                      >
                        Name {sortField === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                      </Link>
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Instagram
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      Reason
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      <Link
                        href={buildUsersQuery({
                          status: statusFilter,
                          gender: genderFilter,
                          attraction: attractionFilter,
                          city: cityFilter,
                          sort: "email",
                          order: sortField === "email" && sortOrder === "asc" ? "desc" : "asc",
                        })}
                        className="inline-flex items-center gap-1 hover:underline"
                        data-testid="admin-users-sort-email"
                      >
                        Email {sortField === "email" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                      </Link>
                    </th>
                    <th className="py-2 pr-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                      <Link
                        href={buildUsersQuery({
                          status: statusFilter,
                          gender: genderFilter,
                          attraction: attractionFilter,
                          city: cityFilter,
                          sort: "dob",
                          order: sortField === "dob" && sortOrder === "asc" ? "desc" : "asc",
                        })}
                        className="inline-flex items-center gap-1 hover:underline"
                        data-testid="admin-users-sort-dob"
                      >
                        DOB {sortField === "dob" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                      </Link>
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
                      <td className="py-2 pr-3 align-middle">
                        <AvatarSquare
                          avatarPath={p.avatar_path}
                          cacheBust={p.avatar_updated_at}
                          size={40}
                          alt={p.full_name ?? "Profile"}
                        />
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
