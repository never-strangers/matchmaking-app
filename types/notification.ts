/**
 * Notification type
 */
export type NotificationType =
  | "user_approved"
  | "user_rejected"
  | "rsvp_hold_expired"
  | "rsvp_waitlist_promoted"
  | "match_revealed"
  | "mutual_like_unlocked"
  | "city_change_approved"
  | "city_change_rejected";

/**
 * Notification model
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>; // Event ID, match ID, etc.
  createdAt: string;
}
