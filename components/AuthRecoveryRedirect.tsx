"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * When Supabase sends a password-recovery link with redirect_to=http://localhost:3000
 * (no path), the user lands on / with tokens in the URL hash. Redirect them to
 * /auth/reset-password so the reset page can consume the session.
 */
export default function AuthRecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    const search = window.location.search || "";

    const hasRecoveryHash =
      hash.includes("type=recovery") || hash.includes("access_token=");
    const hasRecoveryCode = search.includes("code=");

    if (!hasRecoveryHash && !hasRecoveryCode) return;

    const isRoot = pathname === "/" || pathname === "";
    if (!isRoot) return;

    const to = `/auth/reset-password${search}${hash}`;
    router.replace(to);
  }, [pathname, router]);

  return null;
}
