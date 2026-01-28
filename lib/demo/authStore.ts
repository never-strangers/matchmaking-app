"use client";

import { Role } from "@/types/roles";

/**
 * Demo auth/session store (localStorage-backed).
 *
 * Requirements:
 * - Persist session under `ns_session`
 * - Use phone as unique identifier (userId = "usr_" + normalizedPhoneDigits)
 * - Provide simple API: setSession/getSession/clearSession/isLoggedIn
 *
 * Backwards compatibility:
 * - Several parts of the demo flow still read `ns_current_user_id` / `ns_role`.
 *   We keep those keys in sync until the rest of the codebase is fully migrated.
 */

const SESSION_KEY = "ns_session";
const ROLE_KEY = "ns_role";
const CURRENT_USER_ID_KEY = "ns_current_user_id";

/**
 * Admin allowlist (Singapore format: +65xxxxxxxx)
 * Default: +6511111111
 *
 * Production-ready path:
 * - set NEXT_PUBLIC_ADMIN_PHONES to a comma-separated list (e.g. "+6511111111,+6599999999")
 * - keep roles as standard Role = guest/user/host/admin
 */
export const ADMIN_PHONES_RAW =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_PHONES) ||
  "+6511111111";

export function isAdminPhone(phone: string): boolean {
  const allow = ADMIN_PHONES_RAW.split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return allow.includes(phone);
}

export type DemoSession = {
  userId: string;
  phone: string; // +65xxxxxxxx
  name: string;
  role: Role;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Get current role (defaults to "guest" for demo)
 */
export function getRole(): Role {
  if (typeof window === "undefined") return "guest";
  const session = getSession();
  if (session?.role) return session.role;
  const stored = localStorage.getItem(ROLE_KEY);
  return (stored as Role) || "guest";
}

/**
 * Set current role
 */
export function setRole(role: Role): void {
  if (typeof window === "undefined") return;
  const session = getSession();
  if (session) {
    setSession({ ...session, role });
    return;
  }
  localStorage.setItem(ROLE_KEY, role);
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const session = getSession();
  if (session?.userId) return session.userId;
  return localStorage.getItem(CURRENT_USER_ID_KEY);
}

/**
 * Set current user ID
 */
export function setCurrentUserId(userId: string): void {
  if (typeof window === "undefined") return;
  const session = getSession();
  if (session) {
    setSession({ ...session, userId });
    return;
  }
  localStorage.setItem(CURRENT_USER_ID_KEY, userId);
}

/**
 * Set (and persist) the current demo session.
 */
export function setSession(session: DemoSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  // Keep legacy keys in sync for older code paths/tests.
  localStorage.setItem(ROLE_KEY, session.role);
  localStorage.setItem(CURRENT_USER_ID_KEY, session.userId);
}

/**
 * Read current demo session.
 */
export function getSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_KEY);
  const parsed = safeJsonParse<Partial<DemoSession>>(stored);
  if (parsed?.userId && parsed?.phone && parsed?.name) {
    // Backwards compatibility: default missing role to "user"
    const role: Role = (parsed.role as Role) || "user";
    return { userId: parsed.userId, phone: parsed.phone, name: parsed.name, role };
  }
  return null;
}

/**
 * Clear current demo session (logout).
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  // Keep legacy keys consistent.
  localStorage.setItem(ROLE_KEY, "guest");
  localStorage.removeItem(CURRENT_USER_ID_KEY);
}

export function isLoggedIn(): boolean {
  return !!getSession();
}

/**
 * Check if current user is admin
 */
export function isAdmin(): boolean {
  return getRole() === "admin";
}

/**
 * Check if current user is regular user
 */
export function isUser(): boolean {
  return getRole() === "user";
}

/**
 * Check if current user is host
 */
export function isHost(): boolean {
  return getRole() === "host";
}

/**
 * Check if current user is guest
 */
export function isGuest(): boolean {
  return getRole() === "guest";
}

