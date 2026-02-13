"use client";

import { useEffect, useState, useCallback } from "react";

type InviteUser = {
  profileId: string;
  invitedUserId: string;
  role: "user" | "admin";
  phoneE164: string;
  displayName: string;
  name: string;
  phone: string;
  avatarPath: string | null;
  avatarUpdatedAt: string | null;
};

type State = {
  user: InviteUser | null;
  isLoading: boolean;
};

export function useInviteSession() {
  const [state, setState] = useState<State>({
    user: null,
    isLoading: true,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) {
        setState({ user: null, isLoading: false });
        return;
      }
      const data = await res.json();
      setState({
        user: {
          profileId: data.profile_id,
          invitedUserId: data.invited_user_id,
          role: data.role,
          phoneE164: data.phone_e164,
          displayName: data.display_name,
          name: data.display_name ?? data.profile_id,
          phone: data.phone_e164 ?? "",
          avatarPath: data.avatar_path ?? null,
          avatarUpdatedAt: data.avatar_updated_at ?? null,
        },
        isLoading: false,
      });
    } catch {
      setState({ user: null, isLoading: false });
    }
  }, []);

  useEffect(() => {
    void load();
    const onProfileUpdate = () => void load();
    window.addEventListener("profile-avatar-updated", onProfileUpdate);
    return () => window.removeEventListener("profile-avatar-updated", onProfileUpdate);
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      window.location.href = "/";
    }
  }, []);

  const { user, isLoading } = state;
  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin";

  return {
    user,
    isLoading,
    isLoggedIn,
    isAdmin,
    logout,
    refresh: load,
  };
}

