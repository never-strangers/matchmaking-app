"use client";

import Link from "next/link";

export default function FinalCTA() {
  return (
    <section
      className="px-6 py-20 lg:px-20 lg:py-32 text-center"
      style={{ backgroundColor: "var(--primary)" }}
    >
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-4xl lg:text-5xl font-bold mb-8"
          style={{ color: "var(--primary-foreground)", fontFamily: "'Cabinet Grotesk', system-ui, sans-serif" }}
        >
          Ready to meet your new connection?
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--primary-foreground)",
              color: "var(--primary)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            Get Your Invite
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/10"
            style={{
              backgroundColor: "transparent",
              border: "2px solid var(--primary-foreground)",
              color: "var(--primary-foreground)",
            }}
          >
            Login
          </Link>
        </div>
        <p
          className="text-sm mt-6"
          style={{ color: "var(--primary-foreground)", opacity: 0.9 }}
        >
          Or login if you already have an account.
        </p>
      </div>
    </section>
  );
}
