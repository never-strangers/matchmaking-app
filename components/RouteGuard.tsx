"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that redirects unauthenticated users to login
 * Public routes: /, /login, /pilot
 */
export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isPilotPreseedEnabled = process.env.NEXT_PUBLIC_PILOT_PRESEED === "true";

    // Public routes that don't require authentication
    const publicRoutes = ["/", "/login"];
    if (isPilotPreseedEnabled) {
      publicRoutes.push("/pilot");
    }

    // Allow public routes - don't redirect away from login
    if (publicRoutes.includes(pathname)) {
      return;
    }

    // Small delay to ensure session state is updated after logout
    const timer = setTimeout(() => {
      // Check if user is logged in
      const user = getCurrentUser();
      if (!user) {
        // Use replace to avoid adding to history stack
        router.replace("/login");
        return;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, router]);

  return <>{children}</>;
}
