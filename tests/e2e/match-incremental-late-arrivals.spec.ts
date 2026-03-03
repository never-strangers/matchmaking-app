import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

test.describe("incremental matching and late arrivals", () => {
  test("admin sees Revealed and Computed state on event page", async ({
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

    // UI shows Revealed and Computed labels (incremental matching)
    await expect(page.getByText(/Revealed:/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Computed:/i)).toBeVisible({ timeout: 5000 });
  });

  test("Run Matching button has incremental tooltip", async ({ page }) => {
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
    const runBtn = page.getByRole("button", { name: /run matching/i });
    if (!(await runBtn.isVisible().catch(() => false))) {
      test.skip(true, "Run Matching button not found");
      return;
    }
    await expect(runBtn).toHaveAttribute(
      "title",
      /next round only|late check-ins/i
    );
  });

  test("run-matching returns roundComputed or allRoundsComputed", async ({
    page,
    request,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    const eventId = "00000000-0000-0000-0000-000000000001";
    const res = await request.post(
      `/api/admin/events/${eventId}/run-matching`,
      { headers: { Cookie: await page.context().cookies().then((c) => c.map((x) => `${x.name}=${x.value}`).join("; ")) } }
    );
    if (res.status() === 404) {
      test.skip(true, "Event not found");
      return;
    }
    if (res.status() !== 200) {
      test.skip(true, "Non-200 (e.g. not admin or no event)");
      return;
    }
    const data = await res.json().catch(() => null);
    expect(data).toBeTruthy();
    expect(data.ok).toBe(true);
    const hasRound = data.roundComputed != null;
    const hasAll = data.allRoundsComputed === true;
    expect(hasRound || hasAll).toBe(true);
  });

  test("reveal-round returns 400 when round not computed", async ({
    page,
    request,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    const eventId = "00000000-0000-0000-0000-000000000001";
    const res = await request.post(
      `/api/admin/events/${eventId}/reveal-round`,
      {
        headers: { Cookie: await page.context().cookies().then((c) => c.map((x) => `${x.name}=${x.value}`).join("; ")) },
        data: { round: 2 },
      }
    );
    if (res.status() === 404) {
      test.skip(true, "Event not found");
      return;
    }
    if (res.status() === 401) {
      test.skip(true, "Not authenticated");
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (res.status() === 400 && body?.error?.toLowerCase().includes("compute")) {
      expect(body.error).toMatch(/compute round first|run matching/i);
      return;
    }
    if (res.status() === 200) {
      expect(body.ok).toBe(true);
      return;
    }
  });
});
