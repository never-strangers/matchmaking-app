"use client";

import Link from "next/link";

export default function FinalCTA() {
  return (
    <section
      className="px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-32 text-center safe-area-inset-bottom"
      style={{ backgroundColor: "var(--primary)" }}
    >
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 leading-tight px-1"
          style={{ color: "var(--primary-foreground)", fontFamily: "'Cabinet Grotesk', system-ui, sans-serif" }}
        >
          Ready to meet your new soulmate?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center max-w-xs sm:max-w-none mx-auto">
          <Link
            href="/register"
            className="touch-manipulation inline-flex items-center justify-center min-h-[48px] w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
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
            className="touch-manipulation inline-flex items-center justify-center min-h-[48px] w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
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
          className="text-sm mt-5 sm:mt-6"
          style={{ color: "var(--primary-foreground)", opacity: 0.9 }}
        >
          Or login if you already have an account.
        </p>
      </div>
    </section>
  );
}
