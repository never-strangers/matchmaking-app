"use client";

import Link from "next/link";

export default function NavBar() {
  const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";

  return (
    <nav className="flex space-x-6">
      <Link
        href="/"
        data-testid="nav-home"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Home
      </Link>
      <Link
        href="/onboarding"
        data-testid="nav-onboarding"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Onboarding
      </Link>
      <Link
        href="/match"
        data-testid="nav-match"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Match
      </Link>
      <Link
        href="/events"
        data-testid="nav-events"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Events
      </Link>
      {isChatEnabled && (
        <Link
          href="/messages"
          data-testid="nav-messages"
          className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
        >
          Messages
        </Link>
      )}
      <Link
        href="/admin"
        data-testid="nav-admin"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Admin
      </Link>
    </nav>
  );
}

