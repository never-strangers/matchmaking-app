"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCurrentUser,
  setUser,
  setCurrentEmail,
  clearSession,
  SessionUser,
} from "./googleClientAuth";
import { DemoUser, ADMIN_EMAIL } from "./demoUsers";

export function useSession() {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load session on mount
    const currentUser = getCurrentUser();
    setUserState(currentUser);
    setIsLoggedIn(!!currentUser);
    setIsLoading(false);
  }, []);

  const loginAsUser = useCallback((demoUser: DemoUser) => {
    const user: SessionUser = {
      email: demoUser.email,
      name: demoUser.name,
      picture: demoUser.picture,
    };
    setUser(user);
    setUserState(user);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    // Clear state first
    setUserState(null);
    setIsLoggedIn(false);
    // Then clear session storage
    clearSession();
  }, []);

  const switchUser = useCallback((email: string) => {
    setCurrentEmail(email);
    const currentUser = getCurrentUser();
    setUserState(currentUser);
    setIsLoggedIn(!!currentUser);
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  return {
    user,
    isLoggedIn,
    isLoading,
    isAdmin,
    loginAsUser,
    logout,
    switchUser,
  };
}
