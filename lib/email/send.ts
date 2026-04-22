/**
 * Idempotent email enqueue helper.
 * Writes a row to email_log (unique on idempotency_key) then sends via provider.
 * Safe to call fire-and-forget — never throws.
 */

import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { sendEmail } from "@/lib/email/provider";
import type { EmailTemplate } from "@/lib/email/templates";

export async function enqueueEmail(
  idempotencyKey: string,
  template: string,
  to: string,
  emailTemplate: EmailTemplate
): Promise<void> {
  try {
    const supabase = getServiceSupabaseClient();

    // Insert row first — if idempotency_key already exists the upsert is a no-op
    const { error: insertError } = await supabase.from("email_log").upsert(
      {
        idempotency_key: idempotencyKey,
        template,
        to_email: to,
        subject: emailTemplate.subject,
        status: "pending",
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    );

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate")
      ) {
        return;
      }
      console.error("[email] Failed to insert email_log row:", insertError);
    }

    const result = await sendEmail({ to, subject: emailTemplate.subject, html: emailTemplate.html });

    console.log(`[email] template=${template} provider=${result.provider ?? "?"} ok=${result.status !== "error"} id=${result.id ?? "-"}`);

    await supabase
      .from("email_log")
      .update({
        status: result.status,
        provider_id: result.id ?? null,
        provider: result.provider ?? null,
        error_message: result.error ?? null,
      })
      .eq("idempotency_key", idempotencyKey);
  } catch (err) {
    console.error("[email] enqueueEmail error:", err);
  }
}
