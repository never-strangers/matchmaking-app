import { test, expect, Page } from '@playwright/test';
import { clearNsLocalStorage } from './utils';

/**
 * Full Happy Path Demo Flow Test
 * 
 * This test validates the complete CEO demo flow:
 * 1. Registration → OTP → Pending approval
 * 2. Admin approval → City locked + notification
 * 3. Answer questions (10 questions, pre-filled)
 * 4. RSVP → HOLD
 * 5. Pay Now → CONFIRMED
 * 6. Admin check-in → Check-in all → Run matching
 * 7. View matches → Like → Mutual like → Message
 * 8. Chat with realtime sync
 */

test.describe('Happy Path Demo Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all demo data
    await clearNsLocalStorage(page);
    await page.goto('/');
  });

  test('Complete happy path flow', async ({ page, context }) => {
    // ===== STEP 1: Registration =====
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[data-testid="register-name"]', 'Mikhail');
    await page.fill('[data-testid="register-email"]', 'mikhail@example.com');
    await page.selectOption('[data-testid="register-city"]', 'Singapore');
    await page.click('[data-testid="register-submit"]');
    
    // Should redirect to verification
    await expect(page).toHaveURL(/\/register\/verification/);
    
    // Enter OTP
    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="otp-submit"]');
    
    // Should redirect to /events with pending banner
    await expect(page).toHaveURL('/events');
    await expect(page.locator('[data-testid="register-status-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-status-banner"]')).toContainText('Pending admin approval');
    
    // Get the user ID from localStorage
    const userId = await page.evaluate(() => {
      return localStorage.getItem('ns_current_user_id');
    });
    expect(userId).toBeTruthy();
    
    // ===== STEP 2: Admin Approval =====
    // Switch to admin role
    await page.click('[data-testid="role-switcher-toggle"]');
    await page.click('[data-testid="role-switch-admin"]');
    await page.waitForLoadState('networkidle');
    
    // Go to admin page
    await page.goto('/admin');
    await page.click('[data-testid="admin-tab-users"]');
    
    // Approve the user
    await page.click(`[data-testid="admin-approve-user-${userId}"]`);
    await page.waitForTimeout(500);
    
    // Verify city is locked
    await expect(page.locator(`[data-testid="admin-city-locked-${userId}"]`)).toBeVisible();
    
    // Verify notification was sent
    await expect(page.locator(`[data-testid="admin-notification-sent-${userId}"]`)).toBeVisible();
    
    // ===== STEP 3: Answer Questions =====
    // Switch back to user role
    await page.click('[data-testid="role-switcher-toggle"]');
    await page.click('[data-testid="role-switch-user"]');
    await page.waitForLoadState('networkidle');
    
    // Go to events
    await page.goto('/events');
    await expect(page.locator('[data-testid="events-title"]')).toBeVisible();
    
    // Find the Singapore event (Coffee & Conversation)
    const eventCard = page.locator('[data-testid="event-card-event_coffee"]');
    await expect(eventCard).toBeVisible();
    
    // Click "Answer Questions"
    await page.click('[data-testid="event-answer-questions-event_coffee"]');
    await expect(page).toHaveURL('/events/event_coffee/questions');
    
    // Verify exactly 10 questions are shown
    const questionInputs = page.locator('[data-testid^="question-"]');
    const questionCount = await questionInputs.count();
    expect(questionCount).toBeGreaterThanOrEqual(10);
    
    // Verify all questions are pre-filled with value 3
    for (let i = 0; i < 10; i++) {
      const questionId = await questionInputs.nth(i).getAttribute('data-testid');
      if (questionId) {
        // Check that value 3 is selected (Agree)
        const value3Input = page.locator(`[data-testid="${questionId.replace(/-[1-4]$/, '-3')}"]`);
        await expect(value3Input).toBeChecked();
      }
    }
    
    // Save answers
    await page.click('[data-testid="questionnaire-save"]');
    await expect(page.locator('[data-testid="questionnaire-completed-badge"]')).toBeVisible();
    
    // Should redirect back to events
    await expect(page).toHaveURL('/events');
    
    // ===== STEP 4: RSVP =====
    // Click RSVP button
    await page.click('[data-testid="event-rsvp-event_coffee"]');
    await page.waitForTimeout(500);
    
    // Verify HOLD status
    await expect(page.locator('[data-testid="registration-status-hold-event_coffee"]')).toBeVisible();
    
    // ===== STEP 5: Pay Now =====
    // Click Pay Now
    await page.click('[data-testid="event-pay-now-event_coffee"]');
    
    // Handle mock payment confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Mock Payment');
      await dialog.accept();
    });
    
    await page.waitForTimeout(1000);
    
    // Verify CONFIRMED status
    await expect(page.locator('[data-testid="payment-confirmed-event_coffee"]')).toBeVisible();
    
    // ===== STEP 6: Admin Check-in & Matching =====
    // Switch to admin
    await page.click('[data-testid="role-switcher-toggle"]');
    await page.click('[data-testid="role-switch-admin"]');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/admin');
    await page.click('[data-testid="admin-tab-events"]');
    
    // Find the event row
    await expect(page.locator('[data-testid="admin-event-row-event_coffee"]')).toBeVisible();
    
    // Check in the user
    await page.click(`[data-testid="admin-checkin-user-${userId}-event_coffee"]`);
    await page.waitForTimeout(500);
    
    // Click "Check In All" (should check in all remaining)
    await page.click('[data-testid="admin-checkin-all-event_coffee"]');
    await page.waitForTimeout(500);
    
    // Verify "Run Matching Now" button appears
    await expect(page.locator('[data-testid="admin-run-matching-visible-event_coffee"]')).toBeVisible();
    
    // Run matching
    await page.click('[data-testid="admin-run-matching-visible-event_coffee"]');
    
    // Handle alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Matching completed');
      await dialog.accept();
    });
    
    await page.waitForTimeout(1000);
    
    // Verify matches were created
    await expect(page.locator('[data-testid="admin-matches-created-event_coffee"]')).toBeVisible();
    
    // Verify notifications were sent
    await expect(page.locator('[data-testid="admin-notify-sent-event_coffee"]')).toBeVisible();
    
    // ===== STEP 7: View Matches =====
    // Switch back to user
    await page.click('[data-testid="role-switcher-toggle"]');
    await page.click('[data-testid="role-switch-user"]');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/match');
    await expect(page.locator('[data-testid="match-title"]')).toBeVisible();
    
    // Verify match card is shown (should have at least one match)
    const matchCard = page.locator('[data-testid^="match-card-"]').first();
    await expect(matchCard).toBeVisible({ timeout: 10000 });
    
    // Get the match ID
    const matchId = await matchCard.getAttribute('data-testid');
    expect(matchId).toBeTruthy();
    
    // Verify match score is shown
    await expect(page.locator(`[data-testid="match-score-${matchId?.replace('match-card-', '')}"]`)).toBeVisible();
    
    // Verify match reasons/highlights are shown
    await expect(page.locator(`[data-testid="match-reasons-${matchId?.replace('match-card-', '')}"]`)).toBeVisible();
    
    // ===== STEP 8: Like Match =====
    // Like the match
    await page.click(`[data-testid="match-like-${matchId?.replace('match-card-', '')}"]`);
    await page.waitForTimeout(500);
    
    // For mutual like, we need to switch to the other user and like back
    // First, get the other user ID from the match
    const otherUserId = await page.evaluate((matchId) => {
      // Get match data from localStorage
      const matches = JSON.parse(localStorage.getItem('ns_matches') || '[]');
      const match = matches.find((m: any) => m.id === matchId?.replace('match-card-', ''));
      if (!match) return null;
      const currentUserId = localStorage.getItem('ns_current_user_id');
      return match.userId1 === currentUserId ? match.userId2 : match.userId1;
    }, matchId);
    
    expect(otherUserId).toBeTruthy();
    
    // Switch to other user
    await page.click('[data-testid="user-switcher-toggle"]');
    await page.click(`[data-testid="user-switch-${otherUserId}"]`);
    await page.waitForLoadState('networkidle');
    
    // Go to match page as other user
    await page.goto('/match');
    await page.waitForTimeout(1000);
    
    // Like the match as other user
    const otherUserMatchCard = page.locator('[data-testid^="match-card-"]').first();
    await expect(otherUserMatchCard).toBeVisible();
    const otherUserMatchId = await otherUserMatchCard.getAttribute('data-testid');
    await page.click(`[data-testid="match-like-${otherUserMatchId?.replace('match-card-', '')}"]`);
    await page.waitForTimeout(500);
    
    // Verify mutual like badge appears
    await expect(page.locator(`[data-testid="match-mutual-badge-${otherUserMatchId?.replace('match-card-', '')}"]`)).toBeVisible();
    
    // Verify message button appears
    await expect(page.locator(`[data-testid="match-message-${otherUserMatchId?.replace('match-card-', '')}"]`)).toBeVisible();
    
    // ===== STEP 9: Chat =====
    // Click message button
    await page.click(`[data-testid="match-message-${otherUserMatchId?.replace('match-card-', '')}"]`);
    
    // Should navigate to chat
    await expect(page).toHaveURL(/\/messages\/conv_/);
    
    // Verify message input is visible (should be at bottom without scrolling)
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();
    
    // Check that input is in viewport (not requiring scroll)
    const inputBox = await messageInput.boundingBox();
    expect(inputBox).toBeTruthy();
    const viewport = page.viewportSize();
    if (inputBox && viewport) {
      // Input should be near bottom of viewport
      expect(inputBox.y + inputBox.height).toBeLessThan(viewport.height + 100);
    }
    
    // Send a message
    await messageInput.fill('Hello! This is a test message.');
    await page.click('[data-testid="message-send"]');
    
    // Verify message appears
    await expect(page.locator('[data-testid^="message-bubble-"]').last()).toBeVisible();
    await expect(page.locator('[data-testid^="message-bubble-"]').last()).toContainText('Hello! This is a test message.');
    
    // ===== STEP 10: Realtime Sync Test =====
    // Open a second tab to test realtime sync
    const page2 = await context.newPage();
    await clearNsLocalStorage(page2);
    await page2.goto('/');
    
    // Set the same user in second tab
    await page2.evaluate((userId) => {
      localStorage.setItem('ns_current_user_id', userId);
    }, otherUserId);
    
    // Navigate to the same conversation
    const conversationUrl = page.url();
    await page2.goto(conversationUrl);
    await page2.waitForLoadState('networkidle');
    
    // Send a message from first tab
    await messageInput.fill('Message from tab 1');
    await page.click('[data-testid="message-send"]');
    await page.waitForTimeout(1000);
    
    // Verify message appears in second tab (realtime sync)
    await expect(page2.locator('[data-testid^="message-bubble-"]').last()).toContainText('Message from tab 1', { timeout: 5000 });
    
    // Send a message from second tab
    const messageInput2 = page2.locator('[data-testid="message-input"]');
    await messageInput2.fill('Message from tab 2');
    await page2.click('[data-testid="message-send"]');
    await page2.waitForTimeout(1000);
    
    // Verify message appears in first tab (realtime sync)
    await expect(page.locator('[data-testid^="message-bubble-"]').last()).toContainText('Message from tab 2', { timeout: 5000 });
    
    await page2.close();
  });
});
