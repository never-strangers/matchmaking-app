export interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  title: string;
  memberIds: string[];
  updatedAt: string;
  lastMessagePreview?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

