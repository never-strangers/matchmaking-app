/**
 * Demo store with localStorage persistence
 * Supports multiple accounts and per-event data
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AnswerValue } from "@/types/questionnaire";

// Types
export type DemoEvent = {
  id: string;
  title: string;
  city: string;
  startsAt?: string;
  questions: string[]; // exactly 10 questionIds
  createdAt: string;
};

export type Registration = {
  eventId: string;
  userEmail: string;
  status: "joined" | "checked_in";
  joinedAt: string;
};

export type AnswersByEvent = Record<
  string, // eventId
  Record<
    string, // userEmail
    Record<string /*questionId*/, AnswerValue>
  >
>;

export type MatchesByEvent = Record<
  string, // eventId
  Record<
    string, // userEmail (viewer)
    Array<{ otherEmail: string; score: number }>
  >
>;

export type LikesByEvent = Record<
  string, // eventId
  Record<
    string, // fromEmail
    Record<string /*toEmail*/, true>
  >
>;

export type Conversation = {
  id: string; // `${eventId}:${minEmail}:${maxEmail}`
  eventId: string;
  a: string; // email (alphabetically first)
  b: string; // email (alphabetically second)
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: string; // email
  body: string;
  createdAt: string;
};

export type DemoState = {
  events: Record<string, DemoEvent>;
  registrations: Registration[];
  answers: AnswersByEvent;
  matches: MatchesByEvent;
  likes: LikesByEvent;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
};

type DemoStore = DemoState & {
  // Events
  addEvent: (event: DemoEvent) => void;
  getEvent: (eventId: string) => DemoEvent | undefined;
  listEvents: () => DemoEvent[];
  seedDefaultEvents: () => void;

  // Registrations
  joinEvent: (eventId: string, userEmail: string) => void;
  getRegistrationsForEvent: (eventId: string) => Registration[];
  getRegistrationsForUser: (userEmail: string) => Registration[];
  isUserJoined: (eventId: string, userEmail: string) => boolean;

  // Answers
  setAnswer: (
    eventId: string,
    userEmail: string,
    questionId: string,
    value: AnswerValue
  ) => void;
  getAnswers: (eventId: string, userEmail: string) => Record<string, AnswerValue>;
  hasAllAnswers: (eventId: string, userEmail: string) => boolean;
  getAnswerCount: (eventId: string, userEmail: string) => number;

  // Matches
  setMatches: (
    eventId: string,
    userEmail: string,
    matches: Array<{ otherEmail: string; score: number }>
  ) => void;
  getMatches: (eventId: string, userEmail: string) => Array<{ otherEmail: string; score: number }>;
  hasMatches: (eventId: string, userEmail: string) => boolean;

  // Likes
  likeUser: (eventId: string, fromEmail: string, toEmail: string) => void;
  isLiked: (eventId: string, fromEmail: string, toEmail: string) => boolean;
  hasMutualLike: (eventId: string, email1: string, email2: string) => boolean;

  // Conversations
  getOrCreateConversation: (
    eventId: string,
    email1: string,
    email2: string
  ) => Conversation;
  getConversation: (conversationId: string) => Conversation | undefined;
  getConversationsForUser: (userEmail: string) => Conversation[];

  // Messages
  addMessage: (conversationId: string, sender: string, body: string) => Message;
  getMessages: (conversationId: string) => Message[];
};

const STORAGE_KEY = "ns_demo_v1";

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      // Initial state
      events: {},
      registrations: [],
      answers: {},
      matches: {},
      likes: {},
      conversations: {},
      messages: {},

      // Events
      addEvent: (event) => {
        set((state) => ({
          events: {
            ...state.events,
            [event.id]: event,
          },
        }));
      },

      getEvent: (eventId) => {
        return get().events[eventId];
      },

      listEvents: () => {
        return Object.values(get().events).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },

      seedDefaultEvents: () => {
        const state = get();
        if (Object.keys(state.events).length > 0) return; // Already seeded

        const now = new Date();
        const singaporeEvent: DemoEvent = {
          id: "event_singapore_1",
          title: "Singapore Social Mixer",
          city: "Singapore",
          startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          questions: [
            "q_lifestyle_1",
            "q_lifestyle_2",
            "q_lifestyle_3",
            "q_lifestyle_4",
            "q_lifestyle_5",
            "q_social_1",
            "q_social_2",
            "q_social_3",
            "q_social_4",
            "q_values_1",
          ],
          createdAt: now.toISOString(),
        };

        const bangkokEvent: DemoEvent = {
          id: "event_bangkok_1",
          title: "Bangkok Networking Night",
          city: "Bangkok",
          startsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          questions: [
            "q_lifestyle_1",
            "q_lifestyle_2",
            "q_lifestyle_3",
            "q_lifestyle_4",
            "q_lifestyle_5",
            "q_social_1",
            "q_social_2",
            "q_social_3",
            "q_social_4",
            "q_values_1",
          ],
          createdAt: now.toISOString(),
        };

        set((state) => ({
          events: {
            ...state.events,
            [singaporeEvent.id]: singaporeEvent,
            [bangkokEvent.id]: bangkokEvent,
          },
        }));
      },

      // Registrations
      joinEvent: (eventId, userEmail) => {
        const state = get();
        const existing = state.registrations.find(
          (r) => r.eventId === eventId && r.userEmail === userEmail
        );
        if (existing) return;

        set((state) => ({
          registrations: [
            ...state.registrations,
            {
              eventId,
              userEmail,
              status: "joined",
              joinedAt: new Date().toISOString(),
            },
          ],
        }));
      },

      getRegistrationsForEvent: (eventId) => {
        return get().registrations.filter((r) => r.eventId === eventId);
      },

      getRegistrationsForUser: (userEmail) => {
        return get().registrations.filter((r) => r.userEmail === userEmail);
      },

      isUserJoined: (eventId, userEmail) => {
        return get().registrations.some(
          (r) => r.eventId === eventId && r.userEmail === userEmail
        );
      },

      // Answers
      setAnswer: (eventId, userEmail, questionId, value) => {
        set((state) => {
          const newAnswers = { ...state.answers };
          if (!newAnswers[eventId]) newAnswers[eventId] = {};
          if (!newAnswers[eventId][userEmail]) newAnswers[eventId][userEmail] = {};
          newAnswers[eventId][userEmail][questionId] = value;
          return { answers: newAnswers };
        });
      },

      getAnswers: (eventId, userEmail) => {
        return get().answers[eventId]?.[userEmail] || {};
      },

      hasAllAnswers: (eventId, userEmail) => {
        const event = get().events[eventId];
        if (!event) return false;
        const answers = get().getAnswers(eventId, userEmail);
        return event.questions.every((qId) => answers[qId] !== undefined);
      },

      getAnswerCount: (eventId, userEmail) => {
        const answers = get().getAnswers(eventId, userEmail);
        return Object.keys(answers).length;
      },

      // Matches
      setMatches: (eventId, userEmail, matches) => {
        set((state) => {
          const newMatches = { ...state.matches };
          if (!newMatches[eventId]) newMatches[eventId] = {};
          newMatches[eventId][userEmail] = matches;
          return { matches: newMatches };
        });
      },

      getMatches: (eventId, userEmail) => {
        return get().matches[eventId]?.[userEmail] || [];
      },

      hasMatches: (eventId, userEmail) => {
        const matches = get().getMatches(eventId, userEmail);
        return matches.length > 0;
      },

      // Likes
      likeUser: (eventId, fromEmail, toEmail) => {
        set((state) => {
          const newLikes = { ...state.likes };
          if (!newLikes[eventId]) newLikes[eventId] = {};
          if (!newLikes[eventId][fromEmail]) newLikes[eventId][fromEmail] = {};
          newLikes[eventId][fromEmail][toEmail] = true;
          return { likes: newLikes };
        });
      },

      isLiked: (eventId, fromEmail, toEmail) => {
        return !!get().likes[eventId]?.[fromEmail]?.[toEmail];
      },

      hasMutualLike: (eventId, email1, email2) => {
        const state = get();
        return (
          state.isLiked(eventId, email1, email2) &&
          state.isLiked(eventId, email2, email1)
        );
      },

      // Conversations
      getOrCreateConversation: (eventId, email1, email2) => {
        const state = get();
        // Sort emails alphabetically for consistent ID
        const [a, b] = [email1, email2].sort();
        const conversationId = `${eventId}:${a}:${b}`;

        let conversation = state.conversations[conversationId];
        if (!conversation) {
          conversation = {
            id: conversationId,
            eventId,
            a,
            b,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            conversations: {
              ...state.conversations,
              [conversationId]: conversation!,
            },
          }));
        }
        return conversation;
      },

      getConversation: (conversationId) => {
        return get().conversations[conversationId];
      },

      getConversationsForUser: (userEmail) => {
        return Object.values(get().conversations).filter(
          (c) => c.a === userEmail || c.b === userEmail
        );
      },

      // Messages
      addMessage: (conversationId, sender, body) => {
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId,
          sender,
          body,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const newMessages = { ...state.messages };
          if (!newMessages[conversationId]) newMessages[conversationId] = [];
          newMessages[conversationId] = [...newMessages[conversationId], message];
          return { messages: newMessages };
        });

        return message;
      },

      getMessages: (conversationId) => {
        return get().messages[conversationId] || [];
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    }
  )
);
