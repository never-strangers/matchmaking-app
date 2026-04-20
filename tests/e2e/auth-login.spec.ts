import { test, expect, Page } from "@playwright/test";
import { E2E_APPROVED_USER, E2E_PENDING_USER } from "../fixtures/e2e-users";
import { loginUser } from "./authHelpers";

/** Navigate to /login and reveal the login form (bypassing splash screen). */
async function openLoginForm(page: Page) {
  await page.goto("/login", { waitUntil: "load" });
  const splashCta = page.getByTestId("splash-login-cta");
  if (await splashCta.isVisible()) await splashCta.click();
  await page.getByTestId("login-submit").waitFor({ state: "visible" });
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

test.describe("login — smoke", () => {
  test("login page renders splash screen with CTA buttons", async ({ page }) => {
    await page.goto("/login");
    // Splash screen is shown first; login form is hidden
    await expect(page.getByTestId("splash-login-cta")).toBeVisible();
    await expect(page.getByTestId("login-submit")).not.toBeVisible();
  });

  test("clicking Login opens the login form", async ({ page }) => {
    await openLoginForm(page);
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });
});

// ─── Error cases ──────────────────────────────────────────────────────────────

test.describe("login — error cases", () => {
  test("wrong password shows login error", async ({ page }) => {
    await openLoginForm(page);
    await page.getByTestId("login-email").fill(E2E_APPROVED_USER.email);
    await page.getByTestId("login-password").fill("WrongPassword123!");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 10_000 });
  });

  test("non-existent email shows login error", async ({ page }) => {
    await openLoginForm(page);
    await page.getByTestId("login-email").fill("nobody-e2e@example.invalid");
    await page.getByTestId("login-password").fill("AnyPassword1!");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Forgot password ──────────────────────────────────────────────────────────

test.describe("login — forgot password", () => {
  test("forgot password form appears and shows confirmation after submit", async ({ page }) => {
    await openLoginForm(page);

    await page.getByTestId("login-forgot-password").click();
    await expect(page.getByTestId("forgot-email")).toBeVisible();
    await expect(page.getByTestId("forgot-submit")).toBeVisible();

    await page.getByTestId("forgot-email").fill(E2E_APPROVED_USER.email);
    await page.getByTestId("forgot-submit").click();

    // After submission the form is replaced with the sent confirmation paragraph
    await expect(page.getByTestId("forgot-sent")).toBeVisible({ timeout: 15_000 });
  });

  test("submit button is disabled while reset request is in flight", async ({ page }) => {
    await openLoginForm(page);
    await page.getByTestId("login-forgot-password").click();
    await page.getByTestId("forgot-email").fill(E2E_APPROVED_USER.email);

    // Click and immediately check — button must be disabled during the API call
    await page.getByTestId("forgot-submit").click();
    // The button should be disabled at least briefly (forgotLoading=true)
    // Use a short timeout since loading is fast
    await expect(page.getByTestId("forgot-submit").or(page.getByTestId("forgot-sent")))
      .toBeVisible({ timeout: 1_000 });
    // If the form is still visible (not yet transitioned to sent state), button must be disabled
    const formStillVisible = await page.getByTestId("forgot-submit").isVisible();
    if (formStillVisible) {
      await expect(page.getByTestId("forgot-submit")).toBeDisabled();
    }
    // Either way, confirm the flow completes: sent confirmation appears
    await expect(page.getByTestId("forgot-sent")).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Success & redirect ───────────────────────────────────────────────────────

test.describe("login — success", () => {
  test("approved user login redirects to /events", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await expect(page).toHaveURL(/\/events/);
  });

  test("pending user login redirects to /pending", async ({ page }) => {
    await loginUser(page, E2E_PENDING_USER);
    await expect(page).toHaveURL(/\/pending/);
  });

  test("authenticated user visiting /login is redirected away", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);
    await expect(page).toHaveURL(/\/events/);

    await page.goto("/login");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("post-logout: protected route redirects to /login", async ({ page }) => {
    await loginUser(page, E2E_APPROVED_USER);

    // Open nav menu and wait for logout button to be visible
    await page.getByTestId("nav-menu-toggle").click();
    await page.getByTestId("logout-button").waitFor({ state: "visible" });

    // Logout fires window.location.href="/" after an async fetch — use waitForURL
    await Promise.all([
      page.waitForURL(/\/(login|$)/, { timeout: 20_000 }),
      page.getByTestId("logout-button").click(),
    ]);

    // Navigating to a protected route now should redirect to login
    await page.goto("/events");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
