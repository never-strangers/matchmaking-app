/** Transactional email templates. All return { subject, html }. */

const appName = "Never Strangers";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://thisisneverstrangers.com";

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6">
<tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

<!-- Header -->
<tr><td style="background:#1a1a1a;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
  <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;font-style:italic">never</span><br>
  <span style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:700;color:#fff;letter-spacing:-0.5px">Strangers</span>
</td></tr>

<!-- Body -->
<tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e8e5e0;border-right:1px solid #e8e5e0">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="background:#ffffff;padding:0 32px 28px;border-left:1px solid #e8e5e0;border-right:1px solid #e8e5e0;border-bottom:1px solid #e8e5e0;border-radius:0 0 12px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="border-top:1px solid #eee;padding-top:20px;text-align:center">
    <p style="margin:0 0 4px;font-size:12px;color:#999">${appName}</p>
    <a href="${appUrl}" style="font-size:12px;color:#b5703a;text-decoration:none">${appUrl}</a>
  </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0">
  <a href="${href}" style="background:#b5703a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">${label}</a>
</div>`;
}

export type EmailTemplate = {
  subject: string;
  html: string;
};

/* ── Account lifecycle ────────────────────────────────────── */

export function applicationReceivedEmail(firstName: string): EmailTemplate {
  return {
    subject: `We've received your application — ${appName}`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Hey ${firstName || "there"} 👋</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Thanks for applying to <strong>${appName}</strong>! Your application is now under review.</p>
<p style="color:#444;line-height:1.6;font-size:15px">We'll let you know as soon as our team makes a decision — usually within a day or two.</p>
<p style="color:#444;line-height:1.6;font-size:15px">In the meantime, feel free to <a href="${appUrl}/profile" style="color:#b5703a;font-weight:600">complete your profile</a>.</p>
<p style="color:#444;margin-top:24px;font-size:15px">See you soon,<br><strong>The ${appName} Team</strong></p>`),
  };
}

export function accountApprovedEmail(
  firstName: string,
  city: string
): EmailTemplate {
  return {
    subject: `You're in! Welcome to ${appName} ✨`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Welcome, ${firstName || "friend"} 🎉</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Your <strong>${appName}</strong> application for <strong>${city}</strong> has been <span style="color:#2a7a4b;font-weight:600">approved</span>.</p>
<p style="color:#444;line-height:1.6;font-size:15px">You can now browse upcoming events and connect with people in your city.</p>
${ctaButton(`${appUrl}/events`, "Browse Events →")}
<p style="color:#444;margin-top:24px;font-size:15px">So glad to have you,<br><strong>The ${appName} Team</strong></p>`),
  };
}

export function accountRejectedEmail(firstName: string): EmailTemplate {
  return {
    subject: `Your ${appName} application`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Hi ${firstName || "there"},</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Thank you for your interest in <strong>${appName}</strong>.</p>
<p style="color:#444;line-height:1.6;font-size:15px">After careful review, we're unable to approve your application at this time. Our community is selective and spaces are limited.</p>
<p style="color:#444;line-height:1.6;font-size:15px">We appreciate your understanding and wish you all the best.</p>
<p style="color:#444;margin-top:24px;font-size:15px">Warm regards,<br><strong>The ${appName} Team</strong></p>`),
  };
}

export function passwordResetEmail(
  firstName: string,
  resetUrl: string
): EmailTemplate {
  return {
    subject: `Reset your ${appName} password`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Password reset</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Hi ${firstName || "there"}, we received a request to reset your <strong>${appName}</strong> password.</p>
${ctaButton(resetUrl, "Reset Password →")}
<p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>`),
  };
}

/* ── Events ───────────────────────────────────────────────── */

export function rsvpConfirmationEmail(
  firstName: string,
  eventTitle: string,
  eventDate: string
): EmailTemplate {
  return {
    subject: `You're going to ${eventTitle} 🎟️`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">See you there, ${firstName || "friend"}!</h2>
<div style="background:#faf9f6;border-radius:8px;padding:20px;margin:16px 0;border:1px solid #e8e5e0">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Event</p>
  <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#1a1a1a">${eventTitle}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">When</p>
  <p style="margin:0;font-size:15px;color:#444">${eventDate}</p>
</div>
<p style="color:#444;line-height:1.6;font-size:15px">Your spot is confirmed. We can't wait to see you!</p>
${ctaButton(`${appUrl}/events`, "View Event Details →")}
<p style="color:#444;margin-top:24px;font-size:15px">See you soon,<br><strong>The ${appName} Team</strong></p>`),
  };
}

export function paymentConfirmationEmail(
  firstName: string,
  eventTitle: string,
  eventDate: string,
  amountFormatted: string
): EmailTemplate {
  return {
    subject: `Payment confirmed for ${eventTitle} ✅`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Payment confirmed!</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Hi ${firstName || "there"}, your payment has been received. You're all set.</p>
<div style="background:#faf9f6;border-radius:8px;padding:20px;margin:16px 0;border:1px solid #e8e5e0">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Event</p>
  <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#1a1a1a">${eventTitle}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">When</p>
  <p style="margin:0 0 12px;font-size:15px;color:#444">${eventDate}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Amount Paid</p>
  <p style="margin:0;font-size:15px;font-weight:600;color:#2a7a4b">${amountFormatted}</p>
</div>
${ctaButton(`${appUrl}/events`, "View Event Details →")}
<p style="color:#444;margin-top:24px;font-size:15px">See you there,<br><strong>The ${appName} Team</strong></p>`),
  };
}

/* ── Matching & Messaging ─────────────────────────────────── */

export function matchesRevealedEmail(
  firstName: string,
  eventTitle: string,
  matchCount: number
): EmailTemplate {
  return {
    subject: `Your matches from ${eventTitle} are here 💌`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Hi ${firstName || "there"} 👋</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Your matches from <strong>${eventTitle}</strong> are now live.</p>
<p style="color:#444;line-height:1.6;font-size:15px">You've been matched with <strong>${matchCount} ${matchCount === 1 ? "person" : "people"}</strong>. Go say hi!</p>
${ctaButton(`${appUrl}/match`, "See Your Matches →")}
<p style="color:#444;margin-top:24px;font-size:15px">With love,<br><strong>The ${appName} Team</strong></p>`),
  };
}

export function newMessageEmail(
  firstName: string,
  senderName: string
): EmailTemplate {
  return {
    subject: `${senderName} sent you a message on ${appName}`,
    html: base(`
<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">You've got a message 💬</h2>
<p style="color:#444;line-height:1.6;font-size:15px">Hi ${firstName || "there"}, <strong>${senderName}</strong> sent you a message on ${appName}.</p>
${ctaButton(`${appUrl}/messages`, "Read Message →")}`),
  };
}
