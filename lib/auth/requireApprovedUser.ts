import { redirect } from "next/navigation";
import { getAuthUser, type AuthUser } from "@/lib/auth/getAuthUser";

const APPROVED_STATUS = "approved";

/**
 * Server-side guard: redirects to /pending if user is not approved.
 * Call at the top of protected server components (events, matches, etc.).
 * Returns auth user if approved; otherwise redirects.
 */
export async function requireApprovedUser(): Promise<AuthUser> {
  const auth = await getAuthUser();

  if (!auth) {
    redirect("/login");
  }

  if (auth.status !== APPROVED_STATUS) {
    redirect("/pending");
  }

  return auth;
}

/**
 * API guard: returns auth user if approved, or a 401/403 Response to return.
 * Use in API routes: const result = await requireApprovedUserForApi(); if (result instanceof Response) return result;
 */
export async function requireApprovedUserForApi(): Promise<AuthUser | Response> {
  const auth = await getAuthUser();

  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (auth.status !== APPROVED_STATUS) {
    return new Response(
      JSON.stringify({ error: "Account pending verification" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return auth;
}

/**
 * Get auth user without redirecting. Returns null if not logged in.
 */
export async function getSessionIfApproved(): Promise<{
  session: AuthUser;
  status: string;
} | null> {
  const auth = await getAuthUser();
  if (!auth) return null;
  return { session: auth, status: auth.status };
}
