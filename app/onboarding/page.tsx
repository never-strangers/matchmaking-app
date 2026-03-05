"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/events");
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="text-center">
        <h2
          className="text-2xl mb-3"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text)" }}
        >
          Redirecting…
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          Questionnaires are now per-event and collected after RSVP and payment.
        </p>
      </Card>
    </div>
  );
}
