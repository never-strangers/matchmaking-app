import { Page, expect } from '@playwright/test';

/**
 * Clear all localStorage keys starting with "ns_"
 */
export async function clearNsLocalStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('ns_')) {
        localStorage.removeItem(key);
      }
    });
  });
}

/**
 * Set chat user via dropdown
 * userId should be lowercase (e.g., "mikhail", "anna")
 */
export async function setChatUser(page: Page, userId: string): Promise<void> {
  // Click user switcher dropdown
  await page.click('[data-testid="chat-user-switcher"]');
  
  // Wait for dropdown to appear
  await page.waitForSelector('div[class*="absolute"]', {
    state: 'visible',
    timeout: 2000,
  });
  
  // Map userId to user name (capitalized first letter)
  const userName = userId.charAt(0).toUpperCase() + userId.slice(1);
  
  // Find and click the user option by name
  const userButton = page.locator(`button:has-text("${userName}")`).first();
  await userButton.click();
  
  // Wait for page reload after user change (ChatHeader reloads page)
  await page.waitForLoadState('networkidle');
  // Additional wait for React to re-render
  await page.waitForTimeout(500);
}

/**
 * Navigate to URL and assert page has title element by test id
 */
export async function gotoAndAssertTitle(
  page: Page,
  url: string,
  testId: string
): Promise<void> {
  await page.goto(url);
  await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Safe expect visible with retry logic
 */
export async function safeExpectVisible(
  page: Page,
  testId: string,
  timeout: number = 5000
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({
    timeout,
  });
}

/**
 * Check if chat is enabled (based on Messages nav link visibility)
 */
export async function isChatEnabled(page: Page): Promise<boolean> {
  const messagesLink = page.locator('[data-testid="nav-messages"]');
  return await messagesLink.isVisible().catch(() => false);
}

/**
 * Wait for message to appear in chat (with polling for realtime)
 */
export async function waitForMessage(
  page: Page,
  messageText: string,
  timeout: number = 5000
): Promise<void> {
  await expect.poll(
    async () => {
      const messages = page.locator('[data-testid^="message-bubble-"]');
      const count = await messages.count();
      if (count === 0) return false;
      const lastMessage = messages.last();
      const text = await lastMessage.textContent();
      return text?.includes(messageText) || false;
    },
    {
      message: `Message "${messageText}" should appear`,
      timeout,
    }
  ).toBe(true);
}

