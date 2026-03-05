"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function VerificationSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/events");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <Card padding="lg" className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "var(--success-light)" }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--success)" }}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h1
            className="text-4xl mb-3"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text)" }}
          >
            You&apos;re in.
          </h1>
          <p className="mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            Your account is pending admin approval. Redirecting to events…
          </p>
          <Button href="/events" size="lg" fullWidth>
            Go to events
          </Button>
        </Card>
      </div>
    </div>
  );
}
