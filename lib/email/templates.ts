/** Transactional email templates. All return { subject, html }. */

const appName = "Never Strangers";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://neverstrangers.com";

function base(content: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#faf9f6;margin:0;padding:32px 16px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
${content}
<hr style="border:none;border-top:1px solid #eee;margin:32px 0">
<p style="font-size:12px;color:#999;text-align:center">${appName} · <a href="${appUrl}" style="color:#999">${appUrl}</a></p>
</div></body></html>`;
}

export type EmailTemplate = {
  subject: string;
  html: string;
};

/** Sent to the user right after they submit their registration. */
export function applicationReceivedEmail(firstName: string): EmailTemplate {
  return {
    subject: `We've received your application — ${appName}`,
    html: base(`
<h2 style="margin:0 0 16px">Hey ${firstName || "there"} 👋</h2>
<p style="color:#444;line-height:1.6">Thanks for applying to <strong>${appName}</strong>! Your application is now under review.</p>
<p style="color:#444;line-height:1.6">We'll let you know as soon as our team makes a decision — usually within a day or two.</p>
<p style="color:#444;line-height:1.6">In the meantime, feel free to <a href="${appUrl}/profile" style="color:#b5703a">complete your profile</a>.</p>
<p style="color:#444;margin-top:24px">See you soon,<br><strong>The ${appName} Team</strong></p>`),
  };
}

/** Sent when an admin approves the user's profile. */
export function accountApprovedEmail(
  firstName: string,
  city: string
): EmailTemplate {
  return {
    subject: `You're in! Welcome to ${appName} ✨`,
    html: base(`
<h2 style="margin:0 0 16px">Welcome, ${firstName || "friend"} 🎉</h2>
<p style="color:#444;line-height:1.6">Your <strong>${appName}</strong> application for <strong>${city}</strong> has been <span style="color:#2a7a4b;font-weight:600">approved</span>.</p>
<p style="color:#444;line-height:1.6">You can now browse upcoming events and connect with people in your city.</p>
<div style="text-align:center;margin:28px 0">
  <a href="${appUrl}/events" style="background:#b5703a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">Browse Events →</a>
</div>
<p style="color:#444;margin-top:24px">So glad to have you,<br><strong>The ${appName} Team</strong></p>`),
  };
}

/** Sent when an admin rejects the user's profile. */
export function accountRejectedEmail(firstName: string): EmailTemplate {
  return {
    subject: `Your ${appName} application`,
    html: base(`
<h2 style="margin:0 0 16px">Hi ${firstName || "there"},</h2>
<p style="color:#444;line-height:1.6">Thank you for your interest in <strong>${appName}</strong>.</p>
<p style="color:#444;line-height:1.6">After careful review, we're unable to approve your application at this time. Our community is selective and spaces are limited.</p>
<p style="color:#444;line-height:1.6">We appreciate your understanding and wish you all the best.</p>
<p style="color:#444;margin-top:24px">Warm regards,<br><strong>The ${appName} Team</strong></p>`),
  };
}

/** Sent when user requests a password reset (supplement to Supabase's own email). */
export function passwordResetEmail(
  firstName: string,
  resetUrl: string
): EmailTemplate {
  return {
    subject: `Reset your ${appName} password`,
    html: base(`
<h2 style="margin:0 0 16px">Password reset</h2>
<p style="color:#444;line-height:1.6">Hi ${firstName || "there"}, we received a request to reset your <strong>${appName}</strong> password.</p>
<div style="text-align:center;margin:28px 0">
  <a href="${resetUrl}" style="background:#b5703a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">Reset Password →</a>
</div>
<p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>`),
  };
}

/** Sent when a match round is revealed for an event the user attended. */
export function matchesRevealedEmail(
  firstName: string,
  eventTitle: string,
  matchCount: number
): EmailTemplate {
  return {
    subject: `Your matches from ${eventTitle} are here 💌`,
    html: base(`
<h2 style="margin:0 0 16px">Hi ${firstName || "there"} 👋</h2>
<p style="color:#444;line-height:1.6">Your matches from <strong>${eventTitle}</strong> are now live.</p>
<p style="color:#444;line-height:1.6">You've been matched with <strong>${matchCount} ${matchCount === 1 ? "person" : "people"}</strong>. Go say hi!</p>
<div style="text-align:center;margin:28px 0">
  <a href="${appUrl}/match" style="background:#b5703a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">See Your Matches →</a>
</div>
<p style="color:#444;margin-top:24px">With love,<br><strong>The ${appName} Team</strong></p>`),
  };
}

/** Sent when another user sends the first message in a conversation. */
export function newMessageEmail(
  firstName: string,
  senderName: string
): EmailTemplate {
  return {
    subject: `${senderName} sent you a message on ${appName}`,
    html: base(`
<h2 style="margin:0 0 16px">You've got a message 💬</h2>
<p style="color:#444;line-height:1.6">Hi ${firstName || "there"}, <strong>${senderName}</strong> sent you a message on ${appName}.</p>
<div style="text-align:center;margin:28px 0">
  <a href="${appUrl}/messages" style="background:#b5703a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">Read Message →</a>
</div>`),
  };
}
