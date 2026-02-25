import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, gotoAndAssertTitle, isChatEnabled, loginViaRegister } from '../utils';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Navigate to all pages via nav links', async ({ page }) => {
    await test.step('Start at home page', async () => {
      await page.goto('/');
      await expect(page.locator('[data-testid="home-title"]')).toBeVisible();
    });

    await test.step('Guest sees Register only', async () => {
      await expect(page.locator('[data-testid="nav-register"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-events"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-match"]')).not.toBeVisible();
    });

    await test.step('Login and navigate to Events/Match', async () => {
      await page.click('[data-testid="nav-register"]');
      await expect(page).toHaveURL('/register');
      await loginViaRegister(page);

      await page.click('[data-testid="nav-match"]');
      await gotoAndAssertTitle(page, '/match', 'match-title');

      await page.click('[data-testid="nav-events"]');
      await gotoAndAssertTitle(page, '/events', 'events-title');
    });
  });

  test('Messages link visibility based on feature flag', async ({ page }) => {
    await loginViaRegister(page);
    
    const messagesLink = page.locator('[data-testid="nav-messages"]');
    const chatEnabled = await isChatEnabled(page);

    if (chatEnabled) {
      await test.step('Messages link should be visible when chat enabled', async () => {
        await expect(messagesLink).toBeVisible();
        
        // Click and verify it navigates to messages
        await messagesLink.click();
        await expect(page).toHaveURL(/\/messages/);
      });
    } else {
      await test.step('Messages link should be hidden when chat disabled', async () => {
        await expect(messagesLink).not.toBeVisible();
      });
    }
  });

  test('Home CTAs navigate correctly', async ({ page }) => {
    await page.goto('/');

    await test.step('Click "Book Your Slot" CTA', async () => {
      await page.click('[data-testid="home-cta-onboarding"]');
      await expect(page).toHaveURL('/onboarding');
      await expect(page.locator('[data-testid="onboarding-name"]')).toBeVisible();
    });

    await test.step('Navigate back and click "Sign Up" CTA', async () => {
      await page.goto('/');
      await page.click('[data-testid="home-cta-match"]');
      // Sign Up goes to /register - verify it loads
      await expect(page).toHaveURL('/register');
    });
  });
});


