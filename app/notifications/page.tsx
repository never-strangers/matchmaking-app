"use client";

import { useState, useEffect } from "react";
import { getCurrentUserId } from "@/lib/demo/authStore";
import {
  getNotificationsForUser,
  markNotificationRead,
  markAllRead,
  getUnreadCount,
  deleteNotification,
} from "@/lib/demo/notificationStore";
import { Notification } from "@/types/notification";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
    if (userId) loadNotifications(userId);
  }, []);

  const loadNotifications = (userId: string) => {
    setNotifications(getNotificationsForUser(userId));
    setUnreadCount(getUnreadCount(userId));
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    if (currentUserId) loadNotifications(currentUserId);
  };

  const handleMarkAllRead = () => {
    if (currentUserId) { markAllRead(currentUserId); loadNotifications(currentUserId); }
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    if (currentUserId) loadNotifications(currentUserId);
  };

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <PageHeader title="Notifications" />
        <Card>
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>Please log in to view notifications.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageHeader
        title="Notifications"
        action={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card className="text-center py-12">
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>No notifications yet.</p>
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-4 px-6 py-4"
                style={{ backgroundColor: n.read ? "transparent" : "var(--primary-light)" }}
              >
                {/* Red dot for unread */}
                <div className="mt-1.5 flex-shrink-0">
                  {!n.read && (
                    <span
                      className="block w-2 h-2 rounded-full"
                      style={{ backgroundColor: "var(--primary)" }}
                    />
                  )}
                  {n.read && <span className="block w-2 h-2" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm mb-0.5"
                    style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
                  >
                    {n.title}
                  </p>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}
                  >
                    {n.message}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-subtle)", fontFamily: "var(--font-sans)" }}
                  >
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs hover:underline"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs hover:underline"
                    style={{ color: "var(--danger)", fontFamily: "var(--font-sans)" }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
