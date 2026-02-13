import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = { searchParams: Promise<{ registered?: string }> };

export default async function PendingPage({ searchParams }: Props) {
  const params = await searchParams;
  const justRegistered = params.registered === "1";

  const auth = await getAuthUser();

  if (!auth && !justRegistered) {
    redirect("/login");
  }

  if (justRegistered && !auth) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Check Your Email"
          subtitle="Confirm your account to continue"
        />

        <Card padding="lg">
          <p className="mb-6" style={{ color: "var(--text-muted)" }}>
            We sent a confirmation link to your email. Click the link to verify
            your account, then log in to access your profile.
          </p>
          <Link href="/login">
            <Button size="lg" fullWidth>
              Go to Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Account Pending Verification"
        subtitle="Your account is under review"
      />

      <Card padding="lg">
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>
          Your account is pending verification. Complete your profile and we&apos;ll
          notify you once you&apos;re approved to access events and matches.
        </p>
        <Link href="/profile">
          <Button size="lg" fullWidth>
            Go to Profile
          </Button>
        </Link>
      </Card>
    </div>
  );
}
