import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentCanceledPage(props: Props) {
  await requireApprovedUser();
  const { id: eventId } = await props.params;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Payment canceled"
        subtitle="Your seat is not confirmed until payment is complete."
      />
      <Card padding="lg">
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          You can try again when you’re ready.
        </p>
        <Link href={`/events/${eventId}/questions`}>
          <Button size="md" data-testid="payment-try-again">
            Try again
          </Button>
        </Link>
        <div className="mt-4">
          <Link
            href="/events"
            className="text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to Events
          </Link>
        </div>
      </Card>
    </div>
  );
}
