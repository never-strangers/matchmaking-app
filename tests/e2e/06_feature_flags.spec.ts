import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, isChatEnabled } from './utils';

test.describe('Feature Flags', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Chat disabled behavior', async ({ page }) => {
    await test.step('Navigate to home and check nav', async () => {
      await page.goto('/');
      
      const messagesLink = page.locator('[data-testid="nav-messages"]');
      const chatEnabled = await isChatEnabled(page);
      
      if (chatEnabled) {
        await test.step('Chat enabled: Messages link visible', async () => {
          await expect(messagesLink).toBeVisible();
        });
      } else {
        await test.step('Chat disabled: Messages link hidden', async () => {
          await expect(messagesLink).not.toBeVisible();
        });
      }
    });

    await test.step('Navigate to messages page directly', async () => {
      await page.goto('/messages');
      
      const chatEnabled = await isChatEnabled(page);
      
      if (chatEnabled) {
        await test.step('Chat enabled: Messages page shows conversations', async () => {
          // Should see messages title, not disabled message
          const messagesTitle = page.locator('[data-testid="messages-title"]');
          const chatDisabled = page.locator('[data-testid="chat-disabled"]');
          
          await expect(messagesTitle).toBeVisible({ timeout: 5000 });
          await expect(chatDisabled).not.toBeVisible();
        });
      } else {
        await test.step('Chat disabled: Messages page shows disabled message', async () => {
          const chatDisabled = page.locator('[data-testid="chat-disabled"]');
          await expect(chatDisabled).toBeVisible({ timeout: 5000 });
          
          // Should contain disabled message text
          await expect(chatDisabled).toContainText('Chat functionality is currently disabled');
        });
      }
    });
  });

  test('Chat conversation page when disabled', async ({ page }) => {
    await page.goto('/messages/conv_test');
    
    const chatEnabled = await isChatEnabled(page);
    
    if (!chatEnabled) {
      await test.step('Chat disabled: Conversation page shows disabled message', async () => {
        const chatDisabled = page.locator('[data-testid="chat-disabled"]');
        await expect(chatDisabled).toBeVisible({ timeout: 5000 });
      });
    }
  });
});


