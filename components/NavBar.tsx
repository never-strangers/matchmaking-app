"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUserMenu(false);
    // Clear session first
    logout();
    // Force a full page reload to ensure all React state is cleared
    // This is the most reliable way to prevent redirect loops
    setTimeout(() => {
      window.location.href = "/login";
    }, 100);
  };

  return (
    <nav className="flex items-center justify-between w-full">
      <div className="flex space-x-6">
        {isLoggedIn && (
          <>
            <Link
              href="/events"
              className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
            >
              Events
            </Link>
            <Link
              href="/match"
              className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
            >
              Match
            </Link>
            <Link
              href="/messages"
              className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
            >
              Messages
            </Link>
            <Link
              href="/admin?demo_admin=1"
              className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
            >
              Admin
            </Link>
          </>
        )}
      </div>

      {/* User Menu */}
      {isLoggedIn && user ? (
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 text-sm text-gray-medium hover:text-gray-dark transition-colors"
          >
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="hidden sm:inline">{user.name}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-beige-frame rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 border-b border-beige-frame">
                <p className="text-sm font-medium text-gray-dark">{user.name}</p>
                <p className="text-xs text-gray-medium truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-medium hover:bg-beige-frame transition-colors"
              >
                Switch User / Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
        >
          Login
        </Link>
      )}
    </nav>
  );
}
