import { execSync } from "child_process";

// Global Playwright setup: reset + seed Supabase test data once before all tests.
export default async function globalSetup() {
  const password = process.env.E2E_SEED_PASSWORD || process.env.SEED_USER_PASSWORD;
  if (!password) {
    // Allow tests to run (they may skip if seed output is missing), but make it obvious in logs.
    console.warn(
      "[globalSetup] SEED_USER_PASSWORD / E2E_SEED_PASSWORD not set; skipping `npm run reset:test-data`."
    );
    return;
  }

  execSync("npm run reset:test-data", {
    stdio: "inherit",
    env: {
      ...process.env,
      SEED_USER_PASSWORD: password,
      SEED_CONFIRM: "true",
    },
  });
}

