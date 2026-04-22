/**
 * Email provider abstraction.
 * EMAIL_PROVIDER=mock  → logs to console (default / CI)
 * EMAIL_PROVIDER=resend → sends via Resend API (requires RESEND_API_KEY)
 *
 * Sender name/address: loaded from email_template_overrides key "_sender"
 * (subject = display name, body_html = email address).
 * Falls back to EMAIL_FROM env var, then hardcoded default.
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
  error?: string;
};

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
      const msg = typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : JSON.stringify(error);
      return { status: "error", error: msg };
    }
    return { id: data?.id, status: "sent" };
  } catch (err) {
    return { status: "error", error: String(err) };
  }
}

function sendViaMock(opts: SendEmailOptions): SendEmailResult {
  console.log(
    `[email:mock] to=${opts.to} subject="${opts.subject}"\n` +
      opts.html.replace(/<[^>]+>/g, "").slice(0, 300)
  );
  return { status: "mock" };
}

export async function sendEmail(
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase();
  if (provider === "resend") {
    return sendViaResend(opts);
  }
  return sendViaMock(opts);
}
