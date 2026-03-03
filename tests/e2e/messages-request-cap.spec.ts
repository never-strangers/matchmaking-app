import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

/**
 * Ensures /messages does not cause runaway network requests (polling/realtime
 * must be bounded). Open a conversation, wait 10s, assert GETs to the
 * messages API are at most 5 (initial + up to ~2 polls in 10s at 4s interval).
 * Requires: E2E users seeded, dev server running, and a revealed match (same as chat-after-reveal).
 */
test.describe("messages request cap", () => {
  test("GET /api/conversations/:id/messages is bounded when viewing a conversation", async ({
    page,
  }) => {
    test.setTimeout(45_000); // login + navigate + 10s wait
    const messageGetUrls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (
        req.method() === "GET" &&
        url.includes("/api/conversations/") &&
        url.includes("/messages")
      ) {
        messageGetUrls.push(url);
      }
    });

    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);

    const chatNow = page.getByTestId("match-chat-now");
    if (!(await chatNow.isVisible().catch(() => false))) {
      test.skip(true, "No revealed match (run matching and reveal first)");
      return;
    }
    await chatNow.click();
    await expect(page).toHaveURL(/\/messages\?c=/);

    await page.waitForTimeout(10_000);

    expect(
      messageGetUrls.length,
      `Expected at most 5 GETs to messages API in 10s, got ${messageGetUrls.length}`
    ).toBeLessThanOrEqual(5);
  });
});
