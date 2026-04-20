import { expect, Page } from "@playwright/test";
import type { TestUser } from "../utils/testUser";
import { approvedStorageStatePath, pendingStorageStatePath } from "../utils/testUser";

/** Minimal credentials for login (used by both TestUser and E2E predefined users). */
export type LoginCredentials = { email: string; password: string };

export async function registerUser(page: Page, user: TestUser): Promise<void> {
  await page.goto("/register");
  await page.getByTestId("register-email").fill(user.email);
  if (user.firstName) await page.getByTestId("register-first-name").fill(user.firstName);
  if (user.lastName) await page.getByTestId("register-last-name").fill(user.lastName);
  await page.getByTestId("register-password").fill(user.password);
  if (user.city) await page.getByTestId("register-city").selectOption(user.city);
  await page.getByTestId("register-dob").fill(user.dob);
  await page.getByTestId(`register-gender-${user.gender}`).check();
  (user.attractedTo ?? []).forEach((v) => page.getByTestId(`register-attracted-to-${v}`).check());
  (user.lookingFor ?? []).forEach((v) => page.getByTestId(`register-looking-for-${v}`).check());
  await page.getByTestId("register-reason").fill(user.reason);
  await page.getByTestId("register-instagram").fill(user.instagram);
  await page
    .getByTestId("register-preferred-language")
    .selectOption(user.preferredLanguage ? { value: user.preferredLanguage } : { index: 0 });
  await page.getByTestId("register-agreement-accurate").check();
  await page.getByTestId("register-submit").click();
}

export async function loginUser(page: Page, credentials: LoginCredentials): Promise<void> {
  await page.goto("/login", { waitUntil: "load" });
  // The login page shows a splash screen first; click the Login CTA to reveal the form.
  const splashCta = page.getByTestId("splash-login-cta");
  if (await splashCta.isVisible()) {
    await splashCta.click();
  }
  await page.getByTestId("login-submit").waitFor({ state: "visible" });
  await page.getByTestId("login-email").fill(credentials.email);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  // Wait for post-login redirect (ensure E2E users are seeded: npm run seed:e2e)
  await expect(page).toHaveURL(/\/(events|pending)/, { timeout: 15_000 });
}

export async function openNavMenu(page: Page): Promise<void> {
  await page.getByTestId("nav-menu-toggle").click();
}

export async function assertPendingGating(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/pending/);
  await expect(page.getByTestId("pending-headline")).toBeVisible();

  await page.goto("/events");
  await expect(page).toHaveURL(/\/pending/);

  await page.goto("/match");
  await expect(page).toHaveURL(/\/pending/);
}

export async function assertApprovedAccess(page: Page): Promise<void> {
  await page.goto("/events");
  await expect(page).toHaveURL(/\/events/);
  await expect(page.getByTestId("events-headline")).toBeVisible();
  await expect(page.getByTestId("events-list-container")).toBeVisible();

  await page.goto("/match");
  await expect(page).toHaveURL(/\/match/);
  // Page may show match list (headline + list) or empty state when there are no matches
  await expect(
    page.getByTestId("matches-headline").or(page.getByRole("heading", { name: "No matches yet" }))
  ).toBeVisible();
}

export async function savePendingStorageState(page: Page): Promise<void> {
  await page.context().storageState({ path: pendingStorageStatePath });
}

export async function saveApprovedStorageState(page: Page): Promise<void> {
  await page.context().storageState({ path: approvedStorageStatePath });
}

/**
 * Logs in and navigates to /admin/events. Returns the first event's ID if the
 * user has admin access and at least one event exists; otherwise returns null.
 *
 * All admin tests that depend on a real event should call this helper and skip
 * when it returns null:
 *
 *   const eventId = await getFirstAdminEventId(page, E2E_APPROVED_USER);
 *   if (!eventId) { test.skip(true, "No admin events available"); return; }
 */
export async function getFirstAdminEventId(
  page: Page,
  credentials: LoginCredentials
): Promise<string | null> {
  await loginUser(page, credentials);
  await page.goto("/admin/events", { waitUntil: "networkidle" });
  if (!page.url().includes("/admin/events")) return null;

  const firstEventLink = page.locator('a[href^="/admin/events/"]').first();
  const isVisible = await firstEventLink.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!isVisible) return null;

  const href = await firstEventLink.getAttribute("href");
  if (!href) return null;

  return href.replace("/admin/events/", "").split("?")[0].split("/")[0] || null;
}
