import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, loginViaRegister } from './utils';

/**
 * Full Happy Path Demo Flow Test
 * 
 * This test validates the complete CEO demo flow:
 * MVP version (phone login):
 * 1. Phone login (/register) → redirect /events
 * 2. Ensure user can access core demo pages (events/match/messages gating)
 */

test.describe('Happy Path Demo Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all demo data
    await clearNsLocalStorage(page);
    await page.goto('/');
  });

  test('Phone login redirects to events', async ({ page }) => {
    await loginViaRegister(page, { name: 'Mikhail', phoneDigits: '81234567' });
    await expect(page.locator('[data-testid="nav-events"]')).toBeVisible();
  });
});
