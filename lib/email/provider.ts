/**
 * Email provider abstraction.
 * EMAIL_PROVIDER=mock      → logs to console (default / CI)
 * EMAIL_PROVIDER=resend    → sends via Resend API (requires RESEND_API_KEY)
 * EMAIL_PROVIDER=enveloped → sends via Enveloped API (requires ENVLOPED_API_KEY)
 *
 * Sender name/address: loaded from email_template_overrides key "_sender"
 * (subject = display name, body_html = email address).
 * Falls back to EMAIL_FROM env var, then hardcoded default.
 *
 * Rollback: set EMAIL_PROVIDER=resend (or mock) in env — no code changes needed.
 */

import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const DEFAULT_SENDER_NAME = "Never Strangers";
const DEFAULT_SENDER_EMAIL = "hello@thisisneverstrangers.com";

async function getSenderAddress(): Promise<string> {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  try {
    const supabase = getServiceSupabaseClient();
    const { data } = await supabase
      .from("email_template_overrides")
      .select("subject, body_html")
      .eq("key", "_sender")
      .maybeSingle();
    if (data) {
      const name = data.subject?.trim() || DEFAULT_SENDER_NAME;
      const email = data.body_html?.trim() || DEFAULT_SENDER_EMAIL;
      return `${name} <${email}>`;
    }
  } catch {}
  return `${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`;
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  id?: string;
  status: "sent" | "mock" | "error";
  provider?: string;
  error?: string;
};

// ─── Resend ──────────────────────────────────────────────────────────────────

async function sendViaResend(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — falling back to mock");
    return sendViaMock(opts);
  }

  const fromAddress = await getSenderAddress();

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      const msg =
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message: string }).message
          : JSON.stringify(error);
      console.error("[email:resend] send error:", msg);
      return { status: "error", provider: "resend", error: msg };
    }
    console.log(`[email:resend] sent id=${data?.id} to=${opts.to}`);
    return { id: data?.id, status: "sent", provider: "resend" };
  } catch (err) {
    console.error("[email:resend] unexpected error:", err);
    return { status: "error", provider: "resend", error: String(err) };
  }
}

// ─── Enveloped ───────────────────────────────────────────────────────────────

async function sendViaEnveloped(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.ENVLOPED_API_KEY;
  if (!apiKey) {
    const isDev = process.env.NODE_ENV !== "production";
    console.warn("[email] ENVLOPED_API_KEY not set —", isDev ? "falling back to mock" : "email not sent");
    if (isDev) return sendViaMock(opts);
    return { status: "error", provider: "enveloped", error: "ENVLOPED_API_KEY not configured" };
  }

  const fromAddress = await getSenderAddress();

  try {
    const res = await fetch("https://api.envloped.com/v1/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    const body = await res.json() as { success?: boolean; messageId?: string; error?: string; message?: string };

    if (!res.ok || body.success === false) {
      const msg = body.error ?? body.message ?? `HTTP ${res.status}`;
      console.error("[email:enveloped] send error:", msg);
      return { status: "error", provider: "enveloped", error: msg };
    }

    console.log(`[email:enveloped] sent messageId=${body.messageId} to=${opts.to}`);
    return { id: body.messageId, status: "sent", provider: "enveloped" };
  } catch (err) {
    console.error("[email:enveloped] unexpected error:", err);
    return { status: "error", provider: "enveloped", error: String(err) };
  }
}

// ─── Mock ────────────────────────────────────────────────────────────────────

function sendViaMock(opts: SendEmailOptions): SendEmailResult {
  console.log(
    `[email:mock] to=${opts.to} subject="${opts.subject}"\n` +
      opts.html.replace(/<[^>]+>/g, "").slice(0, 300)
  );
  return { status: "mock", provider: "mock" };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase();
  switch (provider) {
    case "resend":
      return sendViaResend(opts);
    case "enveloped":
      return sendViaEnveloped(opts);
    default:
      return sendViaMock(opts);
  }
}
