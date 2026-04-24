/**
 * Retry failed rows in email_log: rebuild HTML from template + idempotency_key, send via
 * lib/email/provider (set EMAIL_PROVIDER=enveloped + ENVLOPED_API_KEY in .env.local),
 * update the same row by id. Does not delete rows; does not touch non-error rows.
 *
 * Default window: status=error with created_at <= anchor (or --until). Rows are fetched **newest first**
 * so --limit applies to the most recent failures in range (not the oldest).
 *
 * Usage:
 *   npx tsx scripts/retry-email-log-errors.ts --anchor-id <uuid> --dry-run
 *   npx tsx scripts/retry-email-log-errors.ts --anchor-id <uuid> --yes
 *
 * Flags:
 *   --until <instant>  Cutoff instead of --anchor-id (upper bound when not using --after).
 *   --since <instant> Optional lower bound: created_at >= since (combine with --until for a closed window).
 *   --after           Only errors with created_at >= ref (--until or anchor row time)
 *   --oldest-first    Sort created_at ascending (default is descending = newest first)
 *   --limit N         Max rows to process (default 500)
 *
 * Env: reads `.env.local` and `.env` from the **current working directory** first, then from the repo dir next to this script.
 * `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` must be the **same Supabase project** as Table Editor (prod vs dev).
 * For `password_reset` retries, set `APP_BASE_URL` or `APP_URL` to production so `generateLink` redirect matches batch resets (see `send-password-resets.ts`).
 */

import * as path from "node:path";
import * as dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "../lib/email/provider";
import { loadTemplate } from "../lib/email/templateLoader";
import { firstNameFromProfileFields } from "../lib/email/profileFirstName";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

type EmailLogRow = {
  id: string;
  idempotency_key: string;
  template: string;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
};

function formatCurrency(cents: number, currency: string): string {
  const major = (cents / 100).toFixed(2);
  return `${currency.toUpperCase()} ${major}`;
}

function parseRsvpOrPayment(key: string):
  | { kind: "rsvp"; eventId: string; profileId: string }
  | { kind: "payment"; eventId: string; profileId: string }
  | null {
  if (key.startsWith("rsvp-confirmed:")) {
    const rest = key.slice("rsvp-confirmed:".length);
    const i = rest.lastIndexOf(":");
    if (i <= 0) return null;
    return { kind: "rsvp", eventId: rest.slice(0, i), profileId: rest.slice(i + 1) };
  }
  if (key.startsWith("payment-confirmed:")) {
    const rest = key.slice("payment-confirmed:".length);
    const i = rest.lastIndexOf(":");
    if (i <= 0) return null;
    return { kind: "payment", eventId: rest.slice(0, i), profileId: rest.slice(i + 1) };
  }
  return null;
}

function parsePasswordReset(key: string): { email?: string; profileId?: string } | null {
  if (key.startsWith("user-reset:")) {
    const rest = key.slice("user-reset:".length);
    const i = rest.lastIndexOf(":");
    if (i <= 0) return null;
    return { email: rest.slice(0, i).trim().toLowerCase() };
  }
  if (key.startsWith("admin-reset:")) {
    const rest = key.slice("admin-reset:".length);
    const i = rest.lastIndexOf(":");
    if (i <= 0) return null;
    return { profileId: rest.slice(0, i) };
  }
  return null;
}

/** `app/api/admin/users/status/route.ts` → enqueueEmail(`status-${newStatus}:${profileId}`, ...) */
function parseStatusDecision(key: string): { kind: "approved" | "rejected"; profileId: string } | null {
  if (key.startsWith("status-approved:")) {
    const profileId = key.slice("status-approved:".length).trim();
    return profileId ? { kind: "approved", profileId } : null;
  }
  if (key.startsWith("status-rejected:")) {
    const profileId = key.slice("status-rejected:".length).trim();
    return profileId ? { kind: "rejected", profileId } : null;
  }
  return null;
}

function eventDateParts(ev: {
  date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  description?: string | null;
}) {
  const eventDate =
    ev?.date ??
    (ev?.start_at
      ? new Date(ev.start_at).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "");
  const eventStartTime = ev?.start_at
    ? new Date(ev.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";
  const eventEndTime = ev?.end_at
    ? new Date(ev.end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";
  return { eventDate, eventStartTime, eventEndTime, eventDescription: ev?.description ?? "" };
}

function isCliFlagToken(arg: string | undefined): boolean {
  return Boolean(arg && arg.startsWith("-") && arg.length > 1);
}

/** Join argv after a flag until the next flag (handles unquoted Postgres/CLI datetimes with spaces). */
function consumeValueFromArgv(argv: string[], flagIdx: number): string {
  const parts: string[] = [];
  for (let i = flagIdx + 1; i < argv.length; i++) {
    const t = argv[i];
    if (isCliFlagToken(t)) break;
    parts.push(t);
  }
  return parts.join(" ").trim();
}

/**
 * Parse user/Postgres timestamps into a valid Date (then ISO string).
 * Handles: `2026-04-23 09:07:19.824899+00`, `...+00` → UTC Z, first space between date & time → `T`.
 */
function parseUntilToIso(raw: string): string {
  let s = raw.trim();
  if (!s) throw new Error("empty instant");

  if (/^\d{4}-\d{2}-\d{2} \d/.test(s) && !s.includes("T")) {
    s = s.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  }
  if (/[+-]00$/.test(s)) {
    s = s.replace(/[+-]00$/, "Z");
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`unrecognized instant: ${JSON.stringify(raw)}`);
  }
  return d.toISOString();
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Match `scripts/send-password-resets.ts`: prefer prod base so reset links are not localhost-only. */
function appBaseUrlForRecovery(): string {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Hint when anchor UUID is missing (wrong project or typo). */
function logSupabaseProjectHint(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* keep raw */
  }
  console.error(
    `  Using NEXT_PUBLIC_SUPABASE_URL → ${host || "(not set)"}\n` +
      `  That project has no row with this id. Use production keys in .env.local if the UUID came from prod, ` +
      `or use --until <iso> instead of --anchor-id.`
  );
}

async function buildTemplateForRow(
  supabase: SupabaseClient,
  row: EmailLogRow
): Promise<{ subject: string; html: string } | null> {
  const key = row.idempotency_key;
  const template = row.template;

  if (template === "password_reset") {
    const parsed = parsePasswordReset(key);
    if (!parsed) {
      console.warn(`  ⚠️  ${row.id} skip password_reset: bad idempotency_key`);
      return null;
    }
    const targetEmail = row.to_email.trim().toLowerCase();
    if (parsed.profileId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", parsed.profileId)
        .maybeSingle();
      if (!prof?.email) {
        console.warn(`  ⚠️  ${row.id} skip: no email for profile ${parsed.profileId}`);
        return null;
      }
    }
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
      options: { redirectTo: `${appBaseUrlForRecovery()}/auth/reset-password` },
    });
    if (linkError || !linkData?.properties?.action_link) {
      console.warn(`  ⚠️  ${row.id} generateLink failed:`, linkError?.message);
      return null;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, full_name, display_name")
      .eq("email", targetEmail)
      .maybeSingle();
    const firstName = profile ? firstNameFromProfileFields(profile) : "";
    return loadTemplate("password_reset", {
      first_name: firstName,
      reset_url: linkData.properties.action_link,
    });
  }

  if (template === "rsvp_confirmation") {
    const parsed = parseRsvpOrPayment(key);
    if (!parsed || parsed.kind !== "rsvp") {
      console.warn(`  ⚠️  ${row.id} skip rsvp: bad idempotency_key`);
      return null;
    }
    const [{ data: profile }, { data: event }] = await Promise.all([
      supabase.from("profiles").select("email, name").eq("id", parsed.profileId).maybeSingle(),
      supabase
        .from("events")
        .select("title, date, start_at, end_at, description")
        .eq("id", parsed.eventId)
        .maybeSingle(),
    ]);
    if (!profile?.email) {
      console.warn(`  ⚠️  ${row.id} skip rsvp: no profile`);
      return null;
    }
    const nameParts = (profile.name ?? "").split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");
    const ev = event ?? {};
    const eventTitle = (ev as { title?: string }).title ?? "an event";
    const { eventDate, eventStartTime, eventEndTime, eventDescription } = eventDateParts(
      ev as { date?: string; start_at?: string; end_at?: string; description?: string }
    );
    return loadTemplate("rsvp_confirmation", {
      first_name: firstName,
      last_name: lastName,
      event_title: eventTitle,
      event_date: eventDate,
      event_start_time: eventStartTime,
      event_end_time: eventEndTime,
      event_description: eventDescription,
    });
  }

  if (template === "payment_confirmation") {
    const parsed = parseRsvpOrPayment(key);
    if (!parsed || parsed.kind !== "payment") {
      console.warn(`  ⚠️  ${row.id} skip payment: bad idempotency_key`);
      return null;
    }
    const [{ data: profile }, { data: event }] = await Promise.all([
      supabase.from("profiles").select("email, name").eq("id", parsed.profileId).maybeSingle(),
      supabase
        .from("events")
        .select("title, date, start_at, currency, price_cents")
        .eq("id", parsed.eventId)
        .maybeSingle(),
    ]);
    if (!profile?.email) {
      console.warn(`  ⚠️  ${row.id} skip payment: no profile`);
      return null;
    }
    const firstName = (profile.name ?? "").split(" ")[0] ?? "";
    const ev = event ?? {};
    const eventTitle = (ev as { title?: string }).title ?? "an event";
    let eventDate = (ev as { date?: string }).date ?? "";
    const startAt = (ev as { start_at?: string }).start_at;
    if (!eventDate && startAt) {
      eventDate = new Date(startAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const currency = (ev as { currency?: string }).currency ?? "sgd";
    const priceCents = Number((ev as { price_cents?: number }).price_cents ?? 0);
    const amountFormatted = formatCurrency(priceCents, currency);
    return loadTemplate("payment_confirmation", {
      first_name: firstName,
      event_title: eventTitle,
      event_date: eventDate,
      amount_formatted: amountFormatted,
    });
  }

  if (template === "approved" || template === "rejected") {
    const parsed = parseStatusDecision(key);
    if (!parsed || parsed.kind !== template) {
      console.warn(`  ⚠️  ${row.id} skip ${template}: bad idempotency_key (expected status-${template}:<profileId>)`);
      return null;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name, city")
      .eq("id", parsed.profileId)
      .maybeSingle();
    if (!profile?.email) {
      console.warn(`  ⚠️  ${row.id} skip ${template}: no profile ${parsed.profileId}`);
      return null;
    }
    const firstName = (profile.name ?? "").split(" ")[0] ?? "";
    if (template === "approved") {
      return loadTemplate("approved", { first_name: firstName, city: profile.city ?? "" });
    }
    return loadTemplate("rejected", { first_name: firstName });
  }

  console.warn(`  ⚠️  ${row.id} skip: unsupported template "${template}"`);
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const yes = argv.includes("--yes");
  const windowAfter = argv.includes("--after") || argv.includes("--window-after");
  const oldestFirst = argv.includes("--oldest-first");
  const anchorIdx = argv.indexOf("--anchor-id");
  const anchorId = anchorIdx >= 0 ? argv[anchorIdx + 1]?.trim() : "";
  const untilIdx = argv.indexOf("--until");
  const untilRaw = untilIdx >= 0 ? consumeValueFromArgv(argv, untilIdx) : "";
  const sinceIdx = argv.indexOf("--since");
  const sinceRaw = sinceIdx >= 0 ? consumeValueFromArgv(argv, sinceIdx) : "";
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? Math.min(5000, Math.max(1, parseInt(argv[limitIdx + 1] ?? "500", 10))) : 500;

  if (!anchorId && !untilRaw) {
    console.error(
      "Usage: npx tsx scripts/retry-email-log-errors.ts --anchor-id <uuid> | --until <iso> [--since <iso>] [--dry-run|--yes] [--after] [--oldest-first] [--limit N]"
    );
    process.exit(1);
  }
  if (anchorId && untilRaw) {
    console.error("Use either --anchor-id or --until, not both.");
    process.exit(1);
  }
  if (!dryRun && !yes) {
    console.error("Pass --dry-run to list rows, or --yes to send.");
    process.exit(1);
  }

  const provider = (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase();
  console.log(`EMAIL_PROVIDER=${provider} (use enveloped + ENVLOPED_API_KEY for Enveloped)\n`);

  const supabase = getSupabase();

  let tAnchor: string;
  let anchorLabel: string;
  let anchorStatus: string | undefined;

  if (untilRaw) {
    try {
      tAnchor = parseUntilToIso(untilRaw);
    } catch {
      console.error(
        "Invalid --until; use ISO 8601 (2026-04-22T08:00:00.000Z) or Postgres-style (2026-04-23 09:07:19.824899+00). " +
          "Quote the value if your shell splits on spaces."
      );
      process.exit(1);
    }
    anchorLabel = `--until ${tAnchor}`;
  } else {
    const { data: anchor, error: anchorErr } = await supabase
      .from("email_log")
      .select("id, created_at, status")
      .eq("id", anchorId)
      .maybeSingle();

    if (anchorErr || !anchor) {
      console.error("Anchor row not found:", anchorErr?.message ?? anchorId);
      logSupabaseProjectHint();
      process.exit(1);
    }
    tAnchor = anchor.created_at as string;
    anchorLabel = anchorId;
    anchorStatus = anchor.status as string;
  }

  let tSince: string | null = null;
  if (sinceRaw) {
    try {
      tSince = parseUntilToIso(sinceRaw);
    } catch {
      console.error(
        "Invalid --since; use ISO 8601 or Postgres-style (same as --until). " +
          "Quote the value if your shell splits on spaces."
      );
      process.exit(1);
    }
  }

  let q = supabase
    .from("email_log")
    .select("id, idempotency_key, template, to_email, subject, status, created_at")
    .eq("status", "error")
    .order("created_at", { ascending: oldestFirst })
    .limit(limit);

  if (windowAfter) {
    const lower = tSince && tSince > tAnchor ? tSince : tAnchor;
    q = q.gte("created_at", lower);
  } else {
    q = q.lte("created_at", tAnchor);
    if (tSince) q = q.gte("created_at", tSince);
  }

  const { data: rows, error: listErr } = await q;

  if (listErr) {
    console.error(listErr);
    process.exit(1);
  }

  const list = (rows ?? []) as EmailLogRow[];
  const statusPart = anchorStatus != null ? ` status=${anchorStatus};` : "";
  const sincePart = tSince ? ` since>=${tSince};` : "";
  const sortPart = oldestFirst ? "sort=created_at asc" : "sort=created_at desc (newest first)";
  console.log(
    `Window ref ${anchorLabel} @ ${tAnchor};${statusPart}${sincePart} filter=${windowAfter ? "created_at >= ref" : "created_at <= ref"}; ${sortPart}`
  );
  console.log(`Found ${list.length} error row(s) (limit ${limit}).\n`);

  if (dryRun) {
    for (const r of list) {
      console.log(`  ${r.id}  ${r.template}  ${r.to_email}  ${r.created_at}`);
    }
    console.log("\nDry run — no sends.");
    return;
  }

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const row of list) {
    try {
      const tpl = await buildTemplateForRow(supabase, row);
      if (!tpl) {
        skip++;
        continue;
      }
      const result = await sendEmail({ to: row.to_email, subject: tpl.subject, html: tpl.html });
      await supabase
        .from("email_log")
        .update({
          status: result.status,
          provider_id: result.id ?? null,
          provider: result.provider ?? null,
          error_message: result.error ?? null,
        })
        .eq("id", row.id);

      if (result.status === "error") {
        console.error(`  ❌ ${row.id} ${row.template} → ${result.error}`);
        fail++;
      } else {
        console.log(`  ✅ ${row.id} ${row.template} → ${result.status} (${result.provider ?? "?"})`);
        ok++;
      }
    } catch (e) {
      console.error(`  ❌ ${row.id}`, e);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} sent/mock, ${fail} failed, ${skip} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
