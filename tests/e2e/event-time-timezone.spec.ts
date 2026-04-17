/**
 * Verify event times are displayed as wall-clock time (as the admin entered
 * them) and never as raw UTC/ISO strings.
 *
 * Since `datetime-local` inputs carry no timezone and the DB stores them as
 * TIMESTAMPTZ (interpreted as UTC), we strip the UTC offset at render time so
 * that e.g. "9:30 PM" always shows as "9:30 PM" regardless of browser TZ.
 */
import { test, expect, BrowserContext } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";

async function loginUser(
  page: Awaited<ReturnType<BrowserContext["newPage"]>>,
  credentials: { email: string; password: string },
) {
  await page.goto("/login", { waitUntil: "load" });
  const loginCta = page.getByTestId("login-cta");
  if (await loginCta.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginCta.click();
  }
  await page.getByTestId("login-email").fill(credentials.email);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/(events|profile|pending|match|admin)/, { timeout: 15000 });
}

async function getFirstEventDateText(
  page: Awaited<ReturnType<BrowserContext["newPage"]>>,
): Promise<string | null> {
  await page.goto("/events", { waitUntil: "networkidle" });
  if (!page.url().includes("/events")) return null;

  const container = page.getByTestId("events-list-container");
  const visible = await container.isVisible({ timeout: 8000 }).catch(() => false);
  if (!visible) return null;

  const firstCard = container.locator("[data-testid^='event-card-']").first();
  const cardVisible = await firstCard.isVisible({ timeout: 5000 }).catch(() => false);
  if (!cardVisible) return null;

  const dateLine = firstCard.locator("p.text-xs.uppercase").first();
  return dateLine.innerText({ timeout: 3000 }).catch(() => null);
}

test.describe("Event time display", () => {
  test("event list shows formatted date (not raw UTC)", async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: "Asia/Singapore",
    });
    const page = await context.newPage();
    await loginUser(page, E2E_APPROVED_USER);

    const dateText = await getFirstEventDateText(page);
    await context.close();

    if (!dateText) {
      test.skip(true, "No events visible — cannot verify formatting");
      return;
    }

    expect(dateText).not.toContain("Z");
    expect(dateText).not.toContain("+00:00");

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hasMonth = months.some((m) => dateText.includes(m)) || dateText.includes("Today");
    expect(hasMonth).toBe(true);
  });

  test("wall-clock time is identical across timezones", async ({ browser }) => {
    const ctxSingapore = await browser.newContext({ timezoneId: "Asia/Singapore" });
    const pageSG = await ctxSingapore.newPage();
    await loginUser(pageSG, E2E_APPROVED_USER);
    const dateSG = await getFirstEventDateText(pageSG);
    await ctxSingapore.close();

    const ctxNY = await browser.newContext({ timezoneId: "America/New_York" });
    const pageNY = await ctxNY.newPage();
    await loginUser(pageNY, E2E_APPROVED_USER);
    const dateNY = await getFirstEventDateText(pageNY);
    await ctxNY.close();

    if (!dateSG || !dateNY) {
      test.skip(true, "No events visible — cannot compare");
      return;
    }

    // Wall-clock display: both timezones should show the same date text
    expect(dateSG).toBe(dateNY);
  });

  test("event detail page shows formatted local time", async ({ browser }) => {
    const context = await browser.newContext({
      timezoneId: "Asia/Singapore",
    });
    const page = await context.newPage();
    await loginUser(page, E2E_APPROVED_USER);

    await page.goto("/events", { waitUntil: "networkidle" });
    if (!page.url().includes("/events")) {
      await context.close();
      test.skip(true, "Cannot access events page");
      return;
    }

    const container = page.getByTestId("events-list-container");
    const visible = await container.isVisible({ timeout: 8000 }).catch(() => false);
    if (!visible) {
      await context.close();
      test.skip(true, "No events list visible");
      return;
    }

    const firstLink = container.locator("a[href^='/events/']").first();
    const linkVisible = await firstLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!linkVisible) {
      await context.close();
      test.skip(true, "No event links visible");
      return;
    }

    await firstLink.click();
    await page.waitForURL(/\/events\/[^/]+$/, { timeout: 10000 });

    const pageContent = await page.textContent("body");
    await context.close();

    expect(pageContent).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
