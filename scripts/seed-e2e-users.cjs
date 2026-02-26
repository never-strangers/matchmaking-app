/**
 * Seed predefined E2E users (pending, approved, rejected).
 * Run once before E2E tests: npm run seed:e2e
 * Uses SUPABASE_SERVICE_ROLE_KEY (admin) only at seed time; tests do not use admin.
 */
require("dotenv").config({ path: ".env.test" });
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const E2E_USERS = {
  pending: {
    email: "e2e-pending@example.com",
    password: "E2ePending1!",
    status: "pending_verification",
  },
  approved: {
    email: "e2e-approved@example.com",
    password: "E2eApproved1!",
    status: "approved",
  },
  rejected: {
    email: "e2e-rejected@example.com",
    password: "E2eRejected1!",
    status: "rejected",
  },
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.test or .env.local."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("Seeding E2E users (pending, approved, rejected)...\n");

  for (const [label, user] of Object.entries(E2E_USERS)) {
    const email = user.email.trim().toLowerCase();
    const name = email.split("@")[0].slice(0, 50) || `user_${label}`;

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: user.password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message && authError.message.includes("already been registered")) {
        console.log(`  ${label}: ${email} already exists, updating profile status...`);
        let existingUser = null;
        for (let page = 1; page <= 10; page++) {
          const { data: listData } = await supabase.auth.admin.listUsers({
            page,
            perPage: 100,
          });
          existingUser = listData?.users?.find(
            (u) => (u.email || "").toLowerCase() === email
          );
          if (existingUser || !listData?.users?.length) break;
        }
        if (existingUser) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: existingUser.id,
                name: name,
                display_name: name,
                full_name: name,
                email: email,
                city: "sg",
                status: user.status,
                instagram: label === "rejected" ? "e2e_rejected" : null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );
          if (profileError) {
            console.error(`  ${label} profile update failed:`, profileError.message);
          } else {
            console.log(`  ${label}: profile status set to ${user.status}`);
          }
        } else {
          console.error(`  ${label}: could not find existing user by email`);
        }
        continue;
      }
      console.error(`  ${label} create failed:`, authError.message);
      continue;
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error(`  ${label}: no user id returned`);
      continue;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        name,
        display_name: name,
        full_name: name,
        email,
        city: "sg",
        status: user.status,
        instagram: label === "rejected" ? "e2e_rejected" : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error(`  ${label} profile failed:`, profileError.message);
    } else {
      console.log(`  ${label}: ${email} (${user.status})`);
    }
  }

  console.log("\nDone. Run E2E tests with: npm run test:e2e");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
