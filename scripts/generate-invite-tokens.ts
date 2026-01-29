/**
 * Generate new invite tokens and insert into invited_users.
 * Run: npx tsx scripts/generate-invite-tokens.ts [count]
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env (e.g. .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const count = Math.min(Math.max(parseInt(process.argv[2] || "10", 10) || 10, 1), 100);

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Get max "guest number" from existing display_name like "Guest 30" to avoid clashes
  const { data: existing } = await supabase
    .from("invited_users")
    .select("display_name, phone_e164");
  let nextNum = 1;
  const phoneSet = new Set<string>();
  (existing || []).forEach((r: { display_name?: string; phone_e164?: string }) => {
    const m = (r.display_name || "").match(/^Guest (\d+)$/);
    if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1);
    if (r.phone_e164) phoneSet.add(r.phone_e164);
  });
  let nextPhone = 91000000;
  while (phoneSet.has(`+65${nextPhone}`) && nextPhone < 99999999) nextPhone++;

  const rows: { id: string; phone_e164: string; display_name: string; role: string; invite_token: string }[] = [];
  for (let i = 0; i < count; i++) {
    const token = crypto.randomUUID();
    const phone = `+65${nextPhone + i}`;
    rows.push({
      id: crypto.randomUUID(),
      phone_e164: phone,
      display_name: `Guest ${nextNum + i}`,
      role: "user",
      invite_token: token,
    });
  }

  const { data: inserted, error } = await supabase.from("invited_users").insert(rows).select("invite_token, display_name, phone_e164");

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`\n✅ Created ${inserted?.length ?? 0} new invite(s).\n`);
  console.log("Invite URLs:");
  console.log("============");
  (inserted || []).forEach((row: { invite_token: string; display_name: string; phone_e164: string }) => {
    console.log(`${appUrl.replace(/\/$/, "")}/invite/${row.invite_token}`);
  });
  console.log("\nShare each URL (or its QR) with one user. First open → register → then /events.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
