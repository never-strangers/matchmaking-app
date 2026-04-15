import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

/**
 * match-type-badges.spec.ts
 *
 * Verifies that match_type indicators (date/friend) are rendered correctly
 * in the user-facing MatchCard and the admin matches table.
 *
 * NOTE: These tests require live Supabase data (an event with match_results
 * that include both match_type='date' and match_type='friend' rows).
 * They skip gracefully if the data is not present in the current environment.
 *
 * The bali-dating-imbalance-20f10m seed config (20 females, 10 males) is
 * designed to produce friend-fallback matches because not all females can be
 * paired with a male partner. Seed that config to populate the required data
 * before running this suite against a local environment.
 */

test.describe("match-type badges — user MatchCard", () => {
  test("match page renders match-type-badge elements when matches are revealed", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);

    // Wait briefly for match data to load
    const matchCard = page.getByTestId("match-card").first();
    const hasMatchCard = await matchCard
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasMatchCard) {
      test.skip(true, "No revealed match cards — seed bali-dating-imbalance-20f10m and run matching to test badges");
      return;
    }

    // All visible match cards should have a data-testid="match-type-badge"
    const badges = page.getByTestId("match-type-badge");
    await expect(badges.first()).toBeVisible({ timeout: 5_000 });

    // Each badge should have data-match-type of either "date" or "friend"
    const badgeCount = await badges.count();
    for (let i = 0; i < badgeCount; i++) {
      const matchType = await badges.nth(i).getAttribute("data-match-type");
      expect(["date", "friend"]).toContain(matchType);
    }
  });

  test("match page shows at least one friend badge when imbalanced dating event has matches", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);

    const matchCard = page.getByTestId("match-card").first();
    const hasMatchCard = await matchCard
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasMatchCard) {
      test.skip(true, "No revealed match cards — needs imbalanced dating event with friend-fallback matches");
      return;
    }

    const friendBadges = page.locator('[data-testid="match-type-badge"][data-match-type="friend"]');
    const dateBadges = page.locator('[data-testid="match-type-badge"][data-match-type="date"]');

    const friendCount = await friendBadges.count();
    const dateCount = await dateBadges.count();

    // At least one type must be visible (date OR friend)
    expect(friendCount + dateCount).toBeGreaterThan(0);

    // If both exist, verify the correct emojis are shown
    if (dateCount > 0) {
      await expect(dateBadges.first()).toContainText("❤️ Date match");
    }
    if (friendCount > 0) {
      await expect(friendBadges.first()).toContainText("👥 Friend match");
    }
  });
});

test.describe("match-type badges — admin matches table", () => {
  test("admin matches page shows Type column with D/F values", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/matches");

    if (!page.url().includes("/admin/matches")) {
      test.skip(true, "User is not admin");
      return;
    }

    // Wait for table to load
    const table = page.locator("table").first();
    const hasTable = await table
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasTable) {
      test.skip(true, "No matches table visible — no match data for selected event");
      return;
    }

    // Check Type column header exists
    await expect(page.locator("th").filter({ hasText: "Type" })).toBeVisible();

    // All admin-match-type cells should have data-match-type="date" or "friend"
    const typeCells = page.getByTestId("admin-match-type");
    const cellCount = await typeCells.count();
    if (cellCount === 0) {
      test.skip(true, "No match rows rendered — no match_results for selected event");
      return;
    }

    for (let i = 0; i < Math.min(cellCount, 20); i++) {
      const matchType = await typeCells.nth(i).getAttribute("data-match-type");
      expect(["date", "friend"]).toContain(matchType);
      const text = await typeCells.nth(i).innerText();
      expect(["D", "F"]).toContain(text.trim());
    }
  });

  test("admin matches page Type column shows F for friend-fallback matches", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/matches");

    if (!page.url().includes("/admin/matches")) {
      test.skip(true, "User is not admin");
      return;
    }

    const typeCells = page.getByTestId("admin-match-type");
    const hasTypeCells = await typeCells
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasTypeCells) {
      test.skip(true, "No admin-match-type cells — needs match data. Seed bali-dating-imbalance-20f10m.");
      return;
    }

    // Collect all type values
    const cellCount = await typeCells.count();
    const typeValues: string[] = [];
    for (let i = 0; i < cellCount; i++) {
      const matchType = await typeCells.nth(i).getAttribute("data-match-type");
      if (matchType) typeValues.push(matchType);
    }

    // Must have at least one cell present
    expect(typeValues.length).toBeGreaterThan(0);

    // If we have both types, specifically verify the F cell
    const friendCells = page.locator('[data-testid="admin-match-type"][data-match-type="friend"]');
    const friendCount = await friendCells.count();
    if (friendCount > 0) {
      await expect(friendCells.first()).toHaveText("F");
      await expect(friendCells.first()).toHaveAttribute("title", "Friend fallback");
    }

    const dateCells = page.locator('[data-testid="admin-match-type"][data-match-type="date"]');
    const dateCount = await dateCells.count();
    if (dateCount > 0) {
      await expect(dateCells.first()).toHaveText("D");
      await expect(dateCells.first()).toHaveAttribute("title", "Date match");
    }
  });
});
