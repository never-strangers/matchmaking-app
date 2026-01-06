"use client";

import { useRouter } from "next/navigation";
import {
  ensureConversation,
  getCurrentUserId,
  DEMO_USERS,
} from "@/lib/chatStore";

const mockMatches = [
  {
    id: "anna",
    name: "Anna",
    age: 28,
    city: "Singapore",
    interests: ["Running", "Books", "Coffee"],
  },
  {
    id: "james",
    name: "James",
    age: 31,
    city: "Hong Kong",
    interests: ["Tech", "Fitness", "Cinema"],
  },
  {
    id: "sarah",
    name: "Sarah",
    age: 26,
    city: "Bangkok",
    interests: ["Coffee", "Books", "Running"],
  },
  {
    id: "michael",
    name: "Michael",
    age: 29,
    city: "Singapore",
    interests: ["Tech", "Cinema", "Fitness"],
  },
  {
    id: "emma",
    name: "Emma",
    age: 27,
    city: "Tokyo",
    interests: ["Books", "Coffee", "Running"],
  },
];

const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";

export default function MatchPage() {
  const router = useRouter();

  const handleMessage = (matchId: string, matchName: string) => {
    if (!isChatEnabled) return;

    const currentUserId = getCurrentUserId();
    // Create deterministic conversation ID
    const conversationId = `conv_${[currentUserId, matchId].sort().join("_")}`;
    
    // Ensure conversation exists
    ensureConversation(conversationId, [currentUserId, matchId], matchName);
    
    // Navigate to chat
    router.push(`/messages/${conversationId}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-dark mb-8">
        Your Matches (Preview)
      </h1>
      <div className="space-y-4">
        {mockMatches.map((match) => (
          <div
            key={match.id}
            className="border border-beige-frame rounded-xl shadow-sm p-6 bg-white"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-dark mb-2">
                  {match.name}, {match.age}
                </h2>
                <p className="text-gray-medium mb-3">{match.city}</p>
                <p className="text-sm text-gray-dark">
                  <span className="font-medium">Interests:</span>{" "}
                  {match.interests.join(", ")}
                </p>
              </div>
              {isChatEnabled && (
                <button
                  onClick={() => handleMessage(match.id, match.name)}
                  className="ml-4 bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Message
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


