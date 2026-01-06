"use client";

import Link from "next/link";

export default function NavBar() {
  const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";

  return (
    <nav className="flex space-x-6">
      <Link
        href="/onboarding"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Onboarding
      </Link>
      <Link
        href="/match"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Match
      </Link>
      <Link
        href="/events"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Events
      </Link>
      {isChatEnabled && (
        <Link
          href="/messages"
          className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
        >
          Messages
        </Link>
      )}
      <Link
        href="/admin"
        className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
      >
        Admin
      </Link>
    </nav>
  );
}

