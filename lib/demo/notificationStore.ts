"use client";

import { Notification, NotificationType } from "@/types/notification";

const NOTIFICATIONS_KEY = "ns_notifications";

/**
 * Get all notifications
 */
function listNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save notifications
 */
function saveNotifications(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

/**
 * Get notifications for user
 */
export function getNotificationsForUser(userId: string): Notification[] {
  const notifications = listNotifications();
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get unread count for user
 */
export function getUnreadCount(userId: string): number {
  const notifications = getNotificationsForUser(userId);
  return notifications.filter((n) => !n.read).length;
}

/**
 * Create notification
 */
export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Notification {
  const notifications = listNotifications();
  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    read: false,
    metadata,
    createdAt: new Date().toISOString(),
  };
  notifications.push(notification);
  saveNotifications(notifications);

  // Log email (mock)
  console.log(`EMAIL: ${title} - ${message}`, metadata);

  return notification;
}

/**
 * Mark notification as read
 */
export function markNotificationRead(notificationId: string): void {
  const notifications = listNotifications();
  const notification = notifications.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveNotifications(notifications);
  }
}

/**
 * Mark all notifications as read for user
 */
export function markAllRead(userId: string): void {
  const notifications = listNotifications();
  notifications.forEach((n) => {
    if (n.userId === userId && !n.read) {
      n.read = true;
    }
  });
  saveNotifications(notifications);
}

/**
 * Delete notification
 */
export function deleteNotification(notificationId: string): void {
  const notifications = listNotifications();
  const filtered = notifications.filter((n) => n.id !== notificationId);
  saveNotifications(filtered);
}

// Convenience functions for common notification types
export function notifyUserApproved(userId: string): void {
  createNotification(
    userId,
    "user_approved",
    "Account Approved",
    "Your account has been approved! You can now RSVP to events.",
    {}
  );
}

export function notifyUserRejected(userId: string, reason?: string): void {
  createNotification(
    userId,
    "user_rejected",
    "Account Rejected",
    reason || "Your account application was rejected. You can reapply after 24 hours.",
    {}
  );
}

export function notifyHoldExpired(userId: string, eventTitle: string): void {
  createNotification(
    userId,
    "rsvp_hold_expired",
    "RSVP Hold Expired",
    `Your seat reservation for "${eventTitle}" expired. Please try again if space is available.`,
    { eventTitle }
  );
}

export function notifyWaitlistPromoted(userId: string, eventTitle: string): void {
  createNotification(
    userId,
    "rsvp_waitlist_promoted",
    "Seat Available",
    `A seat is now available for "${eventTitle}". Complete your payment to confirm.`,
    { eventTitle }
  );
}

export function notifyMatchRevealed(userId: string, eventTitle: string, matchCount: number): void {
  createNotification(
    userId,
    "match_revealed",
    "Matches Available",
    `Your matches for "${eventTitle}" are ready! You have ${matchCount} match${matchCount !== 1 ? "es" : ""}.`,
    { eventTitle, matchCount }
  );
}

export function notifyMutualLike(userId: string, otherUserName: string, eventTitle: string): void {
  createNotification(
    userId,
    "mutual_like_unlocked",
    "It's a Match!",
    `You and ${otherUserName} liked each other at "${eventTitle}". Chat is now unlocked!`,
    { otherUserName, eventTitle }
  );
}

export function notifyCityChangeApproved(userId: string, newCity: string): void {
  createNotification(
    userId,
    "city_change_approved",
    "City Change Approved",
    `Your city change request to ${newCity} has been approved.`,
    { newCity }
  );
}

export function notifyCityChangeRejected(userId: string): void {
  createNotification(
    userId,
    "city_change_rejected",
    "City Change Rejected",
    "Your city change request was rejected. Please contact support if you have questions.",
    {}
  );
}
