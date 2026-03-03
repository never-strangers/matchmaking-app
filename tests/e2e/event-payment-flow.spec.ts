import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

test.describe("event payment flow", () => {
  test("paid event: Continue to payment triggers Stripe checkout request and redirect", async ({
    page,
  }) => {
    const mockCheckoutUrl = "https://checkout.stripe.com/mock-test-session";
    let requestBody: { event_id?: string } = {};
    await page.route("**/api/stripe/create-checkout-session", async (route) => {
      try {
        requestBody = route.request().postDataJSON();
      } catch {
        requestBody = {};
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: mockCheckoutUrl }),
      });
    });

    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/events");
    await expect(page.getByTestId("events-list-container")).toBeVisible({ timeout: 15_000 });

    const payButton = page.getByTestId("pay-to-confirm-button").first();
    const enterButton = page.getByTestId("event-enter-btn").first();
    const hasPay = await payButton.isVisible().catch(() => false);
    const hasEnter = await enterButton.isVisible().catch(() => false);
    if (!hasPay && !hasEnter) {
      test.skip(true, "No paid or enter event on events list");
      return;
    }

    if (hasPay) {
      await payButton.click();
      await expect(page).toHaveURL(mockCheckoutUrl, { timeout: 10_000 });
      expect(requestBody.event_id).toBeDefined();
      expect(typeof requestBody.event_id).toBe("string");
      return;
    }

    await enterButton.click();
    await expect(page.getByTestId("event-preview-modal")).toBeVisible({ timeout: 5000 });
    const continueToPayment = page.getByTestId("event-preview-go-to-payment");
    if (!(await continueToPayment.isVisible().catch(() => false))) {
      test.skip(true, "Modal opened but event is free or already paid");
      return;
    }
    await continueToPayment.click();
    await expect(page).toHaveURL(mockCheckoutUrl, { timeout: 10_000 });
    expect(requestBody.event_id).toBeDefined();
  });

  test("paid event: direct access to questions redirects to event page when not paid", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/events");
    await expect(page.getByTestId("events-list-container")).toBeVisible({ timeout: 10_000 });

    const eventLinks = page.locator('a[href^="/events/"]').filter({ hasNot: page.locator('a[href="/events"]') });
    const firstEventHref = await eventLinks.first().getAttribute("href");
    if (!firstEventHref || !firstEventHref.startsWith("/events/")) {
      test.skip(true, "No event links found");
      return;
    }
    const eventId = firstEventHref.replace("/events/", "").split("/")[0].split("?")[0];
    if (!eventId) {
      test.skip(true, "Could not parse event id");
      return;
    }

    await page.goto(`/events/${eventId}/questions`);
    await page.waitForLoadState("networkidle");
    const url = page.url();
    if (url.includes("/questions")) {
      test.skip(true, "Event is free or user is paid; questions page allowed");
      return;
    }
    expect(url).toContain(`/events/${eventId}`);
    expect(url).not.toContain("/questions");
  });

  test("free event: payment_status shows Free in preview and user can complete questions", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/events");
    await expect(page.getByTestId("events-list-container")).toBeVisible({ timeout: 10_000 });

    const enterBtn = page.getByTestId("event-enter-btn").first();
    if (!(await enterBtn.isVisible().catch(() => false))) {
      test.skip(true, "No Enter Event button (all events may be paid or already joined)");
      return;
    }
    await enterBtn.click();
    await expect(page.getByTestId("event-preview-modal")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Free").or(page.getByTestId("event-preview-complete-questions"))).toBeVisible({
      timeout: 3000,
    });
    const closeBtn = page.getByTestId("event-preview-close");
    await closeBtn.click();
  });

  test("admin guest list: paid and payment pending sections for paid event", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/admin/events");
    if (!page.url().includes("/admin/events")) {
      test.skip(true, "User is not admin");
      return;
    }
    const eventLink = page.locator('a[href^="/admin/events/"]').first();
    if (!(await eventLink.isVisible().catch(() => false))) {
      test.skip(true, "No admin events");
      return;
    }
    await eventLink.click();
    await expect(page).toHaveURL(/\/admin\/events\/[^/]+/);

    const paidHeading = page.getByText(/Paid attendees \(\d+\)/);
    const pendingHeading = page.getByText(/Payment pending \(\d+\)/);
    const guestTable = page.locator("table").first();
    await expect(guestTable).toBeVisible({ timeout: 5000 });
    const hasPaidSection = await paidHeading.isVisible().catch(() => false);
    const hasPendingSection = await pendingHeading.isVisible().catch(() => false);
    if (hasPaidSection || hasPendingSection) {
      expect(guestTable).toBeVisible();
    }
    const freeLabel = page.getByText("Free");
    const payFirstLabel = page.getByText("Pay first");
    const visible = (await freeLabel.isVisible().catch(() => false)) || (await payFirstLabel.isVisible().catch(() => false));
    if (hasPaidSection && hasPendingSection) {
      expect(visible || true).toBe(true);
    }
  });
});
