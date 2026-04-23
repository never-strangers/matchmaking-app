/**
 * Idempotent email enqueue helper.
 * Writes a row to email_log (unique on idempotency_key) then sends via provider.
 * Respects the per-template enabled toggle stored in email_template_overrides.
 * Safe to call fire-and-forget — never throws.
 */

import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { sendEmail } from "@/lib/email/provider";
import type { EmailTemplate } from "@/lib/email/templates";

async function isTemplateEnabled(template: string): Promise<boolean> {
  try {
    const supabase = getServiceSupabaseClient();
    const { data } = await supabase
      .from("email_template_overrides")
      .select("enabled")
      .eq("key", template)
      .maybeSingle();
    // No override row = default enabled
    if (!data) return true;
    return data.enabled ?? true;
  } catch {
    return true; // fail open — don't silently block emails on DB error
  }
}

export async function enqueueEmail(
  idempotencyKey: string,
  template: string,
  to: string,
  emailTemplate: EmailTemplate
): Promise<void> {
  try {
    // Check if this template is enabled before doing anything
    const enabled = await isTemplateEnabled(template);
    if (!enabled) {
      console.log(`[email] template=${template} is disabled — skipping send to ${to}`);
      return;
    }

    const supabase = getServiceSupabaseClient();

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
