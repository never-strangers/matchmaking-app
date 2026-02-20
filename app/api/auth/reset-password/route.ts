import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RESET_PATH = "/auth/reset-password";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let email = user?.email?.trim();
    if (!email) {
      const body = await request.json().catch(() => ({}));
      const bodyEmail = typeof body?.email === "string" ? body.email.trim() : "";
      if (bodyEmail) email = bodyEmail;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";

    if (email && siteUrl) {
      const redirectTo = `${siteUrl.replace(/\/$/, "")}${RESET_PATH}`;
      await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    } else if (!siteUrl) {
      console.error("[reset-password] Missing NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL");
    }
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
  }

  return NextResponse.json({ ok: true });
}
