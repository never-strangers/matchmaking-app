import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

type EmailLogRow = {
  id: string;
  idempotency_key: string;
  template: string;
  to_email: string;
  subject: string;
  status: string;
  provider_id: string | null;
  error_message: string | null;
  created_at: string;
};

export default async function AdminEmailsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/events");

  const supabase = getServiceSupabaseClient();
  const { data: rows, error } = await supabase
    .from("email_log")
    .select(
      "id, idempotency_key, template, to_email, subject, status, provider_id, error_message, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const emails: EmailLogRow[] = (rows ?? []) as EmailLogRow[];

  const statusColor = (s: string) => {
    if (s === "sent") return "#2a7a4b";
    if (s === "mock") return "#888";
    if (s === "error") return "#c0392b";
    return "#999";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
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
        title="Email Log"
        subtitle={`${emails.length} most recent transactional emails`}
      />

      {error && (
        <Card padding="md" className="mb-4">
          <p className="text-sm" style={{ color: "#c0392b" }}>
            Error loading email log: {error.message}
          </p>
        </Card>
      )}

      {emails.length === 0 && !error && (
        <Card padding="lg">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No emails sent yet.
          </p>
        </Card>
      )}

      {emails.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #eee)" }}>
                <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>
                  Time
                </th>
                <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>
                  To
                </th>
                <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>
                  Template
                </th>
                <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>
                  Subject
                </th>
                <th className="text-left py-2 font-semibold" style={{ color: "var(--text-muted)" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {emails.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: "1px solid var(--border, #eee)" }}
                >
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {new Date(row.created_at).toLocaleString("en-GB", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--text)" }}>
                    {row.to_email}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--text-muted)" }}>
                    <code className="text-xs">{row.template}</code>
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--text)" }}>
                    {row.subject}
                  </td>
                  <td className="py-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: statusColor(row.status) }}
                    >
                      {row.status.toUpperCase()}
                    </span>
                    {row.error_message && (
                      <span
                        className="block text-xs mt-0.5"
                        style={{ color: "#c0392b" }}
                        title={row.error_message}
                      >
                        {row.error_message.slice(0, 60)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
