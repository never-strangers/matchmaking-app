#!/usr/bin/env node
/**
 * Send branded password reset emails via Resend.
 * Uses Supabase Admin API to generate reset links (no rate limit),
 * then sends via Resend matching the Supabase email template design.
 *
 * Usage:
 *   node scripts/send-reset-passwords.cjs email1@example.com email2@example.com
 *   node scripts/send-reset-passwords.cjs --file emails.txt
 *   node scripts/send-reset-passwords.cjs --dry-run --file emails.txt
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM
 */

const fs    = require("fs");
const path  = require("path");
const https = require("https");

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  for (const fname of [".env.local", ".env"]) {
    try {
      const lines = fs.readFileSync(path.join(__dirname, "..", fname), "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        env[k] = v;
      }
    } catch {}
  }
  return env;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data   = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Email template (from shared module) ───────────────────────────────────────
const APP_NAME = "Never Strangers";
const APP_URL  = "https://app.thisisneverstrangers.com";
const { resetPasswordHtml } = require("../lib/email/resetPasswordHtml.js");


// ── Generate reset link via Supabase Admin API ────────────────────────────────
async function generateResetLink(supabaseUrl, serviceKey, email) {
  const res = await request(
    "POST",
    `${supabaseUrl}/auth/v1/admin/generate_link`,
    { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    {
      type: "recovery",
      email,
      options: { redirect_to: `${APP_URL}/auth/reset-password` },
    }
  );
  if (res.status !== 200) {
    const body = JSON.parse(res.body || "{}");
    throw new Error(body.message || body.msg || `HTTP ${res.status}: ${res.body}`);
  }
  const data = JSON.parse(res.body);
  return { link: data.action_link };
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendViaResend(resendKey, from, to, resetLink) {
  const res = await request(
    "POST",
    "https://api.resend.com/emails",
    { Authorization: `Bearer ${resendKey}` },
    {
      from,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html: resetPasswordHtml(resetLink, { appName: APP_NAME, appUrl: APP_URL }),
    }
  );
  if (res.status !== 200 && res.status !== 201) {
    const body = JSON.parse(res.body || "{}");
    throw new Error(body.message || body.name || `HTTP ${res.status}: ${res.body}`);
  }
  return JSON.parse(res.body);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const env         = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = env.RESEND_API_KEY;
  const emailFrom   = `${APP_NAME} <${env.EMAIL_FROM || "hello@thisisneverstrangers.com"}>`;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!resendKey) {
    console.error("❌ Missing RESEND_API_KEY");
    process.exit(1);
  }

  const args    = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");

  let emails = [];
  if (fileIdx >= 0) {
    const filePath = args[fileIdx + 1];
    if (!filePath) { console.error("❌ --file requires a path"); process.exit(1); }
    emails = fs.readFileSync(filePath, "utf8")
      .split("\n")
      .map(l => l.trim().toLowerCase())
      .filter(l => l && l.includes("@"));
  } else {
    emails = args
      .filter(a => !a.startsWith("--"))
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@"));
  }

  if (emails.length === 0) {
    console.error("Usage: node scripts/send-reset-passwords.cjs [--dry-run] [--file emails.txt] email1 ...");
    process.exit(1);
  }

  console.log("\n📧 Password Reset Sender (via Resend)");
  console.log(`   from:   ${emailFrom}`);
  console.log(`   emails: ${emails.length}`);
  if (dryRun) console.log("   mode:   DRY RUN");
  console.log();

  const results = { ok: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    process.stdout.write(`[${i + 1}/${emails.length}] ${email} … `);

    if (dryRun) {
      console.log("(dry-run)");
      results.skipped++;
      continue;
    }

    try {
      const { link } = await generateResetLink(supabaseUrl, serviceKey, email);
      await sendViaResend(resendKey, emailFrom, email, link);
      console.log("✅ sent");
      results.ok++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      results.failed++;
    }

    if (i < emails.length - 1) await sleep(100);
  }

  console.log("\n─────────────────────────────");
  console.log(`✅ sent:   ${results.ok}`);
  if (results.failed)  console.log(`❌ failed: ${results.failed}`);
  if (results.skipped) console.log(`⏭  skipped: ${results.skipped} (dry-run)`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
