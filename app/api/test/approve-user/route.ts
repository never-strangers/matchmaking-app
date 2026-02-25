import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * E2E-only: approve a user (set profile status = approved).
 * Uses service role (admin) server-side; guarded by E2E_SHARED_SECRET header.
 * Enable for local E2E by setting E2E_SHARED_SECRET in the app env (e.g. .env.local or .env.test).
 */
type ApproveUserBody = {
  email?: string;
  user_id?: string;
};

/** Route is enabled when running in test env or when E2E is configured (so dev server can serve it for local E2E). */
function isE2EEnabled(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.E2E_TEST_MODE === "true" ||
    (typeof process.env.E2E_SHARED_SECRET === "string" && process.env.E2E_SHARED_SECRET.length > 0)
  );
}

export async function POST(request: Request) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const expectedSecret = process.env.E2E_SHARED_SECRET;
  const actualSecret = request.headers.get("x-e2e-secret");
  if (!expectedSecret || !actualSecret || actualSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ApproveUserBody;
  try {
    body = (await request.json()) as ApproveUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  if (!email && !userId) {
    return NextResponse.json(
      { error: "Provide either email or user_id." },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    let targetUserId = userId;
    let userEmail = email;

    if (!targetUserId && email) {
      const { data: userResult, error: userError } =
        await supabase.auth.admin.listUsers();

      if (userError) {
        return NextResponse.json(
          { error: userError.message || "Failed to find user." },
          { status: 500 }
        );
      }

      const matched = userResult.users.find(
        (user) => (user.email ?? "").toLowerCase() === email
      );
      targetUserId = matched?.id ?? "";
      if (matched?.email) userEmail = matched.email;
    } else if (targetUserId && !userEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
      userEmail = userData?.user?.email ?? "";
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const fallbackName =
      (userEmail && userEmail.includes("@")
        ? userEmail.split("@")[0].slice(0, 50)
        : null) || `user_${targetUserId.slice(0, 8)}`;
    const fallbackEmail =
      (userEmail && userEmail.trim()) || `e2e_${targetUserId.slice(0, 8)}@e2e.local`;
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: targetUserId,
          name: fallbackName,
          display_name: fallbackName,
          full_name: fallbackName,
          email: fallbackEmail,
          city: "sg",
          status: "approved",
          updated_at: now,
        },
        { onConflict: "id" }
      );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to approve user." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, user_id: targetUserId, status: "approved" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to approve user." }, { status: 500 });
  }
}
