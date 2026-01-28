import { test, expect } from '@playwright/test';
import { clearNsLocalStorage } from './utils';

test.describe('Guest gating', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Guest cannot access /events directly', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
  });
});

