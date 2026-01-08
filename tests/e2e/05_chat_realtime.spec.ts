import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, isChatEnabled, setChatUser, waitForMessage } from './utils';

test.describe('Chat Realtime', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Two-tab realtime chat', async ({ browser }) => {
    // Skip if chat is disabled
    const page1 = await browser.newPage();
    await page1.goto('/');
    const chatEnabled = await isChatEnabled(page1);
    await page1.close();

    if (!chatEnabled) {
      test.skip(true, 'Chat is disabled (NEXT_PUBLIC_ENABLE_CHAT=false)');
      return;
    }

    // Create two tabs in same browser context
    const context = await browser.newContext();
    const page1Tab = await context.newPage();
    const page2Tab = await context.newPage();

    try {
      await test.step('Open conversation in both tabs', async () => {
        // Navigate both tabs to the same conversation
        const conversationId = 'conv_anna_mikhail';
        
        await page1Tab.goto(`/messages/${conversationId}`);
        await page2Tab.goto(`/messages/${conversationId}`);
        
        // Wait for pages to load
        await page1Tab.waitForLoadState('networkidle');
        await page2Tab.waitForLoadState('networkidle');
      });

      await test.step('Set user in Tab A to Mikhail', async () => {
        // Wait for chat header to load
        await page1Tab.waitForSelector('[data-testid="chat-user-switcher"]', {
          timeout: 5000,
        });
        
        // Set user to Mikhail
        await setChatUser(page1Tab, 'mikhail');
        await page1Tab.waitForLoadState('networkidle');
      });

      await test.step('Set user in Tab B to Anna', async () => {
        await page2Tab.waitForSelector('[data-testid="chat-user-switcher"]', {
          timeout: 5000,
        });
        
        await setChatUser(page2Tab, 'anna');
        await page2Tab.waitForLoadState('networkidle');
      });

      await test.step('Send message from Tab A (Mikhail)', async () => {
        const messageText = 'Hello from Mikhail! This is a realtime test message.';
        
        // Wait for message input
        await page1Tab.waitForSelector('[data-testid="message-input"]', {
          timeout: 5000,
        });
        
        // Type and send message
        await page1Tab.fill('[data-testid="message-input"]', messageText);
        await page1Tab.click('[data-testid="message-send"]');
        
        // Verify message appears in Tab A
        await waitForMessage(page1Tab, messageText, 3000);
      });

      await test.step('Verify message appears in Tab B without refresh', async () => {
        const messageText = 'Hello from Mikhail! This is a realtime test message.';
        
        // Use expect.poll to wait for message to appear via BroadcastChannel
        await expect.poll(
          async () => {
            const messages = page2Tab.locator('[data-testid^="message-bubble-"]');
            const count = await messages.count();
            if (count === 0) return false;
            
            // Check last few messages for our text
            const lastMessages = messages;
            const allText = await lastMessages.last().textContent();
            return allText?.includes(messageText) || false;
          },
          {
            message: 'Message should appear in Tab B via BroadcastChannel',
            timeout: 5000,
            intervals: [200, 500, 1000],
          }
        ).toBe(true);
      });

      await test.step('Send reply from Tab B (Anna)', async () => {
        const replyText = 'Hello Mikhail! Realtime works perfectly!';
        
        await page2Tab.fill('[data-testid="message-input"]', replyText);
        await page2Tab.click('[data-testid="message-send"]');
        
        // Verify reply appears in Tab B
        await waitForMessage(page2Tab, replyText, 3000);
      });

      await test.step('Verify reply appears in Tab A without refresh', async () => {
        const replyText = 'Hello Mikhail! Realtime works perfectly!';
        
        await expect.poll(
          async () => {
            const messages = page1Tab.locator('[data-testid^="message-bubble-"]');
            const count = await messages.count();
            if (count === 0) return false;
            
            const allText = await messages.last().textContent();
            return allText?.includes(replyText) || false;
          },
          {
            message: 'Reply should appear in Tab A via BroadcastChannel',
            timeout: 5000,
            intervals: [200, 500, 1000],
          }
        ).toBe(true);
      });

    } finally {
      await page1Tab.close();
      await page2Tab.close();
      await context.close();
    }
  });

  test('Chat conversation list displays correctly', async ({ page }) => {
    // Skip if chat disabled
    await page.goto('/');
    const chatEnabled = await isChatEnabled(page);
    
    if (!chatEnabled) {
      test.skip(true, 'Chat is disabled');
      return;
    }

    await test.step('Navigate to messages page', async () => {
      await page.goto('/messages');
      await page.waitForSelector('[data-testid="messages-title"]', {
        timeout: 5000,
      });
    });

    await test.step('Verify messages page loads', async () => {
      const title = page.locator('[data-testid="messages-title"]');
      await expect(title).toBeVisible();
    });

    await test.step('Verify user switcher is visible', async () => {
      const userSwitcher = page.locator('[data-testid="chat-user-switcher"]');
      await expect(userSwitcher).toBeVisible();
    });
  });

  test('Create conversation from match page', async ({ page }) => {
    // Skip if chat disabled
    await page.goto('/');
    const chatEnabled = await isChatEnabled(page);
    
    if (!chatEnabled) {
      test.skip(true, 'Chat is disabled');
      return;
    }

    await test.step('Set user to Mikhail', async () => {
      await page.goto('/messages');
      await page.waitForSelector('[data-testid="chat-user-switcher"]', { timeout: 5000 });
      
      const { setChatUser } = await import('./utils');
      await setChatUser(page, 'mikhail');
    });

    await test.step('Navigate to match and like Anna', async () => {
      await page.goto('/match');
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      if (await annaCard.isVisible().catch(() => false)) {
        await page.click('[data-testid="match-like-anna"]');
        await page.waitForSelector('[data-testid="match-created"]', { timeout: 2000 });
      }
    });

    await test.step('Click Message button and verify conversation opens', async () => {
      const messageButton = page.locator('[data-testid="match-message-anna"]');
      if (await messageButton.isVisible().catch(() => false)) {
        await messageButton.click();
        
        // Should navigate to conversation page
        await page.waitForURL(/\/messages\/conv_/, { timeout: 5000 });
        
        // Verify conversation title is visible
        const threadTitle = page.locator('[data-testid="chat-thread-title"]');
        await expect(threadTitle).toBeVisible({ timeout: 2000 });
      }
    });
  });
});


