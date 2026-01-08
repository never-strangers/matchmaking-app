import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, safeExpectVisible } from './utils';

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
      await expect(title).toContainText('Meet your new');
    });
  });

  test('All main pages load without crash', async ({ page }) => {
    const routes = [
      { path: '/', testId: 'home-title' },
      { path: '/onboarding', testId: 'onboarding-name' },
      { path: '/events', testId: 'events-title' },
      { path: '/match', testId: 'match-title' },
      { path: '/admin', testId: 'admin-title' },
    ];

    for (const route of routes) {
      await test.step(`Load ${route.path}`, async () => {
        await page.goto(route.path);
        await safeExpectVisible(page, route.testId);
      });
    }
  });

  test('Messages page loads if chat enabled', async ({ page }) => {
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


