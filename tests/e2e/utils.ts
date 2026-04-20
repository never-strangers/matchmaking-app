import { Page, expect } from '@playwright/test';

/**
 * Clear all localStorage keys starting with "ns_".
 * Used in tests that need a clean local state before the page loads.
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
 * Returns true if the Messages nav link is visible, indicating chat is enabled.
 */
export async function isChatEnabled(page: Page): Promise<boolean> {
  const messagesLink = page.locator('[data-testid="nav-messages"]');
  return await messagesLink.isVisible().catch(() => false);
}

/**
 * Polls until a message bubble containing messageText appears in the chat.
 * Useful after sending a message to verify it rendered in the conversation.
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
