"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function RegisterVerificationPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <Card padding="lg" className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "var(--primary-light)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1
            className="text-3xl mb-3"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text)" }}
          >
            Account created
          </h1>
          <p className="mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
            You can now log in with your email and password.
          </p>
          <Button href="/login" size="lg" fullWidth>
            Log in
          </Button>
        </Card>
      </div>
    </div>
  );
}
