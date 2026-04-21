import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { TEMPLATE_META } from "@/lib/email/templateLoader";

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabaseClient();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: overrides }, { data: emailStats }] = await Promise.all([
    supabase.from("email_template_overrides").select("key, updated_at, updated_by, profiles(display_name)"),
    supabase.from("email_log").select("template, created_at, status").gte("created_at", since7d),
  ]);

  type OverrideRow = { key: string; updated_at: string; updated_by: string | null; profiles: { display_name: string } | { display_name: string }[] | null };
  const overrideMap = new Map((overrides as OverrideRow[] ?? []).map((r) => [r.key, r]));

  // Aggregate email_log rows per template key
  type LogRow = { template: string; created_at: string; status: string };
  const statsMap = new Map<string, { count: number; errors: number; lastSent: string }>();
  for (const row of (emailStats ?? []) as LogRow[]) {
    const existing = statsMap.get(row.template);
    const isError = row.status === "error";
    if (!existing) {
      statsMap.set(row.template, { count: 1, errors: isError ? 1 : 0, lastSent: row.created_at });
    } else {
      existing.count++;
      if (isError) existing.errors++;
      if (row.created_at > existing.lastSent) existing.lastSent = row.created_at;
    }
  }

  const templates = Object.entries(TEMPLATE_META).map(([key, meta]) => {
    const ov = overrideMap.get(key);
    const stats = statsMap.get(key) ?? null;
    return {
      key,
      label: meta.label,
      hasOverride: !!ov,
      vars: meta.vars,
      requiredVars: meta.requiredVars,
      updatedAt: ov?.updated_at ?? null,
      updatedBy: ov ? (Array.isArray(ov.profiles) ? ov.profiles[0]?.display_name : ov.profiles?.display_name) ?? null : null,
      sentCount7d: stats ? stats.count - stats.errors : 0,
      errorCount7d: stats?.errors ?? 0,
      lastSentAt: stats?.lastSent ?? null,
    };
  });

  return Response.json({ templates });
}
