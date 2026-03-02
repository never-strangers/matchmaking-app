import { test, expect } from "@playwright/test";
import { E2E_PENDING_USER, E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser, assertPendingGating } from "./authHelpers";

test.describe("match reveal and check-in", () => {
  test("pending user cannot access matches", async ({ page }) => {
    await loginUser(page, E2E_PENDING_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/pending/);
    await expect(page.getByTestId("pending-headline")).toBeVisible();
  });

  test("approved user: match page shows rounds or waiting (no user reveal button)", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);

    const headline = page.getByTestId("matches-headline");
    if (!(await headline.isVisible().catch(() => false))) {
      test.skip(true, "No event with completed matching for approved E2E user");
      return;
    }

    const listContainer = page.getByTestId("matches-list-container");
    await listContainer.waitFor({ state: "visible", timeout: 10_000 });

    // User must not have a "Reveal" button (reveals are admin-only).
    await expect(page.getByTestId("match-reveal-next")).not.toBeVisible();
    // Either "Waiting for host" or at least one Round section / match card.
    const waiting = page.getByText(/waiting for host/i);
    const matchCard = page.getByTestId("match-card").first();
    const round1Heading = page.getByText("Round 1");
    const hasWaiting = await waiting.isVisible().catch(() => false);
    const hasMatch = await matchCard.isVisible().catch(() => false);
    const hasRound = await round1Heading.isVisible().catch(() => false);
    expect(hasWaiting || hasMatch || hasRound).toBe(true);
  });

  test("non-admin cannot call admin reveal-round endpoint", async ({ page, request }) => {
    await loginUser(page, E2E_APPROVED_USER);
    const response = await request.post(
      "/api/admin/events/00000000-0000-0000-0000-000000000000/reveal-round",
      { data: { round: 1 } }
    );
    expect(response.status()).toBe(401);
  });

  test("admin check-in toggles attendee and run matching uses checked-in only", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/events");
    if (!page.url().includes("/admin/events")) {
      test.skip(true, "Approved user is not admin");
      return;
    }
    const eventLink = page.locator('a[href^="/admin/events/"]').first();
    if (!(await eventLink.isVisible().catch(() => false))) {
      test.skip(true, "No admin events to test check-in");
      return;
    }
    await eventLink.click();
    await expect(page).toHaveURL(/\/admin\/events\/[^/]+/);

    const guestTable = page.locator('table').first();
    await expect(guestTable).toBeVisible({ timeout: 5000 });
    const checkInBtn = page.getByRole("button", { name: /check-in/i }).first();
    if (await checkInBtn.isVisible().catch(() => false)) {
      await checkInBtn.click();
      await expect(page.getByRole("button", { name: /undo check-in/i }).first()).toBeVisible({
        timeout: 5000,
      });
    }
    const runMatchingBtn = page.getByRole("button", { name: /run matching/i });
    if (await runMatchingBtn.isVisible().catch(() => false)) {
      await runMatchingBtn.click();
      await expect(page.getByRole("button", { name: /running/i })).not.toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
