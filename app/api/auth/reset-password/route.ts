import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { loadTemplate } from "@/lib/email/templateLoader";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!email) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error || !data?.properties?.action_link) {
      // Return generic success to prevent email enumeration
      console.error("[reset-password] generateLink error:", error);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const resetUrl = data.properties.action_link;
    const tpl = await loadTemplate("password_reset", { first_name: "", reset_url: resetUrl });
    await enqueueEmail(`user-reset:${email}:${Date.now()}`, "password_reset", email, tpl);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
