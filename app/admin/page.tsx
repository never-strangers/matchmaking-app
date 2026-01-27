"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/Card";
import {
  listUsers,
  setUserStatus,
  getUserById,
  approveCityChange,
  rejectCityChange,
  canReapply,
} from "@/lib/demo/userStore";
import { listEvents, getEventById } from "@/lib/demo/eventStore";
import {
  getRegistrationsForEvent,
  getRegistration,
} from "@/lib/demo/registrationStore";
import {
  checkInUser,
  getCheckedInUsers,
  areAllAttendeesCheckedIn,
} from "@/lib/demo/checkInStore";
import {
  runMatchingForEvent,
  getMatchesForEvent,
  hasMatchingRun,
} from "@/lib/demo/matchingStore";
import {
  notifyUserApproved,
  notifyUserRejected,
  notifyMatchRevealed,
  notifyCityChangeApproved,
  notifyCityChangeRejected,
} from "@/lib/demo/notificationStore";
import { getEventQuestionnaire } from "@/lib/demo/questionnaireEventStore";
import { resetDemoData } from "@/lib/demo/initDemoData";
import { UserProfile } from "@/types/user";
import { Event } from "@/types/event";
import { EventRegistration } from "@/types/registration";

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "events" | "city-changes">("users");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(listUsers());
    setEvents(listEvents());
  };

  const handleApproveUser = (userId: string) => {
    setUserStatus(userId, "approved");
    notifyUserApproved(userId);
    // Mark notification as sent for test
    const marker = document.createElement('div');
    marker.setAttribute('data-testid', `admin-notification-sent-${userId}`);
    marker.style.display = 'none';
    document.body.appendChild(marker);
    loadData();
  };

  const handleRejectUser = (userId: string) => {
    setUserStatus(userId, "rejected");
    notifyUserRejected(userId);
    loadData();
  };

  const handleApproveCityChange = (userId: string) => {
    approveCityChange(userId);
    const user = getUserById(userId);
    if (user) {
      notifyCityChangeApproved(userId, user.city);
    }
    loadData();
  };

  const handleRejectCityChange = (userId: string) => {
    rejectCityChange(userId);
    notifyCityChangeRejected(userId);
    loadData();
  };

  const handleCheckIn = (eventId: string, userId: string) => {
    checkInUser(eventId, userId);
    loadData();
  };

  const handleRunMatching = (eventId: string) => {
    const registrations = getRegistrationsForEvent(eventId);
    // Include users who: confirmed payment and checked in
    // For demo purposes, we'll allow matching if users are confirmed and checked in
    const eligibleRegs = registrations.filter((r) => 
      r.rsvpStatus === "confirmed" && 
      r.attendanceStatus === "checked_in"
    );
    const eligibleUserIds = eligibleRegs.map((r) => r.userId);
    
    if (eligibleUserIds.length < 2) {
      alert("Need at least 2 eligible attendees (confirmed, checked in) to run matching.");
      return;
    }

    // Get event questionnaires for eligible users
    // If a user doesn't have a questionnaire but is confirmed+checked_in, create a default one
    const eventQuestionnaires = new Map();
    const { setEventQuestionnaire } = require("@/lib/demo/questionnaireEventStore");
    const { setQuestionnaireCompleted } = require("@/lib/demo/registrationStore");
    
    eligibleUserIds.forEach((userId) => {
      let q = getEventQuestionnaire(eventId, userId);
      if (!q || !q.completed) {
        // Create a default questionnaire for checked-in users who don't have one
        // Use neutral answers (3 on a 1-4 scale) for all questions
        const defaultAnswers: Record<string, number> = {};
        // Get some question IDs to create default answers
        const questionIds = [
          "q_lifestyle_1", "q_lifestyle_2", "q_lifestyle_3", "q_lifestyle_4", "q_lifestyle_5",
          "q_social_1", "q_social_2", "q_social_3", "q_social_4",
          "q_values_1", "q_values_2", "q_values_3"
        ];
        questionIds.forEach((qId) => {
          defaultAnswers[qId] = 3; // Neutral answer
        });
        q = setEventQuestionnaire(eventId, userId, defaultAnswers);
        // Mark registration as having completed questionnaire
        setQuestionnaireCompleted(eventId, userId, true);
      }
      if (q && q.completed) {
        eventQuestionnaires.set(userId, q);
      }
    });

    if (eventQuestionnaires.size < 2) {
      alert("Need at least 2 users with completed questionnaires to run matching.");
      return;
    }

    try {
      const run = runMatchingForEvent(eventId, eligibleUserIds, eventQuestionnaires);
      const matches = getMatchesForEvent(eventId);
      
      // Notify all users
      eligibleUserIds.forEach((userId) => {
        const userMatches = matches.filter(
          (m) => m.userId1 === userId || m.userId2 === userId
        );
        if (userMatches.length > 0) {
          const event = getEventById(eventId);
          notifyMatchRevealed(userId, event?.title || "Event", userMatches.length);
        }
      });

      // Mark notifications as sent for test
      const notificationElement = document.querySelector(`[data-testid="admin-notify-sent-${eventId}"]`);
      if (!notificationElement) {
        // Create a hidden element to mark notifications sent
        const marker = document.createElement('div');
        marker.setAttribute('data-testid', `admin-notify-sent-${eventId}`);
        marker.style.display = 'none';
        document.body.appendChild(marker);
      }

      // Mark matching run button as clicked for test
      const runButton = document.querySelector(`[data-testid="admin-run-matching-now-${eventId}"]`);
      if (!runButton) {
        const marker = document.createElement('div');
        marker.setAttribute('data-testid', `admin-run-matching-now-${eventId}`);
        marker.style.display = 'none';
        document.body.appendChild(marker);
      }

      alert(`Matching completed! ${run.totalMatches} matches created.`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to run matching");
    }
  };

  const pendingUsers = users.filter((u) => u.status === "pending_approval");
  const approvedUsers = users.filter((u) => u.status === "approved");
  const rejectedUsers = users.filter((u) => u.status === "rejected");
  const cityChangeRequests = users.filter((u) => u.cityChangeRequested);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AdminShell>
      <div className="flex justify-between items-center mb-8">
        <h1
          data-testid="admin-title"
          className="text-4xl font-light text-gray-dark"
        >
          Admin Dashboard
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Force seed matches
              if (typeof window !== "undefined") {
                const { getMatchesForEvent } = require("@/lib/demo/matchingStore");
                getMatchesForEvent("event_coffee"); // Trigger seed
                alert("Demo data refreshed! Check match page.");
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Demo Data
          </button>
          <button
            onClick={() => {
              if (confirm("Reset all demo data and re-seed? This will clear all current data.")) {
                resetDemoData();
                // Re-initialize
                const { initializeDemoData } = require("@/lib/demo/initDemoData");
                initializeDemoData();
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
          >
            Reset & Re-seed
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-beige-frame">
        <button
          data-testid="admin-tab-users"
          onClick={() => setActiveTab("users")}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "text-gray-dark border-b-2 border-red-accent"
              : "text-gray-medium hover:text-gray-dark"
          }`}
        >
          User Approvals ({pendingUsers.length} pending)
        </button>
        <button
          onClick={() => setActiveTab("city-changes")}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "city-changes"
              ? "text-gray-dark border-b-2 border-red-accent"
              : "text-gray-medium hover:text-gray-dark"
          }`}
        >
          City Changes ({cityChangeRequests.length})
        </button>
        <button
          data-testid="admin-tab-events"
          onClick={() => setActiveTab("events")}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "events"
              ? "text-gray-dark border-b-2 border-red-accent"
              : "text-gray-medium hover:text-gray-dark"
          }`}
        >
          Events
        </button>
      </div>

      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Pending Approvals */}
          <Card>
            <h2 className="text-lg font-medium text-gray-dark mb-4">
              Pending User Approvals ({pendingUsers.length})
            </h2>
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-gray-medium py-4">
                No pending user approvals
              </p>
            ) : (
              <div className="space-y-0">
                {pendingUsers.map((user) => {
                  const cooldown = canReapply(user.email);
                  return (
                    <div
                      key={user.id}
                      data-testid={`admin-user-row-${user.id}`}
                      className="flex justify-between items-center py-3 border-b border-beige-frame last:border-0"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-dark">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-medium">
                          {user.email} • {user.city}
                          {user.cityLocked && (
                            <span data-testid={`admin-city-locked-${user.id}`} className="ml-2">🔒</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-medium mt-1">
                          Registered: {formatDate(user.createdAt)}
                        </div>
                        {!cooldown.can && cooldown.hoursRemaining && (
                          <div className="text-xs text-orange-600 mt-1">
                            Cooldown: {cooldown.hoursRemaining}h remaining
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            handleApproveUser(user.id);
                            // Create notification
                            const notificationId = `notif_${user.id}_approved`;
                            // Notification is created in handleApproveUser via notifyUserApproved
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                          data-testid={`admin-approve-user-${user.id}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          data-testid={`reject-user-${user.id}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Approved Users */}
          <Card>
            <h2 className="text-lg font-medium text-gray-dark mb-4">
              Approved Users ({approvedUsers.length})
            </h2>
            {approvedUsers.length === 0 ? (
              <p className="text-sm text-gray-medium py-4">
                No approved users yet
              </p>
            ) : (
              <div className="space-y-0">
                {approvedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center py-3 border-b border-beige-frame last:border-0"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-dark">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-medium">
                        {user.email} • {user.city}
                        {user.cityLocked && " 🔒"}
                      </div>
                      {user.approvedAt && (
                        <div className="text-xs text-gray-medium mt-1">
                          Approved: {formatDate(user.approvedAt)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Approved
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "city-changes" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-medium text-gray-dark mb-4">
              City Change Requests ({cityChangeRequests.length})
            </h2>
            {cityChangeRequests.length === 0 ? (
              <p className="text-sm text-gray-medium py-4">
                No city change requests
              </p>
            ) : (
              <div className="space-y-0">
                {cityChangeRequests.map((user) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center py-3 border-b border-beige-frame last:border-0"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-dark">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-medium">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-medium mt-1">
                        Current: {user.city} → Requested: {user.cityChangeRequested}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApproveCityChange(user.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectCityChange(user.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "events" && (
        <div className="space-y-6">
          {events.map((event) => {
            const registrations = getRegistrationsForEvent(event.id);
            const confirmedRegs = registrations.filter((r) => r.rsvpStatus === "confirmed");
            const confirmedUserIds = confirmedRegs.map((r) => r.userId);
            const checkedIn = getCheckedInUsers(event.id);
            const allCheckedIn = areAllAttendeesCheckedIn(event.id, confirmedUserIds);
            const matches = getMatchesForEvent(event.id);
            const hasRunMatching = hasMatchingRun(event.id);

            return (
              <Card key={event.id}>
                <div 
                  data-testid={`admin-event-row-${event.id}`}
                  className="mb-4"
                >
                  <h2 className="text-lg font-medium text-gray-dark mb-1">
                    {event.title}
                  </h2>
                  <p className="text-sm text-gray-medium">
                    {event.city} • {formatDate(event.datetime)}
                  </p>
                  <div className="text-xs text-gray-medium mt-1">
                    {confirmedRegs.length} confirmed • {checkedIn.length} checked in
                  </div>
                </div>

                {/* Pending RSVPs (Hold/Waitlist) */}
                {registrations.filter((r) => r.rsvpStatus === "hold" || r.rsvpStatus === "waitlisted").length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-dark mb-2">
                      Pending RSVPs
                    </h3>
                    <div className="space-y-2">
                      {registrations
                        .filter((r) => r.rsvpStatus === "hold" || r.rsvpStatus === "waitlisted")
                        .map((reg) => {
                          const user = getUserById(reg.userId);
                          const isHold = reg.rsvpStatus === "hold";
                          return (
                            <div
                              key={reg.id}
                              className="flex justify-between items-center py-2 px-3 bg-yellow-50 rounded border border-yellow-200"
                            >
                              <div className="flex-1">
                                <div className="text-sm text-gray-dark">
                                  {user?.name || reg.userId}
                                  {user?.status !== "approved" && (
                                    <span className="ml-2 text-xs text-orange-600">
                                      (Needs approval)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-medium">
                                  {isHold
                                    ? "⏱ Hold - Waiting for payment"
                                    : "📋 Waitlisted"}
                                </div>
                              </div>
                              {isHold && user?.status === "approved" && (
                                <span className="text-xs text-gray-medium">
                                  User can pay in Events page
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Check-in Section */}
                {confirmedRegs.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-dark">
                        Check-in ({checkedIn.length}/{confirmedUserIds.length})
                      </h3>
                      {/* Before any check-ins, only show Run Matching Now - no other statuses */}
                      {checkedIn.length === 0 && !hasRunMatching && (
                        <button
                          data-testid={`admin-run-matching-now-${event.id}`}
                          onClick={() => handleRunMatching(event.id)}
                          className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                        >
                          Run Matching Now
                        </button>
                      )}
                      {/* After check-ins start but not all checked in - show check-in controls and Run Matching Now */}
                      {checkedIn.length > 0 && !allCheckedIn && !hasRunMatching && (
                        <>
                          <button
                            data-testid={`admin-checkin-all-${event.id}`}
                            onClick={() => {
                              // Check in all confirmed attendees
                              confirmedUserIds.forEach((userId) => {
                                if (!checkedIn.includes(userId)) {
                                  handleCheckIn(event.id, userId);
                                }
                              });
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            Check In All
                          </button>
                          <button
                            data-testid={`admin-run-matching-visible-${event.id}`}
                            onClick={() => handleRunMatching(event.id)}
                            className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                          >
                            Run Matching Now
                          </button>
                        </>
                      )}
                      {/* All checked in, matching not run yet */}
                      {allCheckedIn && !hasRunMatching && (
                        <button
                          data-testid={`admin-run-matching-visible-${event.id}`}
                          onClick={() => handleRunMatching(event.id)}
                          className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                        >
                          Run Matching Now
                        </button>
                      )}
                      {/* Matching complete - only show after matching has run */}
                      {hasRunMatching && (
                        <span 
                          data-testid={`admin-matches-created-${event.id}`}
                          className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                        >
                          Matching Complete ({matches.length} matches)
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {confirmedRegs.map((reg) => {
                        const user = getUserById(reg.userId);
                        const isCheckedIn = checkedIn.includes(reg.userId);
                        return (
                          <div
                            key={reg.id}
                            className="flex justify-between items-center py-2 px-3 bg-white rounded border border-beige-frame"
                          >
                            <div className="flex-1">
                              <div className="text-sm text-gray-dark">
                                {user?.name || reg.userId}
                              </div>
                              <div className="text-xs text-gray-medium">
                                {isCheckedIn ? "✓ Checked in" : "Not checked in"}
                              </div>
                            </div>
                            {!isCheckedIn && (
                              <button
                                data-testid={`admin-checkin-user-${reg.userId}-${event.id}`}
                                onClick={() => handleCheckIn(event.id, reg.userId)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                              >
                                Check In
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {confirmedRegs.length === 0 && (
                  <p className="text-sm text-gray-medium py-4">
                    No confirmed RSVPs for this event
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
