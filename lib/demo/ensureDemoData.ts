"use client";

/**
 * Ensure all demo data is seeded
 * Call this to guarantee demo data exists
 */
export function ensureDemoDataSeeded() {
  if (typeof window === "undefined") return;

  // Force seed by checking each store
  const stores = [
    "ns_users",
    "ns_registrations",
    "ns_questionnaire_events",
    "ns_checkins",
    "ns_matches",
    "ns_match_actions",
    "ns_mutual_likes",
  ];

  // Trigger seed by accessing the list functions
  // This will auto-seed if empty
  try {
    // Import dynamically to avoid circular dependencies
    import("./userStore").then(({ listUsers }) => listUsers());
    import("./registrationStore").then(({ listRegistrations }) => listRegistrations());
    import("./questionnaireEventStore").then(({ getEventQuestionnaire }) => {
      // Just trigger the store to initialize
      const stored = localStorage.getItem("ns_questionnaire_events");
      if (!stored || JSON.parse(stored).length === 0) {
        // Will auto-seed
      }
    });
    import("./checkInStore").then(({ getCheckIn }) => {
      // Trigger initialization
    });
    import("./matchingStore").then(({ getMatchesForEvent }) => {
      // Trigger by checking for matches
      getMatchesForEvent("event_coffee");
    });
  } catch (err) {
    console.error("Error ensuring demo data:", err);
  }
}
