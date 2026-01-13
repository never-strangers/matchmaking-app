"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getRole, setRole, isAdmin, isHost, isUser, isGuest, getCurrentUserId, setCurrentUserId } from "@/lib/demo/authStore";
import { listUsers, getUserById } from "@/lib/demo/userStore";
import { DEMO_USERS } from "@/lib/matching/demoUsers";
import { getUnreadCount } from "@/lib/demo/notificationStore";
import { Role } from "@/types/roles";
import { UserProfile } from "@/types/user";

export default function NavBar() {
  const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";
  const [currentRole, setCurrentRole] = useState<Role>("guest");
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Select User");
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentRole(getRole());
    const userId = getCurrentUserId();
    setCurrentUserIdState(userId);
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        setCurrentUserName(user.name);
      } else {
        // Check DEMO_USERS as fallback
        const demoUser = DEMO_USERS.find((u) => u.id === userId);
        if (demoUser) {
          setCurrentUserName(demoUser.name);
        }
      }
      // Load unread count
      setUnreadCount(getUnreadCount(userId));
    }
  }, []);

  // Refresh unread count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const userId = getCurrentUserId();
      if (userId) {
        setUnreadCount(getUnreadCount(userId));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node) &&
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRoleSwitcher(false);
        setShowUserSwitcher(false);
      }
    };

    if (showRoleSwitcher || showUserSwitcher) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRoleSwitcher, showUserSwitcher]);

  const handleRoleChange = (role: Role) => {
    setRole(role);
    setCurrentRole(role);
    setShowRoleSwitcher(false);
    // Refresh page to apply role changes
    window.location.reload();
  };

  const handleUserChange = (userId: string, userName: string) => {
    setCurrentUserId(userId);
    setCurrentUserIdState(userId);
    setCurrentUserName(userName);
    setShowUserSwitcher(false);
    // Refresh page to apply user changes
    window.location.reload();
  };

  // Get all available users
  const getAllUsers = (): Array<{ id: string; name: string; city?: string; status?: string }> => {
    const userStoreUsers = listUsers();
    const demoUsers = DEMO_USERS;
    
    // Combine users, prioritizing userStore users
    const userMap = new Map<string, { id: string; name: string; city?: string; status?: string }>();
    
    // Add userStore users first
    userStoreUsers.forEach((user) => {
      userMap.set(user.id, {
        id: user.id,
        name: user.name,
        city: user.city,
        status: user.status,
      });
    });
    
    // Add demo users that aren't in userStore
    demoUsers.forEach((user) => {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, {
          id: user.id,
          name: user.name,
          city: user.city,
        });
      }
    });
    
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const allUsers = getAllUsers();

  // Show tabs based on role
  const showRegister = isGuest();
  const showEvents = isUser() || isHost() || isAdmin();
  const showMatch = isUser() || isAdmin();
  const showMessages = (isUser() || isAdmin()) && isChatEnabled;
  const showHost = isHost() || isAdmin();
  const showAdmin = isAdmin();

  return (
    <nav className="flex items-center justify-between w-full">
      <div className="flex space-x-6">
        {showRegister && (
          <Link
            href="/register"
            data-testid="nav-register"
            className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
          >
            Register
          </Link>
        )}
        {showEvents && (
          <Link
            href="/events"
            data-testid="nav-events"
            className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
          >
            Events
          </Link>
        )}
        {showMatch && (
          <Link
            href="/match"
            data-testid="nav-match"
            className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
          >
            Match
          </Link>
        )}
        {showMessages && (
          <Link
            href="/messages"
            data-testid="nav-messages"
            className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
          >
            Messages
          </Link>
        )}
        {showHost && (
          <Link
            href="/host"
            data-testid="nav-host"
            className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
          >
            Host Dashboard
          </Link>
        )}
        {showAdmin && (
          <Link
            href="/admin"
            data-testid="nav-admin"
            className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
          >
            Admin Dashboard
          </Link>
        )}
      </div>
      
      {/* Demo Switchers */}
      <div className="flex items-center gap-2">
        {/* User Switcher */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => {
              setShowUserSwitcher(!showUserSwitcher);
              setShowRoleSwitcher(false);
            }}
            className="text-xs text-gray-medium hover:text-gray-dark px-3 py-1 border border-beige-frame rounded-lg bg-white transition-colors whitespace-nowrap"
            data-testid="user-switcher-toggle"
          >
            User: {currentUserName}
          </button>
          {showUserSwitcher && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-beige-frame rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {allUsers.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-medium">
                  No users available
                </div>
              ) : (
                allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserChange(user.id, user.name)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-beige-frame transition-colors border-b border-beige-frame last:border-0 ${
                      currentUserId === user.id ? "bg-beige-frame font-medium" : ""
                    }`}
                    data-testid={`user-switch-${user.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{user.name}</span>
                      <div className="flex items-center gap-2">
                        {user.city && (
                          <span className="text-xs text-gray-medium">
                            {user.city}
                          </span>
                        )}
                        {user.status && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              user.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : user.status === "pending_approval"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.status === "approved"
                              ? "✓"
                              : user.status === "pending_approval"
                              ? "⏳"
                              : "✗"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => {
              setShowRoleSwitcher(!showRoleSwitcher);
              setShowUserSwitcher(false);
            }}
            className="text-xs text-gray-medium hover:text-gray-dark px-3 py-1 border border-beige-frame rounded-lg bg-white transition-colors whitespace-nowrap"
            data-testid="role-switcher-toggle"
          >
            Role: {currentRole === "admin" ? "👑 Admin" : currentRole === "host" ? "🏠 Host" : currentRole === "user" ? "👤 User" : "👋 Guest"}
          </button>
          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-beige-frame rounded-lg shadow-lg z-50">
              <button
                onClick={() => handleRoleChange("guest")}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-beige-frame transition-colors ${
                  currentRole === "guest" ? "bg-beige-frame font-medium" : ""
                }`}
                data-testid="role-switch-guest"
              >
                👋 Guest
              </button>
              <button
                onClick={() => handleRoleChange("user")}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-beige-frame transition-colors ${
                  currentRole === "user" ? "bg-beige-frame font-medium" : ""
                }`}
                data-testid="role-switch-user"
              >
                👤 User
              </button>
              <button
                onClick={() => handleRoleChange("host")}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-beige-frame transition-colors ${
                  currentRole === "host" ? "bg-beige-frame font-medium" : ""
                }`}
                data-testid="role-switch-host"
              >
                🏠 Host
              </button>
              <button
                onClick={() => handleRoleChange("admin")}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-beige-frame transition-colors ${
                  currentRole === "admin" ? "bg-beige-frame font-medium" : ""
                }`}
                data-testid="role-switch-admin"
              >
                👑 Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

