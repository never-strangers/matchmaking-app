import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { TEMPLATE_META, loadTemplate } from "@/lib/email/templateLoader";
import { sendEmail } from "@/lib/email/provider";

type Ctx = { params: Promise<{ key: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await ctx.params;
  const meta = TEMPLATE_META[key];
  if (!meta) return Response.json({ error: "Unknown template key" }, { status: 404 });

  const toEmail = user.email?.trim();
  if (!toEmail) {
    return Response.json({ error: "No email address on your account — cannot send test." }, { status: 400 });
  }

  const template = await loadTemplate(key, meta.sampleVars);
  const result = await sendEmail({
    to: toEmail,
    subject: `[TEST] ${template.subject}`,
    html: template.html,
  });

  if (result.status === "error") {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ ok: true, status: result.status, provider: result.provider, messageId: result.id });
}
