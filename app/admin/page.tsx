import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/events");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/events"
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Control events and matching."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link href="/admin/users">
          <Card padding="lg" className="hover:shadow-md transition-shadow h-full">
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
              Users
            </h3>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              Review, approve, or reject pending user profiles.
            </p>
            <Button size="sm" variant="secondary">
              Manage Users →
            </Button>
          </Card>
        </Link>
        <Link href="/admin/events">
          <Card padding="lg" className="hover:shadow-md transition-shadow h-full">
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
              Events
            </h3>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              View and manage all events, attendees, and run matching.
            </p>
            <Button size="sm" variant="secondary">
              Go to Events →
            </Button>
          </Card>
        </Link>
        <Link href="/admin/matches">
          <Card padding="lg" className="hover:shadow-md transition-shadow h-full">
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
              Matches
            </h3>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              View match results by event.
            </p>
            <Button size="sm" variant="secondary">
              Go to Matches →
            </Button>
          </Card>
        </Link>
        <Link href="/admin/invite">
          <Card padding="lg" className="hover:shadow-md transition-shadow h-full">
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
              Invite Links
            </h3>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              Generate invite tokens and download QR codes.
            </p>
            <Button size="sm" variant="secondary">
              Manage Invites →
            </Button>
          </Card>
        </Link>
      </div>
    </div>
  );
}
