"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUserId } from "@/lib/demo/authStore";
import {
  getNotificationsForUser,
  markNotificationRead,
  markAllRead,
  getUnreadCount,
  deleteNotification,
} from "@/lib/demo/notificationStore";
import { Notification } from "@/types/notification";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);

    if (userId) {
      loadNotifications(userId);
    }
  }, []);

  const loadNotifications = (userId: string) => {
    const notifs = getNotificationsForUser(userId);
    setNotifications(notifs);
    setUnreadCount(getUnreadCount(userId));
  };

  const handleMarkRead = (notificationId: string) => {
    markNotificationRead(notificationId);
    if (currentUserId) {
      loadNotifications(currentUserId);
    }
  };

  const handleMarkAllRead = () => {
    if (currentUserId) {
      markAllRead(currentUserId);
      loadNotifications(currentUserId);
    }
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification(notificationId);
    if (currentUserId) {
      loadNotifications(currentUserId);
    }
  };

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-dark mb-8">Notifications</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Please log in to view notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-dark">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-gray-medium hover:text-gray-dark"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 text-center">
          <p className="text-gray-dark">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 bg-white ${
                notification.read
                  ? "border-beige-frame"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-dark">
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-medium mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-medium">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
