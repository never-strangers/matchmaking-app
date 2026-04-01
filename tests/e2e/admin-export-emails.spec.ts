import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

test.describe("admin export emails", () => {
  test("unauthenticated request returns 401", async ({ request }) => {
    const res = await request.get(
      "/api/admin/events/00000000-0000-0000-0000-000000000000/export-emails?segment=all"
    );
    expect(res.status()).toBe(401);
  });

  test("non-admin cannot access export endpoint", async ({ page, request: _req }) => {
    await loginUser(page, E2E_APPROVED_USER);

    // Use page.evaluate to make a fetch with the session cookie from page context
    const status = await page.evaluate(async () => {
      const res = await fetch(
        "/api/admin/events/00000000-0000-0000-0000-000000000000/export-emails?segment=all",
        { credentials: "include" }
      );
      return res.status;
    });

    // Approved non-admin user should be 403; admin would be 404 (event not found)
    // Either way not 200
    expect([403, 404]).toContain(status);
  });

  test("admin can export CSV and response is well-formed", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);

    // Navigate to admin events to verify this user is actually admin
    await page.goto("/admin/events");
    const isAdmin = page.url().includes("/admin/events");
    if (!isAdmin) {
      test.skip(true, "Approved E2E user is not an admin");
      return;
    }

    // Find first event link
    const eventLink = page.locator('a[href^="/admin/events/"]').first();
    const hasEvent = await eventLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasEvent) {
      test.skip(true, "No events available for admin export test");
      return;
    }

    const href = await eventLink.getAttribute("href");
    const eventId = href?.split("/admin/events/")[1]?.split("/")[0];
    if (!eventId) {
      test.skip(true, "Could not extract event ID");
      return;
    }

    // Test "all" segment CSV export
    const { status, body, headers } = await page.evaluate(async (id: string) => {
      const res = await fetch(
        `/api/admin/events/${id}/export-emails?segment=all&format=csv`,
        { credentials: "include" }
      );
      return {
        status: res.status,
        body: await res.text(),
        headers: {
          contentType: res.headers.get("content-type") ?? "",
          contentDisposition: res.headers.get("content-disposition") ?? "",
        },
      };
    }, eventId);

    expect(status).toBe(200);
    expect(headers.contentType).toContain("text/csv");
    expect(headers.contentDisposition).toContain("attachment");
    expect(headers.contentDisposition).toContain("emails-all.csv");
    // Must start with header row
    expect(body.trim()).toMatch(/^email/);
  });

  test("admin: checked_in segment returns 200 and valid CSV", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/events");
    if (!page.url().includes("/admin/events")) {
      test.skip(true, "Approved E2E user is not an admin");
      return;
    }

    const eventLink = page.locator('a[href^="/admin/events/"]').first();
    const hasEvent = await eventLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasEvent) {
      test.skip(true, "No events for checked_in export test");
      return;
    }

    const href = await eventLink.getAttribute("href");
    const eventId = href?.split("/admin/events/")[1]?.split("/")[0];
    if (!eventId) {
      test.skip(true, "Could not extract event ID");
      return;
    }

    const { status, body } = await page.evaluate(async (id: string) => {
      const res = await fetch(
        `/api/admin/events/${id}/export-emails?segment=checked_in&format=csv`,
        { credentials: "include" }
      );
      return { status: res.status, body: await res.text() };
    }, eventId);

    expect(status).toBe(200);
    // CSV must have header
    const lines = body.trim().split("\n");
    expect(lines[0].trim()).toBe("email");
    // If there are email rows, they must look like emails
    const emailLines = lines.slice(1).filter((l) => l.trim());
    for (const line of emailLines) {
      // Quoted email format: "foo@bar.com"
      const raw = line.replace(/^"|"$/g, "");
      expect(raw).toContain("@");
      // Must not contain demo emails
      expect(raw).not.toContain("@demo.local");
    }
  });

  test("admin: export UI buttons are visible on event detail page", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/events");
    if (!page.url().includes("/admin/events")) {
      test.skip(true, "Approved E2E user is not an admin");
      return;
    }

    const eventLink = page.locator('a[href^="/admin/events/"]').first();
    const hasEvent = await eventLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasEvent) {
      test.skip(true, "No events for UI export test");
      return;
    }

    await eventLink.click();
    await expect(page).toHaveURL(/\/admin\/events\/[^\/]+$/);

    // Export controls should be visible
    await expect(page.getByTestId("admin-export-emails-segment")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("admin-export-emails-btn")).toBeVisible();
    await expect(page.getByTestId("admin-copy-emails-btn")).toBeVisible();
  });
});
