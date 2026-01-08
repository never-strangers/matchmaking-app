import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, safeExpectVisible } from './utils';

test.describe('Events', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Events list displays and join functionality works', async ({ page }) => {
    await test.step('Navigate to events page', async () => {
      await page.goto('/events');
      await safeExpectVisible(page, 'events-title');
    });

    await test.step('Verify events are displayed', async () => {
      // Wait for at least one event card
      await page.waitForSelector('[data-testid^="event-card-"]', { timeout: 5000 });
      const eventCards = page.locator('[data-testid^="event-card-"]');
      const count = await eventCards.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Join first event', async () => {
      // Find first event card
      const firstEventCard = page.locator('[data-testid^="event-card-"]').first();
      const eventTestId = await firstEventCard.getAttribute('data-testid');
      
      if (eventTestId) {
        const eventId = eventTestId.replace('event-card-', '');
        const joinButton = page.locator(`[data-testid="event-join-${eventId}"]`);
        
        // Only join if button is visible (not already joined)
        if (await joinButton.isVisible().catch(() => false)) {
          await joinButton.click();
          
          // Wait for join button to disappear
          await expect(joinButton).not.toBeVisible({ timeout: 2000 });
          
          // Verify joined indicator appears
          const joinedIndicator = page.locator(`[data-testid="event-joined-${eventId}"]`);
          await expect(joinedIndicator).toBeVisible({ timeout: 2000 });
        }
      }
    });
  });

  test('Joined event status persists after refresh', async ({ page }) => {
    await test.step('Join an event', async () => {
      await page.goto('/events');
      await page.waitForSelector('[data-testid^="event-card-"]', { timeout: 5000 });
      
      const firstEventCard = page.locator('[data-testid^="event-card-"]').first();
      const eventTestId = await firstEventCard.getAttribute('data-testid');
      
      if (eventTestId) {
        const eventId = eventTestId.replace('event-card-', '');
        const joinButton = page.locator(`[data-testid="event-join-${eventId}"]`);
        
        if (await joinButton.isVisible().catch(() => false)) {
          await joinButton.click();
          await expect(joinButton).not.toBeVisible({ timeout: 2000 });
        }
      }
    });

    await test.step('Refresh and verify joined status persists', async () => {
      await page.reload();
      await page.waitForSelector('[data-testid^="event-card-"]', { timeout: 5000 });
      
      // Find the event we joined
      const firstEventCard = page.locator('[data-testid^="event-card-"]').first();
      const eventTestId = await firstEventCard.getAttribute('data-testid');
      
      if (eventTestId) {
        const eventId = eventTestId.replace('event-card-', '');
        const joinedIndicator = page.locator(`[data-testid="event-joined-${eventId}"]`);
        
        // Joined indicator should be visible (demo mode persistence)
        await expect(joinedIndicator).toBeVisible({ timeout: 2000 });
        
        // Join button should NOT be visible
        const joinButton = page.locator(`[data-testid="event-join-${eventId}"]`);
        await expect(joinButton).not.toBeVisible();
      }
    });
  });

  test('Join multiple events', async ({ page }) => {
    await page.goto('/events');
    await page.waitForSelector('[data-testid^="event-card-"]', { timeout: 5000 });
    
    const eventCards = page.locator('[data-testid^="event-card-"]');
    const count = await eventCards.count();
    
    if (count >= 2) {
      await test.step('Join first event', async () => {
        const firstCard = eventCards.first();
        const eventTestId = await firstCard.getAttribute('data-testid');
        if (eventTestId) {
          const eventId = eventTestId.replace('event-card-', '');
          const joinButton = page.locator(`[data-testid="event-join-${eventId}"]`);
          if (await joinButton.isVisible().catch(() => false)) {
            await joinButton.click();
            await expect(joinButton).not.toBeVisible({ timeout: 2000 });
          }
        }
      });

      await test.step('Join second event', async () => {
        const secondCard = eventCards.nth(1);
        const eventTestId = await secondCard.getAttribute('data-testid');
        if (eventTestId) {
          const eventId = eventTestId.replace('event-card-', '');
          const joinButton = page.locator(`[data-testid="event-join-${eventId}"]`);
          if (await joinButton.isVisible().catch(() => false)) {
            await joinButton.click();
            await expect(joinButton).not.toBeVisible({ timeout: 2000 });
            
            // Both should show joined status
            const joinedIndicator = page.locator(`[data-testid="event-joined-${eventId}"]`);
            await expect(joinedIndicator).toBeVisible({ timeout: 2000 });
          }
        }
      });
    }
  });
});


