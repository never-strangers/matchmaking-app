import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { loadTemplate } from "@/lib/email/templateLoader";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: profileId } = await params;
  const supabase = getServiceSupabaseClient();

  // Fetch profile email + name
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, name, full_name, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const email = profile.email as string | null;
  if (!email) {
    return Response.json({ error: "User has no email address" }, { status: 400 });
  }

  // Generate a Supabase password-recovery link
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[reset-password] generateLink error:", linkError);
    return Response.json(
      { error: linkError?.message ?? "Failed to generate reset link" },
      { status: 500 }
    );
  }

  const resetUrl = linkData.properties.action_link;
  const firstName =
    ((profile.name as string | null) ??
      (profile.full_name as string | null) ??
      (profile.display_name as string | null) ??
      "")
      .split(" ")[0] ?? "";

  const tpl = await loadTemplate("password_reset", { first_name: firstName, reset_url: resetUrl });
  await enqueueEmail(`admin-reset:${profileId}:${Date.now()}`, "password_reset", email, tpl);

  return Response.json({ ok: true, email });
}
