import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, safeExpectVisible, loginViaRegister } from './utils';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Home page loads and displays title', async ({ page }) => {
    await test.step('Navigate to home page', async () => {
      await page.goto('/');
    });

    await test.step('Assert home title is visible', async () => {
      await safeExpectVisible(page, 'home-title');
      const title = page.locator('[data-testid="home-title"]');
      await expect(title).toContainText('A New Way to Meet');
    });
  });

  test('All main pages load without crash', async ({ page }) => {
    await test.step('Public pages load', async () => {
      await page.goto('/');
      await safeExpectVisible(page, 'home-title');

      await page.goto('/register');
      await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
    });

    await test.step('Protected pages load after login', async () => {
      await loginViaRegister(page);

      await page.goto('/onboarding');
      await safeExpectVisible(page, 'onboarding-name');

      await page.goto('/events');
      await safeExpectVisible(page, 'events-title');

      await page.goto('/match');
      await safeExpectVisible(page, 'match-title');
    });
  });

  test('Messages page loads if chat enabled', async ({ page }) => {
    await loginViaRegister(page);
    await page.goto('/messages');
    
    // Check if chat is enabled by looking for messages title or disabled message
    const messagesTitle = page.locator('[data-testid="messages-title"]');
    const chatDisabled = page.locator('[data-testid="chat-disabled"]');
    
    const isEnabled = await messagesTitle.isVisible().catch(() => false);
    const isDisabled = await chatDisabled.isVisible().catch(() => false);
    
    // One of them must be visible
    expect(isEnabled || isDisabled).toBe(true);
  });
});


