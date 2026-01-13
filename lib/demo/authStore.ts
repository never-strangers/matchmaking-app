"use client";

import { Role } from "@/types/roles";

const ROLE_KEY = "ns_role";
const CURRENT_USER_ID_KEY = "ns_current_user_id";

/**
 * Get current role (defaults to "guest" for demo)
 */
export function getRole(): Role {
  if (typeof window === "undefined") return "guest";
  const stored = localStorage.getItem(ROLE_KEY);
  return (stored as Role) || "guest";
}

/**
 * Set current role
 */
export function setRole(role: Role): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_KEY, role);
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_USER_ID_KEY);
}

/**
 * Set current user ID
 */
export function setCurrentUserId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_USER_ID_KEY, userId);
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

