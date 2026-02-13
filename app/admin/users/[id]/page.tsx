import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/Card";
import { AvatarSquare } from "@/components/ui/AvatarSquare";
import { UserRowActions } from "../AdminUsersClient";

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

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const { id: profileId } = await params;
  const supabase = getServiceSupabaseClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, instagram, reason, email, dob, city, status, created_at, updated_at, attracted_to, gender, phone_e164, avatar_path, avatar_updated_at, display_name, name"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) {
    notFound();
  }

  const name = (profile.full_name as string) ?? (profile.display_name as string) ?? (profile.name as string) ?? "—";

  return (
    <AdminShell twoColumn>
      <div className="space-y-6">
        <div>
          <Link
            href="/admin/users"
            className="text-sm hover:underline mb-2 inline-block"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to Users
          </Link>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            User Profile
          </h1>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0">
              <AvatarSquare
                avatarPath={(profile.avatar_path as string) ?? null}
                cacheBust={(profile.avatar_updated_at as string) ?? null}
                size={120}
                alt={name}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Username
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.username as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Name
                  </p>
                  <p style={{ color: "var(--text)" }}>{name}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Email
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.email as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Phone
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.phone_e164 as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Instagram
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.instagram as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    DOB
                  </p>
                  <p style={{ color: "var(--text)" }}>{formatDate(profile.dob as string)}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    City
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.city as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Gender
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.gender as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Attracted to
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.attracted_to as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Status
                  </p>
                  <p style={{ color: "var(--text)" }}>{(profile.status as string) ?? "—"}</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Registered
                  </p>
                  <p style={{ color: "var(--text)" }}>{formatDate(profile.created_at as string)}</p>
                </div>
              </div>
              {(profile.reason as string) && (
                <div>
                  <p className="font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Reason
                  </p>
                  <p className="text-sm" style={{ color: "var(--text)" }}>
                    {profile.reason as string}
                  </p>
                </div>
              )}
              <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <UserRowActions
                  profileId={profileId}
                  status={(profile.status as string) ?? null}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
