import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

test.describe("admin matches rounds", () => {
  test("round tabs, search, export; Round 2 shows table or empty state", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/matches");
    if (!page.url().includes("/admin/matches")) {
      test.skip(true, "Approved E2E user is not an admin");
      return;
    }

    const noEvents = page.getByText("No events found");
    if (await noEvents.isVisible().catch(() => false)) {
      test.skip(true, "No events for admin matches test");
      return;
    }

    const eventSelect = page.getByTestId("matches-event-select");
    await expect(eventSelect).toBeVisible({ timeout: 10_000 });

    const firstEventId = await eventSelect.evaluate((el: HTMLSelectElement) => el.value);
    if (!firstEventId) {
      test.skip(true, "No event in matches dropdown");
      return;
    }

    await page.goto(`/admin/matches?event=${encodeURIComponent(firstEventId)}&round=2`);

    await expect(page.getByTestId("round-tabs")).toBeVisible();
    await expect(page.getByTestId("round-tab-1")).toBeVisible();
    await expect(page.getByTestId("round-tab-2")).toBeVisible();
    await expect(page.getByTestId("round-tab-3")).toBeVisible();

    await expect(page.getByTestId("matches-search")).toBeVisible();
    await expect(page.getByTestId("matches-export-csv")).toBeVisible();

    const empty = page.getByTestId("matches-empty-state");
    const table = page.getByTestId("matches-table");
    const hasEmpty = await empty.isVisible().catch(() => false);
    const hasTable = await table.isVisible().catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });
});
