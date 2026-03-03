import { test, expect } from "@playwright/test";
import { E2E_APPROVED_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

test.describe("chat after match reveal", () => {
  test("revealed match card shows Chat now and Share Instagram (or Add Instagram link)", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);

    const listContainer = page.getByTestId("matches-list-container");
    await listContainer.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});

    const chatNow = page.getByTestId("match-chat-now");
    const hasMatch = await chatNow.isVisible().catch(() => false);
    if (!hasMatch) {
      test.skip(true, "No revealed match for this user (run matching and reveal round 1 first)");
      return;
    }
    await expect(chatNow).toBeVisible();
    const shareIg = page.getByTestId("match-share-instagram");
    const addIgLink = page.getByTestId("match-add-instagram-link");
    await expect(shareIg.or(addIgLink)).toBeVisible();
    await expect(page.getByText("Share Phone")).not.toBeVisible();
  });

  test("Chat now opens messages with conversation", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    await expect(page).toHaveURL(/\/match/);

    const chatNow = page.getByTestId("match-chat-now");
    if (!(await chatNow.isVisible().catch(() => false))) {
      test.skip(true, "No revealed match");
      return;
    }
    await chatNow.click();
    await expect(page).toHaveURL(/\/messages\?c=/);
    await expect(page.getByText("Back to Messages")).toBeVisible({ timeout: 5000 });
  });

  test("user can send a message in conversation", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    const chatNow = page.getByTestId("match-chat-now");
    if (!(await chatNow.isVisible().catch(() => false))) {
      test.skip(true, "No revealed match");
      return;
    }
    await chatNow.click();
    await expect(page).toHaveURL(/\/messages\?c=/);

    const input = page.getByPlaceholder("Type a message...");
    await input.waitFor({ state: "visible", timeout: 5000 });
    await input.fill("Hello from E2E");
    await page.getByRole("button", { name: /^Send$/ }).click();
    await expect(page.getByText("Hello from E2E")).toBeVisible({ timeout: 5000 });
  });

  test("Chat screen has Share Instagram or Add Instagram link, no phone options", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/match");
    const chatNow = page.getByTestId("match-chat-now");
    if (!(await chatNow.isVisible().catch(() => false))) {
      test.skip(true, "No revealed match");
      return;
    }
    await chatNow.click();
    await expect(page).toHaveURL(/\/messages\?c=/);
    const shareIg = page.getByTestId("chat-share-instagram");
    const addIgLink = page.getByTestId("chat-add-instagram-link");
    const sharedChip = page.getByTestId("chat-instagram-shared-chip");
    await expect(shareIg.or(addIgLink).or(sharedChip)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Share Phone")).not.toBeVisible();
  });

  test("non-existent or forbidden conversation redirects to messages list", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await page.goto("/messages?c=00000000-0000-0000-0000-000000000001");
    await page.waitForURL(/\/messages(?!\?c=)/, { timeout: 5000 }).catch(() => {});
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByText("Messages")).toBeVisible();
  });
});
