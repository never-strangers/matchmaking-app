import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import AdminShell from "@/components/admin/AdminShell";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getAuthUser();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  return (
    <AdminShell twoColumn>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Users
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Review, approve, or reject user profiles. Search and filter below.
          </p>
        </div>

        <AdminUsersClient />
      </div>
    </AdminShell>
  );
}
