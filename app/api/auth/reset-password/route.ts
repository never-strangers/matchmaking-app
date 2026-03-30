import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : null;
    if (!email) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    const supabase = await createClient();
    const siteUrl = (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://app.thisisneverstrangers.com"
    ).replace(/\/$/, "");
    const redirectTo = `${siteUrl}/auth/reset-password`;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
