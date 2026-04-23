import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import {
  TEMPLATE_META,
  missingRequiredVars,
} from "@/lib/email/templateLoader";

type Ctx = { params: Promise<{ key: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await ctx.params;
  const meta = TEMPLATE_META[key];
  if (!meta) return Response.json({ error: "Unknown template key" }, { status: 404 });

  const supabase = getServiceSupabaseClient();
  const { data: override } = await supabase
    .from("email_template_overrides")
    .select("subject, body_html, updated_at")
    .eq("key", key)
    .maybeSingle();

  return Response.json({
    key,
    meta,
    override: override ?? null,
    codeDefault: {
      subject: meta.defaultSubject,
      body_html: meta.defaultBodyHtml,
    },
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await ctx.params;

  // Special case: _sender config (name + email address)
  if (key === "_sender") {
    const body = await req.json();
    const { name, email } = body as { name?: string; email?: string };
    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: "name and email are required" }, { status: 400 });
    }
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase.from("email_template_overrides").upsert(
      { key: "_sender", subject: name.trim(), body_html: email.trim(), updated_at: new Date().toISOString(), updated_by: user.profile_id },
      { onConflict: "key" }
    );
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (!TEMPLATE_META[key]) {
    return Response.json({ error: "Unknown template key" }, { status: 404 });
  }

  const body = await req.json();
  const { subject, body_html } = body as { subject?: string; body_html?: string };

  if (!subject?.trim() || !body_html?.trim()) {
    return Response.json({ error: "subject and body_html are required" }, { status: 400 });
  }

  const missing = missingRequiredVars(key, subject, body_html);
  if (missing.length > 0) {
    return Response.json(
      { error: `Missing required placeholders: ${missing.map((v) => `{{${v}}}`).join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("email_template_overrides")
    .upsert(
      { key, subject: subject.trim(), body_html: body_html.trim(), updated_at: new Date().toISOString(), updated_by: user.profile_id },
      { onConflict: "key" }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await ctx.params;
  const supabase = getServiceSupabaseClient();
  await supabase.from("email_template_overrides").delete().eq("key", key);

  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await ctx.params;
  if (!TEMPLATE_META[key]) {
    return Response.json({ error: "Unknown template key" }, { status: 404 });
  }

  const body = await req.json();
  if (typeof body.enabled !== "boolean") {
    return Response.json({ error: "enabled (boolean) required" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("email_template_overrides")
    .upsert(
      { key, enabled: body.enabled, updated_at: new Date().toISOString(), updated_by: user.profile_id },
      { onConflict: "key" }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
