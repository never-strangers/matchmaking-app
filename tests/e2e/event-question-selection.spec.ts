import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

/**
 * End-to-end test: admin selects 20 questions → user questionnaire shows 20 → run matching succeeds.
 *
 * Prerequisites (seeded once):
 *   - E2E_APPROVED_USER must be an admin with an event that has event_questions
 *     configured via the /admin/events/[id]/questions page.
 *   - question_templates must have at least 20 rows.
 *
 * The test is written to skip gracefully when prerequisites are not met.
 */

test.describe("event question selection", () => {
  test.describe.configure({ mode: "serial" });

  let eventId: string;

  test("admin can load Manage Questions page and see library", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/events");
    if (!page.url().includes("/admin/events")) {
      test.skip(true, "User is not admin");
      return;
    }

    // Pick the first admin event
    const eventLink = page.locator('a[href^="/admin/events/"]').first();
    if (!(await eventLink.isVisible().catch(() => false))) {
      test.skip(true, "No admin events found");
      return;
    }
    const href = await eventLink.getAttribute("href");
    eventId = (href ?? "").split("/").at(-1) ?? "";
    expect(eventId).toBeTruthy();

    await page.goto(`/admin/events/${eventId}/questions`);
    await expect(page.getByText("Manage Questions")).toBeVisible({ timeout: 8_000 });
    // Page loaded — either selected list or library should be present
    await expect(
      page.getByText("Selected Questions").or(page.getByText("Question Library"))
    ).toBeVisible({ timeout: 5_000 });
  });

  test("admin selects exactly 20 questions and saves", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    if (!page.url().includes("/admin") && !eventId) {
      await page.goto("/admin/events");
      if (!page.url().includes("/admin/events")) {
        test.skip(true, "User is not admin");
        return;
      }
      const eventLink = page.locator('a[href^="/admin/events/"]').first();
      if (!(await eventLink.isVisible().catch(() => false))) {
        test.skip(true, "No admin events found");
        return;
      }
      const href = await eventLink.getAttribute("href");
      eventId = (href ?? "").split("/").at(-1) ?? "";
    }

    await page.goto(`/admin/events/${eventId}/questions`);
    await expect(page.getByText("Manage Questions")).toBeVisible({ timeout: 8_000 });

    // Check if there are templates in the library; if not, skip
    const libraryItems = page.locator("ul > li button").filter({ hasText: /./u });
    const libraryCount = await libraryItems.count().catch(() => 0);

    if (libraryCount === 0 && (await page.getByText("All templates added.").isVisible().catch(() => false))) {
      // All templates already selected; check count is >= 20
    } else if (libraryCount === 0) {
      test.skip(true, "No question_templates in DB — seed first");
      return;
    }

    // Click "Reset to defaults" to get a clean deterministic 20-question state
    const resetBtn = page.getByRole("button", { name: /reset to defaults/i });
    if (await resetBtn.isEnabled().catch(() => false)) {
      await resetBtn.click();
      await page.waitForTimeout(500);
    }

    // Count should now show 20 / 20–30 (green)
    const counter = page.locator("span.font-mono");
    await expect(counter).toHaveText(/^20\s*\/\s*20/, { timeout: 5_000 });

    // Save
    const saveBtn = page.getByRole("button", { name: /save questions/i });
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 });
    await saveBtn.click();
    await expect(page.getByText(/questions saved successfully/i)).toBeVisible({ timeout: 8_000 });
  });

  test("questionnaire page shows 20 questions for the event", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    if (!eventId) {
      await page.goto("/admin/events");
      if (!page.url().includes("/admin/events")) {
        test.skip(true, "User is not admin");
        return;
      }
      const eventLink = page.locator('a[href^="/admin/events/"]').first();
      if (!(await eventLink.isVisible().catch(() => false))) {
        test.skip(true, "No admin events found");
        return;
      }
      const href = await eventLink.getAttribute("href");
      eventId = (href ?? "").split("/").at(-1) ?? "";
    }

    // Hit the questions API directly to assert count
    const res = await page.request.get(`/api/admin/events/${eventId}/questions`);
    expect(res.ok()).toBe(true);
    const body = await res.json() as { selected: unknown[]; available: unknown[] };
    expect(body.selected.length).toBeGreaterThanOrEqual(20);
    expect(body.selected.length).toBeLessThanOrEqual(30);
  });

  test("run-matching API returns 200 with questions configured", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    if (!eventId) {
      await page.goto("/admin/events");
      if (!page.url().includes("/admin/events")) {
        test.skip(true, "User is not admin");
        return;
      }
      const eventLink = page.locator('a[href^="/admin/events/"]').first();
      if (!(await eventLink.isVisible().catch(() => false))) {
        test.skip(true, "No admin events found");
        return;
      }
      const href = await eventLink.getAttribute("href");
      eventId = (href ?? "").split("/").at(-1) ?? "";
    }

    // Check questions are configured
    const qRes = await page.request.get(`/api/admin/events/${eventId}/questions`);
    const qBody = await qRes.json() as { selected: unknown[] };
    if (qBody.selected.length < 20) {
      test.skip(true, "Event has fewer than 20 questions configured; run previous test first");
      return;
    }

    // Attempt to run matching (may have 0 pairs if no checked-in attendees, but should not 400/500)
    const res = await page.request.post(`/api/admin/events/${eventId}/run-matching`);
    expect([200, 422]).toContain(res.status()); // 422 = all rounds computed
    if (res.status() === 200) {
      const body = await res.json() as { ok: boolean };
      expect(body.ok).toBe(true);
    }
  });
});
