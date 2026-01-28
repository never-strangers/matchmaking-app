"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const { user, isLoggedIn, isAdmin, logout } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const chatEnabled = Boolean(process.env.NEXT_PUBLIC_CHAT_MODE);

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
      window.location.href = "/register";
    }, 100);
  };

  return (
    <nav className="flex items-center justify-between w-full">
      <div className="flex space-x-6">
        {!isLoggedIn ? (
          <Link
            href="/register"
            data-testid="nav-register"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            Login
          </Link>
        ) : (
          <>
            <Link
              href="/events"
              data-testid="nav-events"
              className="text-sm font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              Events
            </Link>
            <Link
              href="/match"
              data-testid="nav-match"
              className="text-sm font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              Match
            </Link>
            {chatEnabled && (
              <Link
                href="/messages"
                data-testid="nav-messages"
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                Messages
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                data-testid="nav-admin"
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                Admin
              </Link>
            )}
          </>
        )}
      </div>

      {/* User Menu */}
      {isLoggedIn && user ? (
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            data-testid="user-pill"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <span>
              {user.name} · {user.phone}
            </span>
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
            <div
              className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg z-50"
              style={{
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {user.name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {user.phone}
                </p>
              </div>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="w-full text-left px-4 py-2 text-sm transition-colors rounded-b-xl"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div />
      )}
    </nav>
  );
}
