import { test, expect } from "@playwright/test";
import { createUniqueTestUser } from "../utils/testUser";
import { registerUser } from "./authHelpers";

/** Set a date input value bypassing browser max/min constraint validation. */
async function forceDateValue(page: import("@playwright/test").Page, testId: string, value: string) {
  await page.locator(`[data-testid="${testId}"]`).evaluate(
    (el: HTMLInputElement, v: string) => {
      // Remove constraints so browser form validation doesn't block submit
      el.removeAttribute("max");
      el.removeAttribute("min");
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value
  );
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

test.describe("registration — smoke", () => {
  test("register page loads with all key fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("register-email")).toBeVisible();
    await expect(page.getByTestId("register-password")).toBeVisible();
    await expect(page.getByTestId("register-city")).toBeVisible();
    await expect(page.getByTestId("register-dob")).toBeVisible();
    await expect(page.getByTestId("register-reason")).toBeVisible();
    await expect(page.getByTestId("register-agreement-accurate")).toBeVisible();
    await expect(page.getByTestId("register-submit")).toBeVisible();
    await expect(page.getByTestId("register-login-link")).toBeVisible();
  });

  test("DOB input enforces 21+ via max attribute", async ({ page }) => {
    await page.goto("/register");
    const maxAttr = await page.getByTestId("register-dob").getAttribute("max");
    expect(maxAttr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // max should be today − 21 years (within 1 day for boundary)
    const maxDate = new Date(maxAttr!);
    const today = new Date();
    const expected = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate());
    expect(Math.abs(maxDate.getTime() - expected.getTime())).toBeLessThanOrEqual(
      24 * 60 * 60 * 1000
    );
  });
});

// ─── Client-side validation ───────────────────────────────────────────────────

test.describe("registration — client-side validation", () => {
  test("underage DOB (< 21) shows age error", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("test@example.com");
    await page.getByTestId("register-password").fill("ValidPass1!");
    await page.getByTestId("register-city").selectOption("sg");
    // Bypass the browser max attribute so React's validation fires
    await forceDateValue(page, "register-dob", "2015-06-15");
    await page.getByTestId("register-reason").fill("test reason");
    await page.getByTestId("register-agreement-accurate").check();
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(/21/i);
  });

  test("short password (< 8 chars) shows password error", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("test@example.com");
    await page.getByTestId("register-password").fill("short");
    await page.getByTestId("register-city").selectOption("sg");
    await page.getByTestId("register-dob").fill("1990-01-01");
    await page.getByTestId("register-reason").fill("test reason");
    await page.getByTestId("register-agreement-accurate").check();
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(/8 characters/i);
  });

  test("missing city shows city error", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("test@example.com");
    await page.getByTestId("register-password").fill("ValidPass1!");
    // city left as empty default
    await page.getByTestId("register-dob").fill("1990-01-01");
    await page.getByTestId("register-reason").fill("test reason");
    await page.getByTestId("register-agreement-accurate").check();
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(/city/i);
  });

  test("missing reason shows reason error", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("test@example.com");
    await page.getByTestId("register-password").fill("ValidPass1!");
    await page.getByTestId("register-city").selectOption("sg");
    await page.getByTestId("register-dob").fill("1990-01-01");
    // reason left blank
    await page.getByTestId("register-agreement-accurate").check();
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(/why Never Strangers/i);
  });

  test("missing accurate agreement shows agreement error", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-email").fill("test@example.com");
    await page.getByTestId("register-password").fill("ValidPass1!");
    await page.getByTestId("register-city").selectOption("sg");
    await page.getByTestId("register-dob").fill("1990-01-01");
    await page.getByTestId("register-reason").fill("test reason");
    // agreement-accurate NOT checked
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("register-error")).toContainText(/confirm/i);
  });
});

// ─── Success flow ─────────────────────────────────────────────────────────────

test.describe("registration — success", () => {
  test("new user registration → verification page", async ({ page }) => {
    const user = createUniqueTestUser();

    await registerUser(page, user);

    // Should land on the verification page (account created)
    await expect(page).toHaveURL(/\/register\/verification/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /account created/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  });

  test("newly registered user can log in and is gated to /pending", async ({ page }) => {
    const user = createUniqueTestUser();

    await registerUser(page, user);
    await expect(page).toHaveURL(/\/register\/verification/, { timeout: 15_000 });

    // Now log in — new users are pending_verification
    await page.goto("/login", { waitUntil: "load" });
    const splashCta = page.getByTestId("splash-login-cta");
    if (await splashCta.isVisible()) await splashCta.click();
    await page.getByTestId("login-submit").waitFor({ state: "visible" });
    await page.getByTestId("login-email").fill(user.email);
    await page.getByTestId("login-password").fill(user.password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/(pending|events)/, { timeout: 15_000 });
  });
});

// ─── Duplicate detection ──────────────────────────────────────────────────────

test.describe("registration — duplicate detection", () => {
  test("rejected user cannot re-register with the same email", async ({ page }) => {
    const { E2E_REJECTED_USER } = await import("../fixtures/e2e-users");

    await page.goto("/register");
    await page.getByTestId("register-email").fill(E2E_REJECTED_USER.email);
    await page.getByTestId("register-password").fill(E2E_REJECTED_USER.password);
    await page.getByTestId("register-city").selectOption("sg");
    await page.getByTestId("register-dob").fill("1990-01-01");
    await page.getByTestId("register-agreement-accurate").check();
    await page.getByTestId("register-reason").fill("test");
    await page.getByTestId("register-submit").click();

    await expect(
      page.getByTestId("register-error").filter({ hasText: /previously rejected/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
