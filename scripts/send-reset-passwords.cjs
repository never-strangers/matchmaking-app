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

// ── Email template (matches Supabase custom template design) ──────────────────
const APP_NAME = "Never Strangers";
const APP_URL  = "https://app.thisisneverstrangers.com";

function emailHtml(resetUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px">

        <!-- Logo -->
        <tr><td style="text-align:center;padding-bottom:24px">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;font-style:italic;color:#c0392b;letter-spacing:-0.5px">Never<br>Strangers</span>
        </td></tr>

        <!-- Intro text -->
        <tr><td style="text-align:center;padding-bottom:20px">
          <p style="margin:0;font-size:16px;color:#374151;line-height:1.6">
            You asked to reset your password. Here's your link &mdash; it expires in <strong>24 hours</strong>.
          </p>
        </td></tr>

        <!-- Dark card -->
        <tr><td style="background:#111827;border-radius:16px;padding:40px 36px;text-align:center">

          <!-- Pill -->
          <div style="display:inline-block;background:#c0392b;color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:20px">
            PASSWORD RESET
          </div>

          <!-- Heading -->
          <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;font-style:italic;color:#ffffff;line-height:1.2">
            Set your new<br>password.
          </h1>

          <!-- Body -->
          <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6">
            Click the button below to choose a new password and<br>regain access to your ${APP_NAME} account.
          </p>

          <!-- CTA -->
          <a href="${resetUrl}" style="display:inline-block;background:#c0392b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;margin-bottom:24px">
            Reset Password &rarr;
          </a>

          <!-- App URL -->
          <p style="margin:0;font-size:12px;color:#6b7280">${APP_URL}</p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">
            If you didn't request a password reset, you can safely ignore this email &mdash; your password won't change.
          </p>
          <p style="margin:0;font-size:13px;color:#9ca3af">
            You're receiving this because you have an account on ${APP_NAME}.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
      html: emailHtml(resetLink),
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
