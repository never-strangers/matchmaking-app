/**
 * Email provider abstraction.
 * EMAIL_PROVIDER=mock  → logs to console (default / CI)
 * EMAIL_PROVIDER=resend → sends via Resend API (requires RESEND_API_KEY)
 */

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

  const fromAddress =
    process.env.EMAIL_FROM ?? "Never Strangers <hello@neverstrangers.com>";

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
      return { status: "error", error: String(error) };
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
