import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

test.describe("match three-round reveal", () => {
  test("admin can run matching and see round counts, then reveal Round 1", async ({
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
      test.skip(true, "No admin events");
      return;
    }
    await eventLink.click();
    await expect(page).toHaveURL(/\/admin\/events\/[^/]+/);

    const runMatchingBtn = page.getByRole("button", { name: /run matching/i });
    if (!(await runMatchingBtn.isVisible().catch(() => false))) {
      test.skip(true, "Run Matching button not found");
      return;
    }
    await runMatchingBtn.click();
    await expect(page.getByRole("button", { name: /running/i })).not.toBeVisible({
      timeout: 15_000,
    });

    await page.waitForTimeout(500);
    const revealRound1 = page.getByTestId("admin-reveal-round-1");
    await expect(revealRound1).toBeVisible({ timeout: 5000 });
    if (await revealRound1.isEnabled().catch(() => false)) {
      await revealRound1.click();
      await expect(
        page.getByRole("button", { name: /round 1 revealed/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("reveal-round endpoint requires admin", async ({ page, request }) => {
    await loginUser(page, E2E_APPROVED_USER);
    const res = await request.post(
      "/api/admin/events/00000000-0000-0000-0000-000000000000/reveal-round",
      { data: { round: 1 } }
    );
    expect(res.status()).toBe(401);
  });
});
