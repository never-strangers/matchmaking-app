/**
 * E2E: paid event → questions → check-in → matching → reveal → chat.
 * Uses seeded data from scripts/.seed-output/test-data.json (run npm run reset:test-data first).
 * Option B (CI): E2E_TEST_MODE=true + E2E_SHARED_SECRET for test-only payment confirm.
 * Option A (local): Stripe CLI webhook + real Checkout with card 4242 4242 4242 4242.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { loginUser } from "./authHelpers";

type SeedE2E = {
  paidEventId: string;
  admin: { email: string; profileId: string; passwordHint: string };
  userA: { email: string; profileId: string; passwordHint: string };
  userB: { email: string; profileId: string; passwordHint: string };
};

function loadSeedE2E(): SeedE2E | null {
  const base = path.resolve(process.cwd(), "scripts/.seed-output");
  const fixed = path.join(base, "test-data.json");
  if (fs.existsSync(fixed)) {
    const raw = fs.readFileSync(fixed, "utf8");
    const data = JSON.parse(raw) as { e2e?: SeedE2E };
    return data.e2e ?? null;
  }
  const dir = fs.readdirSync(base, { withFileTypes: true });
  const jsonFiles = dir
    .filter((d) => d.isFile() && d.name.startsWith("test-data-") && d.name.endsWith(".json"))
    .map((d) => path.join(base, d.name))
    .sort()
    .reverse();
  for (const p of jsonFiles) {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw) as { e2e?: SeedE2E };
    if (data.e2e) return data.e2e;
  }
  return null;
}

function getSeedPassword(): string {
  const p =
    process.env.E2E_SEED_PASSWORD ||
    process.env.SEED_USER_PASSWORD;
  if (!p) throw new Error("E2E_SEED_PASSWORD or SEED_USER_PASSWORD required for paid-event-to-chat E2E");
  return p;
}

test.describe("paid event to chat", () => {
  const seed = loadSeedE2E();
  test.skip(!seed, "Seed E2E data not found. Run: SEED_CONFIRM=true SEED_USER_PASSWORD=xxx npm run reset:test-data");

  test("full flow: pay → questions → check-in → matching → reveal → chat", async ({
    browser,
    request,
  }) => {
    const password = getSeedPassword();
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

    const userACreds = { email: seed!.userA.email, password };
    const adminCreds = { email: seed!.admin.email, password };
    const paidEventId = seed!.paidEventId;
    const userAProfileId = seed!.userA.profileId;

    const contextA = await browser.newContext();
    const contextAdmin = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageAdmin = await contextAdmin.newPage();

    try {
      // --- User A: login ---
      await loginUser(pageA, userACreds);
      await pageA.goto("/events");
      await expect(pageA.getByTestId("events-list-container")).toBeVisible({ timeout: 15_000 });

      // --- User A: open paid event and go straight to questions ---
      const eventCard = pageA.getByTestId(`event-card-${paidEventId}`);
      await expect(eventCard).toBeVisible({ timeout: 5000 });

      // For this seeded paid event, the user is already paid but questionnaire-incomplete,
      // so the primary CTA is \"Complete Questions\" (no Stripe flow here).
      const completeBtn = eventCard.getByRole("button", { name: /Complete Questions/i });
      await expect(completeBtn).toBeVisible({ timeout: 5000 });
      await completeBtn.click();

      await expect(pageA).toHaveURL(new RegExp(`/events/${paidEventId}/questions`), {
        timeout: 10_000,
      });

      // --- User A: answer all questions (pre-filled to 3; save) ---
      const submitBtn = pageA.getByTestId("questions-submit");
      await submitBtn.waitFor({ state: "visible", timeout: 8000 });
      await submitBtn.click();

      // After saving, the app redirects back to /events and reflects completion on the card.
      await expect(pageA).toHaveURL(/\/events$/, { timeout: 10_000 });
      const completedEventCard = pageA.getByTestId(`event-card-${paidEventId}`);
      await expect(completedEventCard).toBeVisible({ timeout: 10_000 });
      await expect(
        completedEventCard.getByText(/Questionnaire complete|Questionnaire Complete|✓/)
      ).toBeVisible({ timeout: 10_000 });

      // --- Admin: login, check-in User A, run matching, reveal Round 1 ---
      await loginUser(pageAdmin, adminCreds);
      await pageAdmin.goto(`/admin/events/${paidEventId}`);
      await expect(pageAdmin).toHaveURL(new RegExp(`/admin/events/${paidEventId}`));

      const userARow = pageAdmin.getByTestId(`admin-guest-row-${userAProfileId}`);
      await expect(userARow).toBeVisible({ timeout: 5000 });
      const checkInCell = pageAdmin.getByTestId(`admin-checkin-cell-${userAProfileId}`);
      await checkInCell.getByTestId("admin-checkin-btn").click();
      await expect(pageAdmin.getByRole("button", { name: /Undo check-in/ }).first()).toBeVisible({ timeout: 5000 });

      await pageAdmin.getByTestId("admin-run-matching").click();
      await expect(pageAdmin.getByTestId("admin-run-matching")).not.toBeDisabled({ timeout: 15_000 });

      await pageAdmin.getByTestId("admin-reveal-round-1").click();
      await expect(pageAdmin.getByText(/Round 1 revealed|already revealed/i)).toBeVisible({
        timeout: 10_000,
      });

      // --- User A: match page, countdown, Chat now visible ---
      await pageA.goto(`/match?event=${encodeURIComponent(paidEventId)}`);
      await expect(pageA.getByTestId("matches-list-container")).toBeVisible({ timeout: 15_000 });

      const countdown = pageA.getByTestId("match-countdown-overlay");
      const countdownVisible = await countdown.isVisible().catch(() => false);
      if (countdownVisible) {
        await expect(countdown).not.toBeVisible({ timeout: 6000 });
      }

      const matchCard = pageA.getByTestId("match-card").first();
      await expect(matchCard).toBeVisible({ timeout: 10_000 });

      const chatNow = pageA.getByTestId("match-chat-now");
      await expect(chatNow).toBeVisible({ timeout: 5_000 });
    } finally {
      await contextA.close();
      await contextAdmin.close();
    }
  });
});
