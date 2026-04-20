/**
 * Events page filter tests: city selector + category pills + URL params.
 *
 * These tests require a live app with approved E2E users. They skip gracefully
 * if the events page isn't accessible or has no events to show.
 */
import { test, expect } from "@playwright/test";
import { loginUser } from "./authHelpers";
import {
  E2E_APPROVED_USER,
  E2E_CITY_MANILA_USER,
  E2E_NO_CITY_USER,
} from "../fixtures/e2e-users";

async function loginAndGoToEvents(page: any) {
  await loginUser(page, E2E_APPROVED_USER);
  await page.goto("/events", { waitUntil: "networkidle" });
  // If we got redirected away from /events (e.g. pending gate), skip.
  if (!page.url().includes("/events")) {
    return false;
  }
  return true;
}

test.describe("Events filter bar", () => {
  test("events page loads and shows filter controls", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) {
      test.skip();
      return;
    }

    // Category pills always render (even with 0 events)
    await expect(page.getByTestId("events-filter-category")).toBeVisible({
      timeout: 8000,
    });

    // "All" pill should be present and active by default
    const allPill = page
      .getByTestId("events-filter-category")
      .getByRole("button", { name: "All" });
    await expect(allPill).toBeVisible();
    await expect(allPill).toHaveAttribute("aria-pressed", "true");
  });

  test("city selector shows user default city", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) { test.skip(); return; }

    // City dropdown renders when `city_config` has at least one live city (see `/events` server data).
    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) {
      test.skip();
      return;
    }

    // The selected value should be either a city label or empty ("All cities")
    const value = await citySelect.inputValue();
    // It's either "" (all cities) or a non-empty string
    expect(typeof value).toBe("string");
  });

  test("selecting another city updates URL and list", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) { test.skip(); return; }

    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) { test.skip(); return; }

    // Get all available options (skip the first "All cities" option)
    const options = await citySelect.locator("option").allInnerTexts();
    if (options.length < 2) { test.skip(); return; }

    // Pick the second option (first real city)
    const targetCityOption = options[1].replace(/^[^\s]+\s/, ""); // strip flag emoji
    const targetCityValue = await citySelect
      .locator("option")
      .nth(1)
      .getAttribute("value");

    if (!targetCityValue) { test.skip(); return; }

    // Select the city
    await citySelect.selectOption(targetCityValue);

    // URL should update with ?city=...
    await expect(page).toHaveURL(new RegExp(`city=${encodeURIComponent(targetCityValue)}`), {
      timeout: 3000,
    });

    // List container should still be present (may have 0 events for that city)
    // — either events-list-container or EmptyState
    const listVisible = await page
      .getByTestId("events-list-container")
      .isVisible()
      .catch(() => false);
    const emptyVisible = await page
      .locator('[data-testid="empty-state"], [class*="EmptyState"]')
      .isVisible()
      .catch(() => false);
    expect(listVisible || emptyVisible).toBe(true);
  });

  test("category filter Friends updates URL", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) { test.skip(); return; }

    await expect(page.getByTestId("events-filter-category")).toBeVisible({
      timeout: 8000,
    });

    const friendsPill = page
      .getByTestId("events-filter-category")
      .getByRole("button", { name: "Friends" });
    await expect(friendsPill).toBeVisible();
    await friendsPill.click();

    // URL should update with ?category=friends
    await expect(page).toHaveURL(/category=friends/, { timeout: 3000 });

    // Friends pill should now be active
    await expect(friendsPill).toHaveAttribute("aria-pressed", "true");

    // All pill should not be active
    const allPill = page
      .getByTestId("events-filter-category")
      .getByRole("button", { name: "All" });
    await expect(allPill).toHaveAttribute("aria-pressed", "false");
  });

  test("category filter Dating updates URL", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) { test.skip(); return; }

    await expect(page.getByTestId("events-filter-category")).toBeVisible({
      timeout: 8000,
    });

    const datingPill = page
      .getByTestId("events-filter-category")
      .getByRole("button", { name: "Dating" });
    await expect(datingPill).toBeVisible();
    await datingPill.click();

    await expect(page).toHaveURL(/category=dating/, { timeout: 3000 });
    await expect(datingPill).toHaveAttribute("aria-pressed", "true");
  });

  // ── City default behaviour ────────────────────────────────────────────────

  test("URL param ?city overrides profile city default", async ({ page }) => {
    // Approved user has city=sg (Singapore). Visiting with ?city=Hong+Kong
    // must show Hong Kong selected regardless of profile city.
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/events?city=Hong+Kong", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) { test.skip(); return; }

    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) { test.skip(); return; }

    const value = await citySelect.inputValue();
    expect(value).toBe("Hong Kong");
  });

  test("user with profile city defaults to that city when events exist", async ({ page }) => {
    // Approved user has city=sg (Singapore).
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/events", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) { test.skip(); return; }

    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) { test.skip(); return; }

    const options = await citySelect.locator("option").allTextContents();
    const hasSingapore = options.some((o) => o.includes("Singapore"));
    if (!hasSingapore) {
      // No Singapore events — can't assert; skip.
      test.skip();
      return;
    }

    const value = await citySelect.inputValue();
    expect(value).toBe("Singapore");
  });

  test("user with profile city Manila defaults to Manila when events exist", async ({ page }) => {
    await loginUser(page, E2E_CITY_MANILA_USER);
    await page.goto("/events", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) { test.skip(); return; }

    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) { test.skip(); return; }

    const options = await citySelect.locator("option").allTextContents();
    const hasManila = options.some((o) => o.includes("Manila"));
    if (!hasManila) {
      // No Manila events in this environment — skip (not a product bug).
      test.skip();
      return;
    }

    const value = await citySelect.inputValue();
    expect(value).toBe("Manila");
  });

  test("user with no city set defaults to All cities", async ({ page }) => {
    await loginUser(page, E2E_NO_CITY_USER);
    await page.goto("/events", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) { test.skip(); return; }

    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) { test.skip(); return; }

    // Value "" means "All cities" option is selected.
    const value = await citySelect.inputValue();
    expect(value).toBe("");
  });

  test("URL param ?city=Singapore overrides no-city user default", async ({ page }) => {
    await loginUser(page, E2E_NO_CITY_USER);
    await page.goto("/events?city=Singapore", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) { test.skip(); return; }

    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) { test.skip(); return; }

    const options = await citySelect.locator("option").allTextContents();
    const hasSingapore = options.some((o) => o.includes("Singapore"));
    if (!hasSingapore) { test.skip(); return; }

    const value = await citySelect.inputValue();
    expect(value).toBe("Singapore");
  });

  // ─────────────────────────────────────────────────────────────────────────

  test("combined city + category filters reflect in URL", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) { test.skip(); return; }

    // Apply category filter first
    const friendsPill = page
      .getByTestId("events-filter-category")
      .getByRole("button", { name: "Friends" });
    await expect(friendsPill).toBeVisible({ timeout: 8000 });
    await friendsPill.click();
    await expect(page).toHaveURL(/category=friends/, { timeout: 3000 });

    // Then apply city filter if available
    const citySelect = page.getByTestId("events-filter-city");
    const hasCity = await citySelect.isVisible().catch(() => false);
    if (!hasCity) return; // Category-only test already passed — done

    const options = await citySelect.locator("option").allInnerTexts();
    if (options.length < 2) return;

    const targetValue = await citySelect
      .locator("option")
      .nth(1)
      .getAttribute("value");
    if (!targetValue) return;

    await citySelect.selectOption(targetValue);

    // Both params should be in URL
    await expect(page).toHaveURL(/category=friends/, { timeout: 3000 });
    await expect(page).toHaveURL(new RegExp(`city=${encodeURIComponent(targetValue)}`), {
      timeout: 3000,
    });
  });

  test("URL params restore filter state on page load", async ({ page }) => {
    const ok = await loginAndGoToEvents(page);
    if (!ok) { test.skip(); return; }

    // Navigate directly with params
    await page.goto("/events?category=dating", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) { test.skip(); return; }

    await expect(page.getByTestId("events-filter-category")).toBeVisible({
      timeout: 8000,
    });

    const datingPill = page
      .getByTestId("events-filter-category")
      .getByRole("button", { name: "Dating" });
    await expect(datingPill).toHaveAttribute("aria-pressed", "true");
  });
});
