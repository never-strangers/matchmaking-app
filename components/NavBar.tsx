"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useInviteSession } from "@/lib/auth/useInviteSession";
import { AvatarSquare } from "@/components/ui/AvatarSquare";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
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
    setMobileOpen(false);
    logout();
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="flex items-center justify-end w-full min-w-0">
      {/* Always hamburger menu */}
      <div className="relative flex-shrink-0" ref={mobileMenuRef}>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="nav-menu-toggle"
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
            {!isLoggedIn ? (
              <>
                <Link href="/login" data-testid="nav-login" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Login
                </Link>
                <Link href="/register" data-testid="nav-register" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link href="/profile" data-testid="nav-profile" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Profile
                </Link>
                <Link href="/events" data-testid="nav-events" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Events
                </Link>
                <Link href="/match" data-testid="nav-match" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Matches
                </Link>
                <Link href="/messages" data-testid="nav-messages" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                  Messages
                </Link>
                {isAdmin && (
                  <>
                    <Link href="/admin" data-testid="nav-admin" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                      Admin
                    </Link>
                    <Link href="/admin/users" data-testid="nav-admin-users" className={navLinkClass} style={navLinkStyle} {...navLinkHover} onClick={closeMobile}>
                      Users
                    </Link>
                  </>
                )}
                <div className="border-t my-2" style={{ borderColor: "var(--border)" }} />
                <div className="px-4 py-2 flex items-center gap-3">
                  <AvatarSquare
                    avatarPath={user?.avatarPath ?? null}
                    cacheBust={user?.avatarUpdatedAt ?? null}
                    size={40}
                    alt={user?.name ?? "Profile"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {user?.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {user?.phone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="w-full text-left py-2 px-4 text-sm transition-colors rounded-lg touch-manipulation"
                  style={{ color: "var(--text-muted)" }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
