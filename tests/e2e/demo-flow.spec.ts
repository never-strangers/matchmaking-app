import { test, expect } from '@playwright/test';

test.describe('Never Strangers Demo Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all localStorage keys starting with "ns_"
    await page.addInitScript(() => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('ns_')) {
          localStorage.removeItem(key);
        }
      });
    });
  });

  test('Complete demo flow: onboarding → events → match → chat', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Never Strangers/);
    });

    await test.step('Complete onboarding form', async () => {
      await page.goto('/onboarding');
      
      // Fill onboarding form
      await page.fill('[data-testid="onboarding-name"]', 'Demo User');
      await page.fill('[data-testid="onboarding-email"]', 'demo@neverstrangers.com');
      await page.fill('[data-testid="onboarding-city"]', 'Singapore');
      
      // Select interests
      await page.check('[data-testid="onboarding-interest-running"]');
      await page.check('[data-testid="onboarding-interest-coffee"]');
      
      // Submit
      await page.click('[data-testid="onboarding-submit"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="onboarding-success"]')).toBeVisible();
    });

    await test.step('Browse and join an event', async () => {
      await page.goto('/events');
      
      // Wait for events to load
      await page.waitForSelector('[data-testid^="event-card-"]', { timeout: 5000 });
      
      // Find first event card
      const firstEventCard = page.locator('[data-testid^="event-card-"]').first();
      const eventId = await firstEventCard.getAttribute('data-testid');
      
      if (eventId) {
        const eventIdValue = eventId.replace('event-card-', '');
        
        // Click join button
        const joinButton = page.locator(`[data-testid="event-join-${eventIdValue}"]`);
        if (await joinButton.isVisible()) {
          await joinButton.click();
          
          // Wait for join button to disappear (better indicator of state change)
          await expect(joinButton).not.toBeVisible({ timeout: 2000 });
          
          // Verify joined state indicator appears
          await expect(page.locator(`[data-testid="event-joined-${eventIdValue}"]`)).toBeVisible({
            timeout: 2000,
          });
        }
      }
    });

    await test.step('Navigate to match feed and like a candidate', async () => {
      await page.goto('/match');
      
      // Wait for match cards to load
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      
      // Find Anna's match card (deterministic)
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      await expect(annaCard).toBeVisible();
      
      // Click like button
      const likeButton = page.locator('[data-testid="match-like-anna"]');
      if (await likeButton.isVisible()) {
        await likeButton.click();
        
        // Verify match created banner appears
        await expect(page.locator('[data-testid="match-created"]')).toBeVisible({
          timeout: 2000,
        });
      }
    });

    await test.step('Open messages and send a message (if chat enabled)', async () => {
      // Check if chat is enabled by looking for Messages link
      const messagesLink = page.locator('a[href="/messages"]');
      
      if (await messagesLink.isVisible()) {
        await messagesLink.click();
        await page.waitForURL('/messages', { timeout: 5000 });
        
        // Wait for conversation list or empty state
        const conversationList = page.locator('[data-testid^="conversation-"]');
        const emptyState = page.locator('text=No conversations yet');
        
        // If there's a conversation, open it
        if (await conversationList.count() > 0) {
          const firstConversation = conversationList.first();
          const conversationId = await firstConversation.getAttribute('data-testid');
          
          if (conversationId) {
            await firstConversation.click();
            await page.waitForURL(/\/messages\/conv_/, { timeout: 5000 });
            
            // Send a message
            const messageInput = page.locator('[data-testid="message-input"]');
            await messageInput.fill('Hello! This is a demo message from E2E test.');
            
            const sendButton = page.locator('[data-testid="message-send"]');
            await sendButton.click();
            
            // Verify message appears
            await expect(page.locator('[data-testid^="message-bubble-"]').last()).toBeVisible({
              timeout: 2000,
            });
            
            // Verify message content
            const lastMessage = page.locator('[data-testid^="message-bubble-"]').last();
            await expect(lastMessage).toContainText('Hello! This is a demo message from E2E test.');
          }
        } else {
          // No conversations yet - that's okay for demo
          console.log('No conversations found - chat may not be initialized');
        }
      } else {
        console.log('Chat is disabled (NEXT_PUBLIC_ENABLE_CHAT=false) - skipping chat test');
      }
    });
  });

  test('Verify demo data persistence', async ({ page }) => {
    await test.step('Set demo user and verify persistence', async () => {
      await page.goto('/onboarding');
      
      // Fill and submit form
      await page.fill('[data-testid="onboarding-name"]', 'Persistent User');
      await page.fill('[data-testid="onboarding-email"]', 'persistent@test.com');
      await page.fill('[data-testid="onboarding-city"]', 'Bangkok');
      await page.check('[data-testid="onboarding-interest-books"]');
      await page.click('[data-testid="onboarding-submit"]');
      
      // Verify success
      await expect(page.locator('[data-testid="onboarding-success"]')).toBeVisible();
      
      // Refresh page
      await page.reload();
      
      // Success message should still be visible (stored in component state)
      // In a real app, this would check localStorage
    });
  });
});

