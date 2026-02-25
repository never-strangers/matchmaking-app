import { test, expect } from "@playwright/test";
import { E2E_PENDING_USER, E2E_APPROVED_USER, E2E_REJECTED_USER } from "../fixtures/e2e-users";
import {
  loginUser,
  assertPendingGating,
  assertApprovedAccess,
  openNavMenu,
} from "./authHelpers";

test.describe("auth journey", () => {
  test("pending user: login → /pending, events/matches redirect to /pending", async ({
    page,
  }) => {
    await loginUser(page, E2E_PENDING_USER);
    await assertPendingGating(page);
  });

  test("rejected user: login → /pending (same gating as pending)", async ({
    page,
  }) => {
    await loginUser(page, E2E_REJECTED_USER);
    await expect(page).toHaveURL(/\/pending/);
    await expect(page.getByTestId("pending-headline")).toBeVisible();
    await page.goto("/events");
    await expect(page).toHaveURL(/\/pending/);
  });

  test("approved user: events + matches + profile update + logout", async ({
    page,
  }) => {
    await loginUser(page, E2E_APPROVED_USER);

    // Events and matches load (ensures session is established)
    await assertApprovedAccess(page);

    // Profile update — same fields as registration (except password)
    await page.goto("/profile");
    const instagram = `e2e_profile_${Date.now()}`;
    const reason = `Updated by playwright ${Date.now()}`;
    await page.getByTestId("profile-first-name").fill("E2E");
    await page.getByTestId("profile-last-name").fill("Approved");
    await page.getByTestId("profile-city").selectOption("sg");
    await page.getByTestId("profile-dob").fill("1995-06-15");
    await page.getByTestId("profile-gender").selectOption("male");
    await page.getByTestId("profile-attracted-to-women").check();
    await page.getByTestId("profile-looking-for-friends").check();
    await page.getByTestId("profile-preferred-language").selectOption("en");
    await page.getByTestId("profile-instagram").fill(instagram);
    await page.getByTestId("profile-reason").fill(reason);
    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-save-success")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("profile-first-name")).toHaveValue("E2E");
    await expect(page.getByTestId("profile-last-name")).toHaveValue("Approved");
    await expect(page.getByTestId("profile-city")).toHaveValue("sg");
    await expect(page.getByTestId("profile-dob")).toHaveValue("1995-06-15");
    await expect(page.getByTestId("profile-gender")).toHaveValue("male");
    await expect(page.getByTestId("profile-preferred-language")).toHaveValue("en");
    await expect(page.getByTestId("profile-instagram")).toHaveValue(instagram);
    await expect(page.getByTestId("profile-reason")).toHaveValue(reason);

    // Logout
    await page.goto("/events");
    await openNavMenu(page);
    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL("/");

    // Protected route redirects to login
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});
