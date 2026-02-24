"use client";

import Link from "next/link";

export default function RegisterVerificationPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-xl border border-[var(--border)] p-8 text-center bg-[var(--bg-panel)]">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Account created
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          You can now log in with your email and password.
        </p>
        <Link
          href="/login"
          className="inline-block bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
