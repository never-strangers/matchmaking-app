"use client";

import { useState, useEffect, useCallback } from "react";
import type { Role } from "@/types/roles";
import {
  clearSession,
  getSession,
  setSession,
} from "@/lib/demo/authStore";
import { getUserById, upsertUser } from "@/lib/demo/userStore";

function phoneToSyntheticEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `phone_${digits}@demo.local`;
}

export function useSession() {
  const [user, setUserState] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
    role: Role;
  } | null>(null);
  const [isLoggedIn, setIsLoggedInState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load session on mount
    const session = getSession();
    if (session) {
      const profile = getUserById(session.userId);
      setUserState({
        id: session.userId,
        name: session.name,
        phone: session.phone,
        email: profile?.email || phoneToSyntheticEmail(session.phone),
        role: session.role,
      });
      setIsLoggedInState(true);
    } else {
      setUserState(null);
      setIsLoggedInState(false);
    }
    setIsLoading(false);
  }, []);

  const refresh = useCallback(() => {
    const session = getSession();
    if (session) {
      const profile = getUserById(session.userId);
      setUserState({
        id: session.userId,
        name: session.name,
        phone: session.phone,
        email: profile?.email || phoneToSyntheticEmail(session.phone),
        role: session.role,
      });
      setIsLoggedInState(true);
    } else {
      setUserState(null);
      setIsLoggedInState(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear state first
    setUserState(null);
    setIsLoggedInState(false);
    // Then clear session storage
    clearSession();
  }, []);

  /**
   * Backwards-compatible "switch user" (used by some demo flows/tests).
   * If `id` exists, set it as current session user.
   */
  const switchUser = useCallback((id: string) => {
    const existing = getUserById(id);
    if (!existing?.phone) return;
    const phone = existing.phone;
    const name = existing.name || "Demo User";
    const role = (existing.role || "user") as Role;
    setSession({ userId: id, phone, name, role });
    refresh();
  }, [refresh]);

  /**
   * Backwards-compatible "loginAsUser" used by old `/login` demo user picker.
   * We interpret the passed object as having `email`+`name` and map it to
   * a deterministic "fake phone" user if needed.
   */
  const loginAsUser = useCallback((demoUser: any) => {
    const name = String(demoUser?.name || "Demo User");
    const email = String(demoUser?.email || "");
    // Derive deterministic 8 digits from email to keep stable across runs.
    const digits = (email.replace(/\D/g, "").padEnd(8, "0").slice(0, 8)) || "80000000";
    const phone = `+65${digits}`;
    const userId = `usr_65${digits}`;
    // Ensure the user exists in ns_users for downstream flows.
    upsertUser({ id: userId, name, phone, city: "Singapore", role: "user" });
    setSession({ userId, phone, name, role: "user" });
    refresh();
  }, [refresh]);

  const isAdmin = user?.role === "admin";

  return {
    user,
    isLoggedIn,
    isLoading,
    isAdmin,
    loginAsUser,
    logout,
    switchUser,
    refresh,
  };
}
