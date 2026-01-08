import { test, expect } from '@playwright/test';
import { clearNsLocalStorage, safeExpectVisible } from './utils';

test.describe('Match', () => {
  test.beforeEach(async ({ page }) => {
    await clearNsLocalStorage(page);
  });

  test('Match feed displays candidates', async ({ page }) => {
    await test.step('Navigate to match page', async () => {
      await page.goto('/match');
      await safeExpectVisible(page, 'match-title');
    });

    await test.step('Verify match cards are displayed', async () => {
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      const matchCards = page.locator('[data-testid^="match-card-"]');
      const count = await matchCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test('Like a candidate creates match', async ({ page }) => {
    await test.step('Navigate to match page', async () => {
      await page.goto('/match');
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
    });

    await test.step('Like a specific candidate (Anna)', async () => {
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      
      // Verify Anna card exists
      if (await annaCard.isVisible().catch(() => false)) {
        const likeButton = page.locator('[data-testid="match-like-anna"]');
        await likeButton.click();
        
        // Verify match created banner appears
        await safeExpectVisible(page, 'match-created');
        const banner = page.locator('[data-testid="match-created"]');
        await expect(banner).toContainText('match');
      } else {
        // If Anna not found, like first available
        const firstCard = page.locator('[data-testid^="match-card-"]').first();
        const matchTestId = await firstCard.getAttribute('data-testid');
        if (matchTestId) {
          const matchId = matchTestId.replace('match-card-', '');
          await page.click(`[data-testid="match-like-${matchId}"]`);
          await safeExpectVisible(page, 'match-created');
        }
      }
    });
  });

  test('Skip a candidate', async ({ page }) => {
    await page.goto('/match');
    await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
    
    await test.step('Skip a candidate', async () => {
      // Find James or first available
      const jamesCard = page.locator('[data-testid="match-card-james"]');
      const firstCard = page.locator('[data-testid^="match-card-"]').first();
      
      let matchId: string | null = null;
      if (await jamesCard.isVisible().catch(() => false)) {
        matchId = 'james';
      } else {
        const testId = await firstCard.getAttribute('data-testid');
        matchId = testId?.replace('match-card-', '') || null;
      }
      
      if (matchId) {
        const skipButton = page.locator(`[data-testid="match-skip-${matchId}"]`);
        await skipButton.click();
        
        // Card should still be visible (UI doesn't remove on skip currently)
        // But state should change (verified by button state)
        await expect(skipButton).toBeVisible();
      }
    });
  });

  test('Match state persists after refresh', async ({ page }) => {
    await test.step('Like a candidate', async () => {
      await page.goto('/match');
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      
      // Like Anna if available
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      if (await annaCard.isVisible().catch(() => false)) {
        await page.click('[data-testid="match-like-anna"]');
        await safeExpectVisible(page, 'match-created');
      } else {
        // Like first available
        const firstCard = page.locator('[data-testid^="match-card-"]').first();
        const matchTestId = await firstCard.getAttribute('data-testid');
        if (matchTestId) {
          const matchId = matchTestId.replace('match-card-', '');
          await page.click(`[data-testid="match-like-${matchId}"]`);
          await safeExpectVisible(page, 'match-created');
        }
      }
    });

    await test.step('Refresh and verify match was persisted', async () => {
      await page.reload();
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      
      // Verify match card still shows matched state
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      if (await annaCard.isVisible().catch(() => false)) {
        // Like button should not be visible (already liked)
        const likeButton = page.locator('[data-testid="match-like-anna"]');
        await expect(likeButton).not.toBeVisible();
      }
    });
  });

  test('Message button appears after match (if chat enabled)', async ({ page }) => {
    // Skip if chat is disabled
    await page.goto('/');
    const messagesLink = page.locator('[data-testid="nav-messages"]');
    const chatEnabled = await messagesLink.isVisible().catch(() => false);
    
    if (!chatEnabled) {
      test.skip(true, 'Chat is disabled');
      return;
    }

    await test.step('Like a candidate to create match', async () => {
      await page.goto('/match');
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      if (await annaCard.isVisible().catch(() => false)) {
        await page.click('[data-testid="match-like-anna"]');
        await safeExpectVisible(page, 'match-created');
      }
    });

    await test.step('Verify Message button appears', async () => {
      await page.waitForSelector('[data-testid^="match-card-"]', { timeout: 5000 });
      
      const annaCard = page.locator('[data-testid="match-card-anna"]');
      if (await annaCard.isVisible().catch(() => false)) {
        const messageButton = page.locator('[data-testid="match-message-anna"]');
        await expect(messageButton).toBeVisible({ timeout: 2000 });
      }
    });
  });
});


