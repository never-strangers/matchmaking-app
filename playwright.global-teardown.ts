import { execSync } from "child_process";

// Global Playwright teardown: clean up Supabase test data after all tests.
export default async function globalTeardown() {
  try {
    execSync("npm run cleanup:test-data", {
      stdio: "inherit",
      env: {
        ...process.env,
      },
    });
  } catch (err) {
    console.warn("[globalTeardown] cleanup:test-data failed (safe to ignore in local runs)", err);
  }
}

