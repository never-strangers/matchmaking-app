"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useInviteSession } from "@/lib/auth/useInviteSession";

const navLinkClass =
  "text-sm font-medium transition-colors block py-2 px-3 rounded-lg touch-manipulation";
const navLinkStyle = { color: "var(--text-muted)" };
const navLinkHover = {
  onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) =>
    (e.currentTarget.style.color = "var(--text)"),
  onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) =>
    (e.currentTarget.style.color = "var(--text-muted)"),
};

export default function NavBar() {
  const { user, isLoggedIn, isAdmin, logout } = useInviteSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const chatEnabled = Boolean(process.env.NEXT_PUBLIC_CHAT_MODE);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUserMenu(false);
    setMobileOpen(false);
    logout();
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="flex items-center justify-end gap-2 md:justify-between w-full min-w-0">
      {/* Desktop nav links */}
      <div className="hidden md:flex items-center space-x-6 flex-shrink-0">
        {!isLoggedIn ? (
          <Link
            href="/"
            data-testid="nav-register"
            className={navLinkClass}
            style={navLinkStyle}
            {...navLinkHover}
          >
            Get Invite
          </Link>
        ) : (
          <>
            <Link
              href="/events"
              data-testid="nav-events"
              className={navLinkClass}
              style={navLinkStyle}
              {...navLinkHover}
            >
              Events
            </Link>
            <Link
              href="/match"
              data-testid="nav-match"
              className={navLinkClass}
              style={navLinkStyle}
              {...navLinkHover}
            >
              Match
            </Link>
            {chatEnabled && (
              <Link
                href="/messages"
                data-testid="nav-messages"
                className={navLinkClass}
                style={navLinkStyle}
                {...navLinkHover}
              >
                Messages
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                data-testid="nav-admin"
                className={navLinkClass}
                style={navLinkStyle}
                {...navLinkHover}
              >
                Admin
              </Link>
            )}
          </>
        )}
      </div>

      {/* Mobile: hamburger */}
      <div className="md:hidden relative flex-shrink-0" ref={mobileMenuRef}>
        {!isLoggedIn ? (
          <Link
            href="/"
            data-testid="nav-register"
            className={`${navLinkClass} py-2 px-3`}
            style={navLinkStyle}
          >
            Get Invite
          </Link>
        ) : (
          <>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg touch-manipulation transition-colors -mr-2"
              style={{ color: "var(--text-muted)" }}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            {mobileOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-64 max-w-[min(320px,calc(100vw-2rem))] rounded-xl shadow-lg z-50 py-2"
                style={{
                  backgroundColor: "var(--bg-panel)",
                  border: "1px solid var(--border)",
                }}
              >
                <Link href="/events" data-testid="nav-events" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Events
                </Link>
                <Link href="/match" data-testid="nav-match" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Match
                </Link>
                {chatEnabled && (
                  <Link href="/messages" data-testid="nav-messages" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                    Messages
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" data-testid="nav-admin" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                    Admin
                  </Link>
                )}
                <div className="border-t my-2" style={{ borderColor: "var(--border)" }} />
                <div className="px-4 py-2">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                    {user?.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {user?.phone}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="w-full text-left py-2 px-4 text-sm transition-colors rounded-lg touch-manipulation"
                  style={{ color: "var(--text-muted)" }}
                >
                  Logout
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop user menu */}
      {isLoggedIn && user && (
        <div className="hidden md:block relative flex-shrink-0" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            data-testid="user-pill"
            className="flex items-center gap-2 text-sm transition-colors py-2 px-1"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <span className="truncate max-w-[180px]">
              {user.displayName} · {user.phoneE164}
            </span>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {user.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
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
      )}
    </nav>
  );
}
