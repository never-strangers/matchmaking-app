"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ensureConversation,
  getCurrentUserId,
} from "@/lib/chatStore";
import {
  markLiked,
  isLiked,
  createMatch,
  hasMatch,
  getQuestionnaireAnswers,
  markSkipped,
  isSkipped,
  getDemoUser,
} from "@/lib/demoStore";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import { DEMO_USERS, getDefaultDemoUser } from "@/lib/matching/demoUsers";
import { MatchUser, MatchResult } from "@/types/questionnaire";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const isChatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false";

export default function MatchPage() {
  const router = useRouter();
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matchCreated, setMatchCreated] = useState(false);

  useEffect(() => {
    if (!DEMO_MODE) {
      return;
    }

    // Determine current user
    const userAnswers = getQuestionnaireAnswers();
    const demoUser = getDemoUser();

    let currentUser: MatchUser;

    if (userAnswers && demoUser) {
      // Use user's answers from onboarding
      currentUser = {
        id: demoUser.id,
        name: demoUser.name,
        city: demoUser.city,
        answers: userAnswers,
        lastActiveAt: new Date().toISOString(),
      };
    } else {
      // Fallback to default demo user (Mikhail)
      currentUser = getDefaultDemoUser();
    }

    // Get matches using the matching engine
    const results = getMatchesForUser(currentUser, DEMO_USERS);

    // Filter out skipped users
    const filteredResults = results.filter(
      (result) => !isSkipped(result.user.id)
    );

    setMatchResults(filteredResults);
  }, []);

  const handleLike = (matchId: string, matchName: string) => {
    markLiked(matchId);
    // Simulate mutual like = match created
    const match = createMatch(matchId, matchName);
    setMatchCreated(true);
    // Reload matches
    const userAnswers = getQuestionnaireAnswers();
    const demoUser = getDemoUser();
    let currentUser: MatchUser;

    if (userAnswers && demoUser) {
      currentUser = {
        id: demoUser.id,
        name: demoUser.name,
        city: demoUser.city,
        answers: userAnswers,
        lastActiveAt: new Date().toISOString(),
      };
    } else {
      currentUser = getDefaultDemoUser();
    }

    const results = getMatchesForUser(currentUser, DEMO_USERS);
    const filteredResults = results.filter(
      (result) => !isSkipped(result.user.id)
    );
    setMatchResults(filteredResults);

    // Hide banner after 3 seconds
    setTimeout(() => setMatchCreated(false), 3000);
  };

  const handleSkip = (matchId: string) => {
    markSkipped(matchId);
    // Remove from results
    setMatchResults((prev) => prev.filter((r) => r.user.id !== matchId));
  };

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

  if (!DEMO_MODE) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 data-testid="match-title" className="text-3xl font-bold text-gray-dark mb-8">
          Your Matches
        </h1>
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 text-center">
          <p className="text-gray-dark">
            Matching is currently disabled. Please enable DEMO_MODE to use the
            questionnaire-based matching algorithm.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 data-testid="match-title" className="text-3xl font-bold text-gray-dark mb-8">
        Your Matches
      </h1>
      {matchCreated && (
        <div
          data-testid="match-created"
          className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <p className="text-green-800 font-medium">
            🎉 It&apos;s a match! You can now message them.
          </p>
        </div>
      )}
      {matchResults.length === 0 ? (
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 text-center">
          <p className="text-gray-dark">
            No matches found. Complete the onboarding questionnaire to see your
            matches!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchResults.map((result) => {
            const { user, score, aligned, mismatched } = result;
            const liked = isLiked(user.id);
            const matched = hasMatch(user.id);
            return (
              <div
                key={user.id}
                data-testid={`match-card-${user.id}`}
                className="border border-beige-frame rounded-xl shadow-sm p-6 bg-white"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-dark">
                        {user.name}
                      </h2>
                      <span
                        data-testid={`match-score-${user.id}`}
                        className={`text-sm font-bold px-3 py-1 rounded-full ${
                          score >= 80
                            ? "bg-green-100 text-green-800"
                            : score >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {score}% Match
                      </span>
                    </div>
                    <p className="text-gray-medium mb-3">{user.city}</p>
                    {user.gender && (
                      <p className="text-sm text-gray-dark mb-1">
                        <span className="font-medium">Gender:</span> {user.gender}
                      </p>
                    )}
                    {user.intent && (
                      <p className="text-sm text-gray-dark mb-3">
                        <span className="font-medium">Looking for:</span>{" "}
                        {user.intent}
                      </p>
                    )}
                    {matched && (
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Matched
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!liked && !matched && (
                      <>
                        <button
                          data-testid={`match-like-${user.id}`}
                          onClick={() => handleLike(user.id, user.name)}
                          className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          Like
                        </button>
                        <button
                          data-testid={`match-skip-${user.id}`}
                          onClick={() => handleSkip(user.id)}
                          className="bg-gray-200 text-gray-dark px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors whitespace-nowrap"
                        >
                          Skip
                        </button>
                      </>
                    )}
                    {matched && isChatEnabled && (
                      <button
                        data-testid={`match-message-${user.id}`}
                        onClick={() => handleMessage(user.id, user.name)}
                        className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Message
                      </button>
                    )}
                  </div>
                </div>

                {/* Alignment Reasons */}
                {aligned.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-beige-frame">
                    <h3 className="text-sm font-semibold text-gray-dark mb-2">
                      Why you match:
                    </h3>
                    <ul
                      data-testid={`match-aligned-${user.id}`}
                      className="space-y-1"
                    >
                      {aligned.map((reason, idx) => (
                        <li key={idx} className="text-sm text-gray-dark">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mismatch Reasons */}
                {mismatched.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-beige-frame">
                    <h3 className="text-sm font-semibold text-gray-medium mb-2">
                      Differences:
                    </h3>
                    <ul
                      data-testid={`match-mismatched-${user.id}`}
                      className="space-y-1"
                    >
                      {mismatched.map((reason, idx) => (
                        <li key={idx} className="text-sm text-gray-medium">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


