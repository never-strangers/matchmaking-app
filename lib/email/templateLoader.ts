/**
 * Loads an email template: DB override if exists, otherwise falls back to code default.
 * Interpolates {{var_name}} placeholders in both subject and body_html.
 */

import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import type { EmailTemplate } from "@/lib/email/templates";

export type TemplateMeta = {
  label: string;
  vars: string[];
  requiredVars: string[];
  sampleVars: Record<string, string>;
  defaultSubject: string;
  defaultBodyHtml: string;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://thisisneverstrangers.com";
const appName = "Never Strangers";

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0"><a href="${href}" style="background:#b5703a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">${label}</a></div>`;
}

function emailHeader(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
<tr><td style="background:#1a1a1a;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
  <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;font-style:italic">never</span><br>
  <span style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:700;color:#fff;letter-spacing:-0.5px">Strangers</span>
</td></tr>
<tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e8e5e0;border-right:1px solid #e8e5e0">`;
}

function emailFooter(): string {
  return `</td></tr>
<tr><td style="background:#ffffff;padding:0 32px 28px;border-left:1px solid #e8e5e0;border-right:1px solid #e8e5e0;border-bottom:1px solid #e8e5e0;border-radius:0 0 12px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="border-top:1px solid #eee;padding-top:20px;text-align:center">
    <p style="margin:0 0 4px;font-size:12px;color:#999">${appName}</p>
    <a href="${appUrl}" style="font-size:12px;color:#b5703a;text-decoration:none">${appUrl}</a>
  </td></tr>
  </table>
</td></tr>
</table>`;
}

export const TEMPLATE_META: Record<string, TemplateMeta> = {
  pending_review: {
    label: "Application Received",
    vars: ["first_name"],
    requiredVars: ["first_name"],
    sampleVars: { first_name: "Alex" },
    defaultSubject: `We've received your application — ${appName}`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Hey {{first_name}} 👋</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Thanks for applying to <strong>${appName}</strong>! Your application is now under review.</p>
<p style="color:#444;line-height:1.6;font-size:15px">We'll let you know as soon as our team makes a decision — usually within a day or two.</p>
<p style="color:#444;line-height:1.6;font-size:15px">In the meantime, feel free to <a href="${appUrl}/profile" style="color:#b5703a;font-weight:600">complete your profile</a>.</p>
<p style="color:#444;margin-top:24px;font-size:15px">See you soon,<br><strong>The ${appName} Team</strong></p>
${emailFooter()}`,
  },
  approved: {
    label: "Account Approved",
    vars: ["first_name", "city"],
    requiredVars: ["first_name", "city"],
    sampleVars: { first_name: "Alex", city: "Singapore" },
    defaultSubject: `You're in! Welcome to ${appName} ✨`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Welcome, {{first_name}} 🎉</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Your <strong>${appName}</strong> application for <strong>{{city}}</strong> has been <span style="color:#2a7a4b;font-weight:600">approved</span>.</p>
<p style="color:#444;line-height:1.6;font-size:15px">You can now browse upcoming events and connect with people in your city.</p>
${ctaButton(`${appUrl}/events`, "Browse Events →")}
<p style="color:#444;margin-top:24px;font-size:15px">So glad to have you,<br><strong>The ${appName} Team</strong></p>
${emailFooter()}`,
  },
  rejected: {
    label: "Account Rejected",
    vars: ["first_name"],
    requiredVars: ["first_name"],
    sampleVars: { first_name: "Alex" },
    defaultSubject: `Your ${appName} application`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Hi {{first_name}},</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Thank you for your interest in <strong>${appName}</strong>.</p>
<p style="color:#444;line-height:1.6;font-size:15px">After careful review, we're unable to approve your application at this time. Our community is selective and spaces are limited.</p>
<p style="color:#444;line-height:1.6;font-size:15px">We appreciate your understanding and wish you all the best.</p>
<p style="color:#444;margin-top:24px;font-size:15px">Warm regards,<br><strong>The ${appName} Team</strong></p>
${emailFooter()}`,
  },
  password_reset: {
    label: "Password Reset",
    vars: ["first_name", "reset_url"],
    requiredVars: ["reset_url"],
    sampleVars: {
      first_name: "Alex",
      reset_url: `${appUrl}/reset?token=sample`,
    },
    defaultSubject: `Reset your ${appName} password`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Reset your password</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Hi {{first_name}}, click the button below to reset your password. This link expires in 1 hour.</p>
${ctaButton("{{reset_url}}", "Reset Password →")}
<p style="color:#444;line-height:1.6;font-size:15px">If you didn't request this, you can safely ignore this email.</p>
<p style="color:#444;margin-top:24px;font-size:15px">The ${appName} Team</p>
${emailFooter()}`,
  },
  rsvp_confirmation: {
    label: "RSVP Confirmation",
    vars: ["first_name", "last_name", "event_title", "event_date", "event_start_time", "event_end_time", "event_description"],
    requiredVars: ["first_name", "event_title", "event_date"],
    sampleVars: {
      first_name: "Alex",
      last_name: "Smith",
      event_title: "Speed Friending — Singapore",
      event_date: "Saturday, 10 May 2026",
      event_start_time: "7:00 PM",
      event_end_time: "9:00 PM",
      event_description: "An evening of fun speed friending rounds to meet new people in Singapore.",
    },
    defaultSubject: `You're going to {{event_title}} 🎟️`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">See you there, {{first_name}}!</h2>
<div style="background:#faf9f6;border-radius:8px;padding:20px;margin:16px 0;border:1px solid #e8e5e0">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Event</p>
  <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#1a1a1a">{{event_title}}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">When</p>
  <p style="margin:0 0 12px;font-size:15px;color:#444">{{event_date}} · {{event_start_time}}–{{event_end_time}}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">About</p>
  <p style="margin:0;font-size:15px;color:#444">{{event_description}}</p>
</div>
<p style="color:#444;line-height:1.6;font-size:15px">Your spot is confirmed. We can't wait to see you!</p>
${ctaButton(`${appUrl}/events`, "View Event Details →")}
<p style="color:#444;margin-top:24px;font-size:15px">See you soon,<br><strong>The ${appName} Team</strong></p>
${emailFooter()}`,
  },
  payment_confirmation: {
    label: "Payment Confirmation",
    vars: ["first_name", "event_title", "event_date", "amount_formatted"],
    requiredVars: ["first_name", "event_title", "event_date", "amount_formatted"],
    sampleVars: {
      first_name: "Alex",
      event_title: "Speed Friending — Singapore",
      event_date: "Saturday, 10 May 2026 · 7:00 PM",
      amount_formatted: "SGD 29.00",
    },
    defaultSubject: `Payment confirmed for {{event_title}} ✅`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Payment confirmed!</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Hi {{first_name}}, your payment has been received. You're all set.</p>
<div style="background:#faf9f6;border-radius:8px;padding:20px;margin:16px 0;border:1px solid #e8e5e0">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Event</p>
  <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#1a1a1a">{{event_title}}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">When</p>
  <p style="margin:0 0 12px;font-size:15px;color:#444">{{event_date}}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Amount Paid</p>
  <p style="margin:0;font-size:15px;font-weight:600;color:#2a7a4b">{{amount_formatted}}</p>
</div>
${ctaButton(`${appUrl}/events`, "View Event Details →")}
<p style="color:#444;margin-top:24px;font-size:15px">See you there,<br><strong>The ${appName} Team</strong></p>
${emailFooter()}`,
  },
  matches_revealed: {
    label: "Matches Revealed",
    vars: ["first_name", "event_title", "match_count"],
    requiredVars: ["first_name", "event_title", "match_count"],
    sampleVars: {
      first_name: "Alex",
      event_title: "Speed Friending — Singapore",
      match_count: "3",
    },
    defaultSubject: `Your matches from {{event_title}} are here 💌`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Hi {{first_name}} 👋</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Your matches from <strong>{{event_title}}</strong> are now live.</p>
<p style="color:#444;line-height:1.6;font-size:15px">You've been matched with <strong>{{match_count}} people</strong>. Go say hi!</p>
${ctaButton(`${appUrl}/match`, "See Your Matches →")}
<p style="color:#444;margin-top:24px;font-size:15px">With love,<br><strong>The ${appName} Team</strong></p>
${emailFooter()}`,
  },
  new_message: {
    label: "New Message",
    vars: ["first_name", "sender_name"],
    requiredVars: ["first_name", "sender_name"],
    sampleVars: { first_name: "Alex", sender_name: "Jordan" },
    defaultSubject: `{{sender_name}} sent you a message on ${appName}`,
    defaultBodyHtml: `${emailHeader()}
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">You've got a message 💬</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Hi {{first_name}}, <strong>{{sender_name}}</strong> sent you a message on ${appName}.</p>
${ctaButton(`${appUrl}/messages`, "Read Message →")}
${emailFooter()}`,
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATE_META);

function interpolate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

/** Returns list of {{var}} placeholders found in a string */
export function extractVars(str: string): string[] {
  const matches = str.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/** Returns missing required vars given subject + body */
export function missingRequiredVars(key: string, subject: string, bodyHtml: string): string[] {
  const meta = TEMPLATE_META[key];
  if (!meta) return [];
  const combined = subject + " " + bodyHtml;
  return meta.requiredVars.filter((v) => !combined.includes(`{{${v}}}`));
}

/**
 * Main loader. Call at send time.
 * Checks DB for override, falls back to code default.
 */
export async function loadTemplate(
  key: string,
  vars: Record<string, string>
): Promise<EmailTemplate> {
  try {
    const supabase = getServiceSupabaseClient();
    const { data } = await supabase
      .from("email_template_overrides")
      .select("subject, body_html")
      .eq("key", key)
      .maybeSingle();

    if (data) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://thisisneverstrangers.com";
      const appName = "Never Strangers";
      const allVars = { app_url: appUrl, app_name: appName, ...vars };
      return {
        subject: interpolate(data.subject, allVars),
        html: buildHtmlFromOverride(interpolate(data.body_html, allVars)),
      };
    }
  } catch (err) {
    console.error("[templateLoader] DB lookup failed, using code default:", err);
  }

  // Fall back to meta defaults (placeholder-based)
  const meta = TEMPLATE_META[key];
  const allVars = { app_url: appUrl, app_name: appName, ...vars };
  if (meta) {
    return {
      subject: interpolate(meta.defaultSubject, allVars),
      html: buildHtmlFromOverride(interpolate(meta.defaultBodyHtml, allVars)),
    };
  }
  // Unknown key — return a bare subject+empty body
  console.error(`[templateLoader] Unknown template key: ${key}`);
  return { subject: key, html: buildHtmlFromOverride("") };
}

/** Wraps inner body HTML in the standard branded layout */
function buildHtmlFromOverride(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6">
<tr><td align="center" style="padding:24px 16px">
${bodyHtml}
</td></tr>
</table>
</body></html>`;
}
