"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/demo/authStore";

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Demo route guard:
 * - If not logged in, only allow: / and /register
 * - Redirect everything else to /register
 */
export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isPilotPreseedEnabled = process.env.NEXT_PUBLIC_PILOT_PRESEED === "true";

    // Public routes that don't require authentication
    const publicRoutes = ["/", "/register"];
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
      if (!isLoggedIn()) {
        // Use replace to avoid adding to history stack
        router.replace("/register");
        return;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, router]);

  return <>{children}</>;
}
