"use client";

import { useEffect, useMemo, useState } from "react";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import {
  ensurePilotProfile,
  getCurrentPilotUser,
  getPilotCandidates,
  setCurrentPilotUserAnswers,
  type PilotUser,
} from "@/lib/pilot/pilotStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById } from "@/lib/demo/userStore";
import { getRegistrationData } from "@/lib/demoStore";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

type SessionUser = { email: string; name?: string | null; city?: string | null };

async function resolveSessionUser(): Promise<SessionUser | null> {
  // 1) Supabase session (Google OAuth, etc.)
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const u = data?.user;
    if (u?.email) {
      const name =
        (u.user_metadata as any)?.full_name ||
        (u.user_metadata as any)?.name ||
        u.email.split("@")[0];
      return { email: u.email, name, city: "Singapore" };
    }
  } catch {
    // Supabase may not be configured in demo/dev; fall through
  }

  // 2) Demo local user store (used by existing E2E/demo flow)
  const demoUserId = getCurrentUserId();
  if (demoUserId) {
    const profile = getUserById(demoUserId);
    if (profile?.email) {
      return { email: profile.email, name: profile.name, city: profile.city || "Singapore" };
    }
  }

  // 3) Registration data (pre-verification)
  const reg = getRegistrationData();
  if (reg?.email) {
    const name = `${reg.firstName || ""} ${reg.lastName || ""}`.trim() || reg.email.split("@")[0];
    return { email: reg.email, name, city: reg.city || "Singapore" };
  }

  return null;
}

export default function PilotDashboard() {
  const [pilotUser, setPilotUser] = useState<PilotUser | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [matches, setMatches] = useState<
    Array<{
      id: string;
      name: string;
      city: string;
      score: number;
      aligned: string[];
      mismatched: string[];
    }>
  >([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Keep the demo “always matchable” by avoiding dealbreaker questions in the editable set.
  // Dealbreakers can exclude *all* candidates if set to extremes.
  const editableQuestions = useMemo(
    () => QUESTIONS.filter((q) => !q.isDealbreaker).slice(0, 10),
    []
  );

  const computeMatches = (user: PilotUser) => {
    const candidates = getPilotCandidates();
    const results = getMatchesForUser(
      {
        id: user.id,
        name: user.name,
        city: user.city,
        answers: user.answers,
      },
      candidates,
      QUESTIONS
    )
      .slice(0, 10)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        city: m.user.city,
        score: m.score,
        aligned: m.aligned.slice(0, 3),
        mismatched: m.mismatched.slice(0, 1),
      }));
    setMatches(results);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      const sessionUser = await resolveSessionUser();
      if (!sessionUser) {
        if (!cancelled) {
          setError(
            "No signed-in user found. Please sign in (or complete demo registration) to view pilot matches."
          );
          setLoading(false);
        }
        return;
      }

      ensurePilotProfile(sessionUser);
      const current = getCurrentPilotUser();
      if (!current) {
        if (!cancelled) {
          setError("Failed to initialize Pilot Mode profile.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setPilotUser(current);
        setDraftAnswers(current.answers);
        computeMatches(current);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRerun = () => {
    const current = getCurrentPilotUser();
    if (!current) return;
    setPilotUser(current);
    setDraftAnswers(current.answers);
    computeMatches(current);
  };

  const handleSaveAnswers = () => {
    if (!draftAnswers) return;
    const patch: Partial<Record<string, 1 | 2 | 3 | 4>> = {};
    for (const q of editableQuestions) {
      const v = draftAnswers[q.id];
      if (v) patch[q.id] = v;
    }

    const updated = setCurrentPilotUserAnswers(patch);
    if (updated) {
      setPilotUser(updated);
      setDraftAnswers(updated.answers);
      computeMatches(updated);
    }
  };

  const handleFixDealbreakers = () => {
    // Neutralize the two dealbreakers so the demo always produces matches.
    const updated = setCurrentPilotUserAnswers({
      q_lifestyle_1: 3,
      q_lifestyle_2: 3,
    });
    if (updated) {
      setPilotUser(updated);
      setDraftAnswers(updated.answers);
      computeMatches(updated);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 data-testid="pilot-title" className="text-3xl font-bold text-gray-dark mb-2">
          Pilot Mode: Matching Demo
        </h1>
        <p className="text-gray-medium">Loading pilot profile…</p>
      </div>
    );
  }

  if (error || !pilotUser || !draftAnswers) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 data-testid="pilot-title" className="text-3xl font-bold text-gray-dark mb-6">
          Pilot Mode: Matching Demo
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">{error || "Pilot Mode is unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 data-testid="pilot-title" className="text-3xl font-bold text-gray-dark mb-2">
            Pilot Mode: Matching Demo
          </h1>
          <p className="text-gray-medium text-sm">
            Logged in as <span className="font-medium text-gray-dark">{pilotUser.name}</span>{" "}
            <span className="text-gray-medium">({pilotUser.email})</span> ·{" "}
            <span className="font-medium text-gray-dark">{pilotUser.city}</span>
          </p>
        </div>
        <button
          data-testid="pilot-rerun"
          onClick={handleRerun}
          className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Re-run matching
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <details data-testid="pilot-edit-answers" className="bg-white border border-beige-frame rounded-xl p-5">
            <summary className="cursor-pointer select-none text-gray-dark font-semibold">
              Edit my answers (10 questions)
            </summary>
            <div className="mt-4 space-y-5">
              {editableQuestions.map((q) => {
                const current = draftAnswers[q.id] || 3;
                return (
                  <div
                    key={q.id}
                    className="border-t border-beige-frame pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="text-sm font-medium text-gray-dark mb-2">{q.text}</div>
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 4].map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm text-gray-medium cursor-pointer">
                          <input
                            type="radio"
                            name={`pilot-${q.id}`}
                            value={v}
                            checked={current === v}
                            onChange={() =>
                              setDraftAnswers((prev) =>
                                prev ? { ...prev, [q.id]: v as 1 | 2 | 3 | 4 } : prev
                              )
                            }
                            className="w-4 h-4 text-red-accent border-beige-frame focus:ring-red-accent"
                          />
                          <span className="text-gray-dark">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button
                data-testid="pilot-save-answers"
                onClick={handleSaveAnswers}
                className="w-full bg-gray-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Save answers & re-run
              </button>
            </div>
          </details>
        </div>

        <div className="lg:col-span-2">
          {matches.length === 0 ? (
            <div className="bg-white border border-beige-frame rounded-xl p-6 text-center">
              <p className="text-gray-dark">No matches found.</p>
              <p className="text-gray-medium text-sm mt-1">
                Tip: if dealbreaker answers are too far from everyone, the algorithm excludes all matches.
              </p>
              <button
                onClick={handleFixDealbreakers}
                className="mt-4 inline-flex items-center justify-center bg-gray-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Fix dealbreakers & re-run
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((m) => (
                <div
                  key={m.id}
                  data-testid={`pilot-match-card-${m.id}`}
                  className="bg-white border border-beige-frame rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-gray-dark truncate">{m.name}</div>
                      <div className="text-sm text-gray-medium">{m.city}</div>
                    </div>
                    <div
                      data-testid={`pilot-match-score-${m.id}`}
                      className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full ${
                        m.score >= 80
                          ? "bg-green-100 text-green-800"
                          : m.score >= 60
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.score}/100
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-dark mb-2">Top aligned</div>
                      <ul className="list-disc list-inside space-y-1">
                        {m.aligned.map((r, idx) => (
                          <li key={idx} className="text-xs text-gray-medium">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-dark mb-2">Top mismatch</div>
                      <div className="text-xs text-gray-medium">{m.mismatched[0] || "No notable mismatches"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

