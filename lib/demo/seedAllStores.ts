"use client";

import { seedAllDemoData } from "./seedDemoData";

/**
 * Seed all demo stores with comprehensive data covering all app states
 * Call this on app initialization or via admin action
 */
export function seedAllStores() {
  const data = seedAllDemoData();

  // Seed users
  if (typeof window !== "undefined") {
    const existingUsers = localStorage.getItem("ns_users");
    if (!existingUsers || JSON.parse(existingUsers).length === 0) {
      localStorage.setItem("ns_users", JSON.stringify(data.users));
    }

    // Seed RSVPs
    const existingRSVPs = localStorage.getItem("ns_registrations");
    if (!existingRSVPs || JSON.parse(existingRSVPs).length === 0) {
      localStorage.setItem("ns_registrations", JSON.stringify(data.rsvps));
    }

    // Seed event questionnaires
    const existingQ = localStorage.getItem("ns_questionnaire_events");
    if (!existingQ || JSON.parse(existingQ).length === 0) {
      localStorage.setItem("ns_questionnaire_events", JSON.stringify(data.eventQuestionnaires));
    }

    // Seed check-ins
    const existingCheckIns = localStorage.getItem("ns_checkins");
    if (!existingCheckIns || JSON.parse(existingCheckIns).length === 0) {
      localStorage.setItem("ns_checkins", JSON.stringify(data.checkIns));
    }

    // Seed matches
    const existingMatches = localStorage.getItem("ns_matches");
    if (!existingMatches || JSON.parse(existingMatches).length === 0) {
      localStorage.setItem("ns_matches", JSON.stringify(data.matches));
    }

    // Seed mutual likes
    const existingMutualLikes = localStorage.getItem("ns_mutual_likes");
    if (!existingMutualLikes || JSON.parse(existingMutualLikes).length === 0) {
      localStorage.setItem("ns_mutual_likes", JSON.stringify(data.mutualLikes));
    }
  }
}

/**
 * Reset all demo data (for testing)
 */
export function resetAllDemoData() {
  if (typeof window === "undefined") return;
  
  const keys = [
    "ns_users",
    "ns_registrations",
    "ns_questionnaire_events",
    "ns_checkins",
    "ns_matches",
    "ns_matching_runs",
    "ns_match_actions",
    "ns_mutual_likes",
    "ns_notifications",
  ];

  keys.forEach((key) => localStorage.removeItem(key));
  
  // Re-seed
  seedAllStores();
}
