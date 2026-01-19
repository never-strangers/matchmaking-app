"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PilotDashboard from "@/components/pilot/PilotDashboard";
import { ensureConversation, getCurrentUserId as getChatUserId } from "@/lib/chatStore";
import { getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById, isApproved } from "@/lib/demo/userStore";
import { listEvents, getEventById } from "@/lib/demo/eventStore";
import { getRegistrationsForUser } from "@/lib/demo/registrationStore";
import {
  getUserMatchesForEvent,
  getMatchesForEvent,
  recordMatchAction,
  getUserMatchAction,
  hasMutualLike,
} from "@/lib/demo/matchingStore";
import { notifyMutualLike } from "@/lib/demo/notificationStore";
import { getEventQuestionnaire } from "@/lib/demo/questionnaireEventStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { Event } from "@/types/event";
import { MatchResult } from "@/types/matching";

const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";
const isPilotPreseedEnabled = process.env.NEXT_PUBLIC_PILOT_PRESEED === "true";

export default function MatchPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userApproved, setUserApproved] = useState(false);

  useEffect(() => {
    if (isPilotPreseedEnabled) return;

    const userId = getCurrentUserId();
    setCurrentUserId(userId);

    if (userId) {
      const user = getUserById(userId);
      setUserApproved(isApproved(userId));

      // Get user's attended events (confirmed + checked in + questionnaire completed)
      const registrations = getRegistrationsForUser(userId);
      const attendedRegs = registrations.filter((r) => 
        r.rsvpStatus === "confirmed" && 
        r.attendanceStatus === "checked_in" &&
        r.questionnaireCompleted === true
      );

      // Get events for attended RSVPs, filtered by user's city
      const allEvents = listEvents();
      const attendedEvents = allEvents.filter((event) => {
        // Must have attended (confirmed + checked in + questionnaire completed)
        const hasAttended = attendedRegs.some((reg) => reg.eventId === event.id);
        // Must be in user's city
        const isInUserCity = event.city === user?.city;
        return hasAttended && isInUserCity;
      });

      setEvents(attendedEvents);

      // Auto-select first event if available
      if (attendedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(attendedEvents[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isPilotPreseedEnabled) return;

    if (!selectedEventId || !currentUserId) {
      setMatchResults([]);
      return;
    }

    // Load matches for selected event
    // First, ensure seed data exists by checking the store
    getMatchesForEvent(selectedEventId);
    
    const matches = getUserMatchesForEvent(selectedEventId, currentUserId);
    setMatchResults(matches);
  }, [selectedEventId, currentUserId]);

  const handleLike = (matchId: string, otherUserId: string) => {
    if (!selectedEventId || !currentUserId) return;

    recordMatchAction(selectedEventId, matchId, currentUserId, "like");

    // Check for mutual like
    if (hasMutualLike(selectedEventId, currentUserId, otherUserId)) {
      const otherUser = getUserById(otherUserId);
      const event = getEventById(selectedEventId);
      if (otherUser && event) {
        notifyMutualLike(currentUserId, otherUser.name, event.title);
        notifyMutualLike(otherUserId, getUserById(currentUserId)?.name || "Someone", event.title);
      }
    }

    // Refresh matches
    const matches = getUserMatchesForEvent(selectedEventId, currentUserId);
    setMatchResults(matches);
  };

  const handlePass = (matchId: string) => {
    if (!selectedEventId || !currentUserId) return;
    recordMatchAction(selectedEventId, matchId, currentUserId, "pass");
    
    // Remove from view
    setMatchResults((prev) => prev.filter((m) => m.id !== matchId));
  };

  const handleMessage = (otherUserId: string) => {
    if (!isChatEnabled || !selectedEventId || !currentUserId) return;

    // Check mutual like
    if (!hasMutualLike(selectedEventId, currentUserId, otherUserId)) {
      alert("Chat is only available after mutual like.");
      return;
    }

    const currentChatUserId = getChatUserId();
    const conversationId = `conv_${[currentChatUserId, otherUserId].sort().join("_")}`;
    const otherUser = getUserById(otherUserId);
    
    // Ensure conversation exists (creates if doesn't exist)
    ensureConversation(conversationId, [currentChatUserId, otherUserId], otherUser?.name || "User");
    router.push(`/messages/${conversationId}`);
  };

  const selectedEvent = selectedEventId ? getEventById(selectedEventId) : null;

  if (isPilotPreseedEnabled) {
    return <PilotDashboard />;
  }

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-dark mb-8">Your Matches</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Please complete onboarding to see your matches.
          </p>
        </div>
      </div>
    );
  }

  if (!userApproved) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-dark mb-8">Your Matches</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            Your account is pending approval. Once approved and you attend an event, you&apos;ll see your matches here.
          </p>
        </div>
      </div>
    );
  }

  // Show message if user hasn't attended any events
  if (userApproved && events.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-dark mb-8">Your Matches</h1>
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 text-center">
          <p className="text-gray-dark text-lg mb-2">
            You haven&apos;t attended any events yet.
          </p>
          <p className="text-gray-medium text-sm">
            RSVP and attend an event to see your matches here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 data-testid="match-title" className="text-3xl font-bold text-gray-dark mb-8">Your Matches</h1>

      {/* Event Selector */}
      {events.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-dark mb-2">
            Select Event
          </label>
          <select
            value={selectedEventId || ""}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          >
            <option value="">-- Select an event --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedEventId ? (
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 text-center">
          <p className="text-gray-dark">
            Select an event to view your matches.
          </p>
        </div>
      ) : matchResults.length === 0 ? (
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 text-center">
          <p className="text-gray-dark">
            {selectedEvent
              ? `No matches found for "${selectedEvent.title}". Matching may not have been run yet, or you haven't been matched with anyone.`
              : "No matches available."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedEvent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm">
                Matches for: <strong>{selectedEvent.title}</strong>
              </p>
            </div>
          )}
          {matchResults.map((match) => {
            const otherUserId = match.userId1 === currentUserId ? match.userId2 : match.userId1;
            const otherUser = getUserById(otherUserId);
            if (!otherUser) return null;

            const userAction = getUserMatchAction(selectedEventId!, match.id, currentUserId);
            const mutualLike = hasMutualLike(selectedEventId!, currentUserId, otherUserId);

            // Get alignment highlights (2-3 questions where answers are similar)
            const getAlignmentHighlights = () => {
              if (!selectedEventId || !currentUserId) return [];
              const currentUserQ = getEventQuestionnaire(selectedEventId, currentUserId);
              const otherUserQ = getEventQuestionnaire(selectedEventId, otherUserId);
              if (!currentUserQ || !otherUserQ) return [];
              
              const highlights: string[] = [];
              const questionIds = Object.keys(currentUserQ.answers);
              
              for (const qId of questionIds) {
                const currentAnswer = currentUserQ.answers[qId];
                const otherAnswer = otherUserQ.answers[qId];
                if (currentAnswer && otherAnswer && Math.abs(currentAnswer - otherAnswer) <= 1) {
                  const question = QUESTIONS.find(q => q.id === qId);
                  if (question) {
                    highlights.push(question.text);
                    if (highlights.length >= 3) break;
                  }
                }
              }
              
              return highlights;
            };

            const highlights = getAlignmentHighlights();

            return (
              <div
                key={match.id}
                data-testid={`match-card-${match.id}`}
                className="border border-beige-frame rounded-xl shadow-sm p-6 bg-white"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-dark">
                        {otherUser.name}
                      </h2>
                      <span
                        data-testid={`match-score-${match.id}`}
                        className={`text-sm font-bold px-3 py-1 rounded-full ${
                          match.score >= 80
                            ? "bg-green-100 text-green-800"
                            : match.score >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {match.score}% Match
                      </span>
                    </div>
                    <p className="text-gray-medium mb-3">{otherUser.city}</p>
                    {highlights.length > 0 && (
                      <div 
                        data-testid={`match-reasons-${match.id}`}
                        className="text-sm text-gray-dark mb-2"
                      >
                        <span className="font-medium">Alignment:</span>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {highlights.map((highlight, idx) => (
                            <li key={idx} className="text-xs text-gray-medium">{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {mutualLike && (
                      <span 
                        data-testid={`match-mutual-badge-${match.id}`}
                        className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                      >
                        ✓ Mutual Like - Chat Unlocked!
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {userAction !== "like" && !mutualLike && (
                      <>
                        <button
                          data-testid={`match-like-${match.id}`}
                          onClick={() => handleLike(match.id, otherUserId)}
                          className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          Like
                        </button>
                        <button
                          data-testid={`match-pass-${otherUserId}`}
                          onClick={() => handlePass(match.id)}
                          className="bg-gray-200 text-gray-dark px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors whitespace-nowrap"
                        >
                          Pass
                        </button>
                      </>
                    )}
                    {userAction === "like" && !mutualLike && (
                      <span className="text-sm text-gray-medium">Waiting for their like...</span>
                    )}
                    {mutualLike && isChatEnabled && (
                      <button
                        data-testid={`match-message-${match.id}`}
                        onClick={() => handleMessage(otherUserId)}
                        className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
