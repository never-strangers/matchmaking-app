/**
 * Batched password-reset emails for approved profiles only (post WP→Supabase migration).
 *
 * Usage:
 *   npm run send:password-resets -- --batch batch0 --emails "a@x.com,b@y.com" --dry-run
 *   npm run send:password-resets -- --batch batch1 --yes
 *   npm run send:password-resets -- --batch batch2 --cursor "2026-04-10T00:00:00.000Z" --yes
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      APP_BASE_URL or APP_URL (preferred for real sends; avoids localhost when
 *      NEXT_PUBLIC_APP_URL is dev-only), else NEXT_PUBLIC_APP_URL,
 *      EMAIL_PROVIDER, RESEND_API_KEY, ENVLOPED_API_KEY, EMAIL_FROM (same as lib/email/provider).
 *
 * Requires migrations: 20260422143000_password_reset_sends.sql,
 *   20260423140000_password_reset_batch_wp_users_only.sql (batch1/2 ∩ wp-users when table exists).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createRequire } from "node:module";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { sendEmail } from "../lib/email/provider";

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const require = createRequire(import.meta.url);
const { resetPasswordHtml } = require("../lib/email/resetPasswordHtml.js") as {
  resetPasswordHtml: (url: string, opts?: { appName?: string; appUrl?: string }) => string;
};

const RATE_MS = 150;
const RETRIES = 3;
const DEFAULT_BATCH1_LIMIT = 500;
const DEFAULT_BATCH2_LIMIT = 2000;

type BatchName = "batch0" | "batch1" | "batch2";

type Recipient = {
  id: string;
  email: string;
  registered_at: string;
  name: string | null;
  full_name: string | null;
  display_name: string | null;
};

type Stats = {
  attempted: number;
  sent: number;
  failed: number;
  skipped_not_found: number;
  skipped_not_approved: number;
  skipped_already_sent: number;
  skipped_invalid_email: number;
};

function parseArgs(argv: string[]) {
  let batch: BatchName | undefined;
  let emailsRaw: string | undefined;
  let limit: number | undefined;
  let cursor: string | undefined;
  let dryRun = false;
  let yes = false;
  let provider = "supabase_auth";

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--batch" && argv[i + 1]) batch = argv[++i] as BatchName;
    else if (a === "--emails" && argv[i + 1]) emailsRaw = argv[++i];
    else if (a === "--limit" && argv[i + 1]) limit = parseInt(argv[++i], 10);
    else if (a === "--cursor" && argv[i + 1]) cursor = argv[++i];
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--yes") yes = true;
    else if (a === "--provider" && argv[i + 1]) provider = argv[++i];
  }

  return { batch, emailsRaw, limit, cursor, dryRun, yes, provider };
}

/** Public reset links + email HTML: prefer explicit prod URL so local NEXT_PUBLIC_APP_URL does not leak into batch emails. */
function appBaseUrl(): string {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

async function loadSentProfileIds(supabase: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("password_reset_sends")
      .select("profile_id")
      .eq("status", "sent")
      .order("sent_at", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) ids.add(r.profile_id as string);
    if (data.length < page) break;
    from += page;
  }
  return ids;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendWithRetries(
  fn: () => Promise<{ ok: boolean; messageId?: string; error?: string }>
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  let last: { ok: boolean; messageId?: string; error?: string } = { ok: false, error: "no attempt" };
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    last = await fn();
    if (last.ok) return last;
    await sleep(1000 * Math.pow(2, attempt));
  }
  return last;
}

async function sendBrandedPasswordReset(
  supabase: SupabaseClient,
  email: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const base = appBaseUrl();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${base}/auth/reset-password` },
  });
  if (error || !data?.properties?.action_link) {
    return { ok: false, error: error?.message ?? "generateLink failed" };
  }
  const resetUrl = data.properties.action_link;
  const html = resetPasswordHtml(resetUrl, { appName: "Never Strangers", appUrl: base });
  const subject = "Reset your Never Strangers password";

  const result = await sendEmail({ to: email, subject, html });
  if (result.status === "error") {
    return { ok: false, error: result.error ?? "email send failed" };
  }
  return { ok: true, messageId: result.id };
}

async function confirmInteractive(opts: {
  batch: string;
  count: number;
  sampleEmails: string[];
  dryRun: boolean;
  yes: boolean;
}): Promise<void> {
  if (opts.dryRun || opts.yes) return;
  if (!input.isTTY) {
    console.error("Not a TTY: pass --yes to send, or use --dry-run.");
    process.exit(1);
  }
  console.log("\n── Confirm send ──");
  console.log(`  Batch:           ${opts.batch}`);
  console.log(`  Recipients:      ${opts.count}`);
  console.log(`  First 5 emails:  ${opts.sampleEmails.slice(0, 5).join(", ") || "—"}`);
  console.log(`  Filter:          approved profiles only; already-sent excluded.`);
  const rl = readline.createInterface({ input, output });
  const ans = await rl.question('\nType "yes" to continue: ');
  await rl.close();
  if (ans.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
}

async function fetchBatchCandidates(
  supabase: SupabaseClient,
  limit: number,
  cursorIso: string | null
): Promise<Recipient[]> {
  const { data, error } = await supabase.rpc("list_approved_password_reset_batch", {
    p_limit: limit,
    p_cursor: cursorIso,
  });
  if (error) throw error;
  return (data ?? []) as Recipient[];
}

async function inferBatch2Cursor(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("min_registered_at_batch1_password_resets");
  if (error) throw error;
  if (data == null) {
    throw new Error(
      "Could not infer batch2 cursor: no successful batch1 sends found. Run batch1 first or pass --cursor."
    );
  }
  return new Date(data as string).toISOString();
}

function nextCursorFromRecipients(rows: Recipient[]): string | null {
  if (!rows.length) return null;
  let min = Infinity;
  for (const r of rows) {
    const t = new Date(r.registered_at).getTime();
    if (!Number.isNaN(t) && t < min) min = t;
  }
  if (min === Infinity) return null;
  return new Date(min).toISOString();
}

async function resolveBatch0(
  supabase: SupabaseClient,
  emailsInput: string[],
  sentSet: Set<string>
): Promise<{ recipients: Recipient[]; stats: Partial<Stats> }> {
  const normalized = [...new Set(emailsInput.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const stats: Partial<Stats> = {
    skipped_not_found: 0,
    skipped_not_approved: 0,
    skipped_already_sent: 0,
    skipped_invalid_email: 0,
  };

  for (const e of normalized) {
    if (!e.includes("@")) stats.skipped_invalid_email!++;
  }
  const validEmails = normalized.filter((e) => e.includes("@"));

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id,email,status,wp_registered_at,created_at,name,full_name,display_name")
    .in("email", validEmails);

  if (error) throw error;

  const byEmail = new Map<string, (typeof rows)[0]>();
  for (const r of rows ?? []) {
    if (r.email) byEmail.set(String(r.email).toLowerCase().trim(), r);
  }

  const recipients: Recipient[] = [];

  for (const em of validEmails) {
    const p = byEmail.get(em);
    if (!p) {
      stats.skipped_not_found!++;
      continue;
    }
    if (p.status !== "approved") {
      stats.skipped_not_approved!++;
      continue;
    }
    if (sentSet.has(p.id)) {
      stats.skipped_already_sent!++;
      continue;
    }
    const registered_at = (p.wp_registered_at ?? p.created_at) as string;
    recipients.push({
      id: p.id,
      email: String(p.email),
      registered_at,
      name: p.name as string | null,
      full_name: p.full_name as string | null,
      display_name: p.display_name as string | null,
    });
  }

  return { recipients, stats };
}

function writeReport(
  batch: string,
  stats: Stats,
  nextCursor: string | null,
  extra: Record<string, unknown>
) {
  const dir = path.join(__dirname, ".seed-output");
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `password-resets-${batch}-${ts}.json`);
  const payload = { batch, finishedAt: new Date().toISOString(), stats, nextCursor, ...extra };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nReport written: ${file}`);
}

async function main() {
  const { batch, emailsRaw, limit, cursor, dryRun, yes, provider } = parseArgs(process.argv.slice(2));

  if (!batch || !["batch0", "batch1", "batch2"].includes(batch)) {
    console.error('Missing or invalid --batch (use batch0 | batch1 | batch2)');
    process.exit(1);
  }

  if (batch === "batch0" && !emailsRaw) {
    console.error("batch0 requires --emails \"a@x.com,b@y.com\"");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is required.");
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is required (to read approved profiles and send logs). For a no-DB preview, use your Supabase project key even with --dry-run."
    );
    process.exit(1);
  }

  if (provider !== "supabase_auth") {
    console.error('Only --provider supabase_auth is supported for now.');
    process.exit(1);
  }

  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats: Stats = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped_not_found: 0,
    skipped_not_approved: 0,
    skipped_already_sent: 0,
    skipped_invalid_email: 0,
  };

  let recipients: Recipient[] = [];
  let batchLabel = batch;

  const sentSet = await loadSentProfileIds(supabase);

  if (batch === "batch0") {
    const emailsList = emailsRaw!.split(/[,;\n]+/).map((s) => s.trim());
    const { recipients: r0, stats: s0 } = await resolveBatch0(supabase, emailsList, sentSet);
    Object.assign(stats, s0);
    recipients = r0;
  } else {
    const defaultLimit = batch === "batch1" ? DEFAULT_BATCH1_LIMIT : DEFAULT_BATCH2_LIMIT;
    const lim = limit && limit > 0 ? limit : defaultLimit;

    let cursorIso: string | null = null;
    if (batch === "batch2") {
      if (cursor) {
        cursorIso = new Date(cursor).toISOString();
      } else {
        cursorIso = await inferBatch2Cursor(supabase);
        console.log(`Auto batch2 cursor (from batch1 sends): ${cursorIso}`);
      }
    }

    recipients = await fetchBatchCandidates(supabase, lim, batch === "batch2" ? cursorIso : null);
  }

  console.log(`\n── Password reset batch: ${batchLabel} ──`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Recipients to attempt: ${recipients.length}`);

  await confirmInteractive({
    batch: batchLabel,
    count: recipients.length,
    sampleEmails: recipients.map((r) => r.email),
    dryRun,
    yes,
  });

  const nextCursor = nextCursorFromRecipients(recipients);

  if (dryRun) {
    console.log("\n── Dry run (no sends, no DB log rows) ──");
    console.log(JSON.stringify({ ...stats, attempted: recipients.length }, null, 2));
    if (nextCursor) console.log(`Next cursor (oldest registered_at in this batch): ${nextCursor}`);
    writeReport(batchLabel, { ...stats, attempted: recipients.length }, nextCursor, { dryRun: true });
    return;
  }

  for (const r of recipients) {
    stats.attempted++;
    const result = await sendWithRetries(() => sendBrandedPasswordReset(supabase, r.email));

    if (result.ok) {
      const { error: insErr } = await supabase.from("password_reset_sends").insert({
        profile_id: r.id,
        email: r.email,
        batch_label: batchLabel,
        provider: "supabase_auth",
        provider_message_id: result.messageId ?? null,
        status: "sent",
        error: null,
      });
      if (insErr) {
        console.error(`[log] insert sent failed for ${r.email}:`, insErr.message);
        stats.failed++;
      } else {
        stats.sent++;
      }
    } else {
      await supabase.from("password_reset_sends").insert({
        profile_id: r.id,
        email: r.email,
        batch_label: batchLabel,
        provider: "supabase_auth",
        provider_message_id: null,
        status: "failed",
        error: result.error ?? "unknown",
      });
      stats.failed++;
      console.warn(`  Failed: ${r.email} — ${result.error}`);
    }

    await sleep(RATE_MS);
  }

  console.log("\n── Summary ──");
  console.log(`  attempted:              ${stats.attempted}`);
  console.log(`  sent:                   ${stats.sent}`);
  console.log(`  failed:                 ${stats.failed}`);
  console.log(`  skipped_not_found:       ${stats.skipped_not_found}`);
  console.log(`  skipped_not_approved:    ${stats.skipped_not_approved}`);
  console.log(`  skipped_already_sent:    ${stats.skipped_already_sent}`);
  console.log(`  skipped_invalid_email:   ${stats.skipped_invalid_email}`);
  if (nextCursor) {
    console.log(`  next cursor (oldest in batch): ${nextCursor}`);
  }

  writeReport(batchLabel, stats, nextCursor, { provider });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
