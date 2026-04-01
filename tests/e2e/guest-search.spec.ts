/**
 * Guest list search tests.
 *
 * These tests require:
 *   - A live app with admin credentials (E2E_ADMIN_USER or E2E_APPROVED_USER with role=admin)
 *   - At least one event with attendees seeded
 *
 * All tests skip gracefully when prerequisites aren't met (no admin access, no attendees, etc.).
 */
import { test, expect, Page } from "@playwright/test";
import { loginUser } from "./authHelpers";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";

/** Logs in and navigates to the first available admin event detail page. Returns event ID or null. */
async function loginAsAdminAndFindEvent(page: Page): Promise<string | null> {
  await loginUser(page, E2E_APPROVED_USER);

  // Check if user has admin access
  const isAdmin = await page
    .locator('[data-testid="nav-admin"], a[href="/admin"]')
    .isVisible()
    .catch(() => false);

  if (!isAdmin) return null;

  await page.goto("/admin/events", { waitUntil: "networkidle" });
  if (!page.url().includes("/admin")) return null;

  // Find first event link
  const firstEventLink = page.locator('a[href^="/admin/events/"]').first();
  const hasEvents = await firstEventLink.isVisible({ timeout: 5000 }).catch(() => false);
  if (!hasEvents) return null;

  const href = await firstEventLink.getAttribute("href");
  if (!href) return null;

  const eventId = href.replace("/admin/events/", "").split("?")[0].split("/")[0];
  return eventId || null;
}

test.describe("Guest list search", () => {
  test("search input renders on admin event detail page", async ({ page }) => {
    const eventId = await loginAsAdminAndFindEvent(page);
    if (!eventId) { test.skip(); return; }

    await page.goto(`/admin/events/${eventId}`, { waitUntil: "networkidle" });

    // Look for guest-search-input — only present if there are attendees
    const searchInput = page.getByTestId("guest-search-input");
    const hasAttendees = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasAttendees) {
      // No attendees seeded — search shouldn't render, which is correct
      test.skip();
      return;
    }

    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("placeholder", "Search guests…");
  });

  test("typing in search filters guest rows", async ({ page }) => {
    const eventId = await loginAsAdminAndFindEvent(page);
    if (!eventId) { test.skip(); return; }

    await page.goto(`/admin/events/${eventId}`, { waitUntil: "networkidle" });

    const searchInput = page.getByTestId("guest-search-input");
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSearch) { test.skip(); return; }

    // Get initial row count
    const allRows = page.locator('[data-testid^="guest-row-"]');
    const initialCount = await allRows.count();
    if (initialCount === 0) { test.skip(); return; }

    // Get the first guest's name to search for
    const firstRow = allRows.first();
    const firstRowText = await firstRow.innerText();
    const firstNameWord = firstRowText.trim().split(/\s/)[0];
    if (!firstNameWord || firstNameWord.length < 2) { test.skip(); return; }

    // Type search query
    await searchInput.fill(firstNameWord);

    // Wait a bit for debounce (300ms) + React re-render
    await page.waitForTimeout(500);

    // Filtered rows should be ≤ initial count
    const filteredCount = await allRows.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test("clearing search restores full list", async ({ page }) => {
    const eventId = await loginAsAdminAndFindEvent(page);
    if (!eventId) { test.skip(); return; }

    await page.goto(`/admin/events/${eventId}`, { waitUntil: "networkidle" });

    const searchInput = page.getByTestId("guest-search-input");
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSearch) { test.skip(); return; }

    const allRows = page.locator('[data-testid^="guest-row-"]');
    const initialCount = await allRows.count();
    if (initialCount < 2) { test.skip(); return; }

    // Type something that likely filters to fewer rows
    await searchInput.fill("zzzzzzzzz_no_match");
    await page.waitForTimeout(500);

    // Click the clear (×) button
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.waitForTimeout(200);

    // Should restore full list
    const restoredCount = await allRows.count();
    expect(restoredCount).toBe(initialCount);
  });

  test("check-in button works from filtered results", async ({ page }) => {
    const eventId = await loginAsAdminAndFindEvent(page);
    if (!eventId) { test.skip(); return; }

    await page.goto(`/admin/events/${eventId}`, { waitUntil: "networkidle" });

    const searchInput = page.getByTestId("guest-search-input");
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSearch) { test.skip(); return; }

    // Find a guest-checkin button that is a "Check-in" (not yet checked in)
    const checkInBtn = page
      .locator('[data-testid^="guest-checkin-"]')
      .filter({ hasText: "Check-in" })
      .first();
    const hasPendingCheckIn = await checkInBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasPendingCheckIn) { test.skip(); return; }

    // Get the testid to find the row
    const testId = await checkInBtn.getAttribute("data-testid");
    const attendeeId = testId?.replace("guest-checkin-", "") ?? "";
    if (!attendeeId) { test.skip(); return; }

    // Search for that attendee's name (get the row first)
    const guestRow = page.getByTestId(`guest-row-${attendeeId}`);
    const rowText = await guestRow.innerText().catch(() => "");
    const nameWord = rowText.trim().split(/\s/)[0];

    if (nameWord && nameWord.length >= 2) {
      await searchInput.fill(nameWord);
      await page.waitForTimeout(500);
    }

    // Click check-in from filtered result
    await checkInBtn.click();

    // Wait for the button to update (optimistic + router.refresh)
    await expect(checkInBtn).toHaveText("Undo check-in", { timeout: 8000 });
  });

  test("guest list has Email column and no Ticket column", async ({ page }) => {
    const eventId = await loginAsAdminAndFindEvent(page);
    if (!eventId) { test.skip(); return; }

    await page.goto(`/admin/events/${eventId}`, { waitUntil: "networkidle" });

    const searchInput = page.getByTestId("guest-search-input");
    const hasAttendees = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasAttendees) { test.skip(); return; }

    const headers = page.locator("table thead th");
    const headerTexts = await headers.allInnerTexts();

    expect(headerTexts).toContain("Email");
    expect(headerTexts).not.toContain("Ticket");
  });

  test("guest list Email cells show real emails for seeded attendees", async ({ page }) => {
    const eventId = await loginAsAdminAndFindEvent(page);
    if (!eventId) { test.skip(); return; }

    await page.goto(`/admin/events/${eventId}`, { waitUntil: "networkidle" });

    const searchInput = page.getByTestId("guest-search-input");
    const hasAttendees = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasAttendees) { test.skip(); return; }

    const rows = page.locator('[data-testid^="guest-row-"]');
    if (await rows.count() === 0) { test.skip(); return; }

    // At least one row should contain an @ symbol (a real email address)
    const tableBody = await page.locator("table tbody").innerText();
    expect(tableBody).toContain("@");
  });
});
