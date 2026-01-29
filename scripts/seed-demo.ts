import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Cannot seed demo."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("🔎 Fetching invited users for demo...");

  const { data: invited, error } = await supabase
    .from("invited_users")
    .select("id, phone_e164, display_name, role, invite_token")
    .order("phone_e164", { ascending: true });

  if (error) {
    console.error("Error fetching invited_users:", error);
    process.exit(1);
  }

  if (!invited || invited.length === 0) {
    console.log(
      "No invited_users found. Make sure you have applied the 002_demo_core.sql and 003_seed_demo.sql migrations."
    );
    process.exit(0);
  }

  console.log(`\n✅ Found ${invited.length} invited users.\n`);
  console.log("Invite URLs:");
  console.log("============");

  for (const row of invited) {
    const urlWithToken = `${appUrl.replace(/\/$/, "")}/invite/${row.invite_token}`;
    const label = row.display_name || row.phone_e164 || row.id;
    const role = row.role || "user";
    console.log(`- [${role}] ${label} (${row.phone_e164}): ${urlWithToken}`);
  }

  console.log("\nYou can generate QR codes from these URLs for your demo.");
}

main().catch((err) => {
  console.error("Unexpected error in seed-demo:", err);
  process.exit(1);
});

