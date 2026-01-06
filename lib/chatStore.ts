"use client";

import { ChatUser, Conversation, ChatMessage } from "@/types/chat";

// Demo users
export const DEMO_USERS: ChatUser[] = [
  { id: "mikhail", name: "Mikhail", avatarUrl: undefined },
  { id: "anna", name: "Anna", avatarUrl: undefined },
  { id: "james", name: "James", avatarUrl: undefined },
  { id: "sarah", name: "Sarah", avatarUrl: undefined },
];

// LocalStorage keys
const CURRENT_USER_KEY = "ns_chat_current_user";
const CONVERSATIONS_KEY = "ns_chat_conversations";
const MESSAGES_KEY_PREFIX = "ns_chat_messages_";

// BroadcastChannel for realtime sync
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined") {
  broadcastChannel = new BroadcastChannel("ns_chat");
}

// Get current user ID
export function getCurrentUserId(): string {
  if (typeof window === "undefined") return DEMO_USERS[0].id;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored || DEMO_USERS[0].id;
}

// Set current user ID
export function setCurrentUserId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_USER_KEY, userId);
  broadcastChannel?.postMessage({ type: "user_changed", userId });
}

// Get current user
export function getCurrentUser(): ChatUser {
  const userId = getCurrentUserId();
  return DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
}

// List conversations
export function listConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CONVERSATIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save conversations
function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

// Get conversation
export function getConversation(conversationId: string): Conversation | null {
  const conversations = listConversations();
  return conversations.find((c) => c.id === conversationId) || null;
}

// Ensure conversation exists
export function ensureConversation(
  conversationId: string,
  memberIds: string[],
  title?: string
): Conversation {
  let conversation = getConversation(conversationId);
  if (!conversation) {
    conversation = {
      id: conversationId,
      title: title || memberIds.map((id) => DEMO_USERS.find((u) => u.id === id)?.name || id).join(", "),
      memberIds,
      updatedAt: new Date().toISOString(),
    };
    const conversations = listConversations();
    conversations.push(conversation);
    saveConversations(conversations);
  }
  return conversation;
}

// List messages for a conversation
export function listMessages(conversationId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const key = `${MESSAGES_KEY_PREFIX}${conversationId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save messages
function saveMessages(conversationId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  const key = `${MESSAGES_KEY_PREFIX}${conversationId}`;
  localStorage.setItem(key, JSON.stringify(messages));
}

// Send message
export function sendMessage(
  conversationId: string,
  { senderId, body }: { senderId: string; body: string }
): ChatMessage {
  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    senderId,
    body,
    createdAt: new Date().toISOString(),
  };

  const messages = listMessages(conversationId);
  messages.push(message);
  saveMessages(conversationId, messages);

  // Update conversation
  const conversations = listConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation) {
    conversation.updatedAt = message.createdAt;
    conversation.lastMessagePreview = body;
    saveConversations(conversations);
  }

  // Broadcast to other tabs
  broadcastChannel?.postMessage({
    type: "message_created",
    conversationId,
    message,
  });

  // Trigger storage event for Safari compatibility
  if (typeof window !== "undefined") {
    window.dispatchEvent(new StorageEvent("storage", {
      key: `${MESSAGES_KEY_PREFIX}${conversationId}`,
      newValue: JSON.stringify(messages),
    }));
  }

  return message;
}

// Subscribe to updates
export function subscribe(callback: (event: { type: string; conversationId?: string; message?: ChatMessage }) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleBroadcast = (event: MessageEvent) => {
    callback(event.data);
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(MESSAGES_KEY_PREFIX)) {
      const conversationId = event.key.replace(MESSAGES_KEY_PREFIX, "");
      callback({
        type: "message_created",
        conversationId,
      });
    }
  };

  broadcastChannel?.addEventListener("message", handleBroadcast);
  window.addEventListener("storage", handleStorage);

  return () => {
    broadcastChannel?.removeEventListener("message", handleBroadcast);
    window.removeEventListener("storage", handleStorage);
  };
}

// Get unread count (fake - based on message count parity)
export function getUnreadCount(conversationId: string): number {
  const messages = listMessages(conversationId);
  const currentUserId = getCurrentUserId();
  const unread = messages.filter((m) => m.senderId !== currentUserId);
  return unread.length % 2; // Fake unread count
}

