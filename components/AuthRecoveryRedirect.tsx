"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Intercepts Supabase password-recovery tokens in the URL hash on ANY page.
 * Supabase may redirect to the site root or /events when redirect_to is not
 * whitelisted or falls back. We catch type=recovery anywhere and send the user
 * to /auth/reset-password so the token can be consumed properly.
 */
export default function AuthRecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/auth/reset-password") return; // already there

    const hash = window.location.hash || "";
    const search = window.location.search || "";

    // Only fire for explicit recovery tokens — not every access_token (normal logins)
    const isRecovery = hash.includes("type=recovery");
    const hasRecoveryCode = search.includes("code=") && search.includes("type=recovery");

    if (!isRecovery && !hasRecoveryCode) return;

    const to = `/auth/reset-password${search}${hash}`;
    router.replace(to);
  }, [pathname, router]);

  return null;
}
