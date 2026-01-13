"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRole, getCurrentUserId } from "@/lib/demo/authStore";
import { Role } from "@/types/roles";

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that redirects users based on their role
 */
export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const role = getRole();
    const userId = getCurrentUserId();

    // Public routes that everyone can access
    const publicRoutes = ["/", "/register"];
    
    // Guest can only access register and home
    if (role === "guest") {
      if (!publicRoutes.includes(pathname)) {
        router.push("/register");
        return;
      }
    }

    // User can access: /events, /match, /messages (if enabled)
    if (role === "user") {
      const allowedRoutes = ["/events", "/match", "/messages", "/notifications"];
      if (!publicRoutes.includes(pathname) && !allowedRoutes.includes(pathname) && !pathname.startsWith("/events/")) {
        router.push("/events");
        return;
      }
    }

    // Host can access: /host/*, /events (read-only)
    if (role === "host") {
      const allowedRoutes = ["/events", "/notifications"];
      if (!publicRoutes.includes(pathname) && !pathname.startsWith("/host") && !allowedRoutes.includes(pathname) && !pathname.startsWith("/events/")) {
        router.push("/host");
        return;
      }
    }

    // Admin can access everything
    // No restrictions for admin
  }, [pathname, router]);

  return <>{children}</>;
}
