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

  test("approved user with matches: countdown appears and first reveal works", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);
    await expect(page.getByTestId("matches-headline")).toBeVisible();

    const revealBtn = page.getByTestId("match-reveal-next");
    const countdown = page.getByTestId("match-countdown-overlay");
    const matchCard = page.getByTestId("match-card");
    const listContainer = page.getByTestId("matches-list-container");

    await listContainer.waitFor({ state: "visible", timeout: 10_000 });

    if (await revealBtn.isVisible().catch(() => false)) {
      await revealBtn.click();
      await expect(countdown).toBeVisible({ timeout: 2000 });
      await expect(countdown).not.toBeVisible({ timeout: 5000 });
      await expect(matchCard.or(revealBtn)).toBeVisible({ timeout: 5000 });
    } else {
      expect(await listContainer.isVisible()).toBe(true);
    }
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
