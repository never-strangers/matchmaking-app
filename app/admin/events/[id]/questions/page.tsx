"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

type EventQuestion = {
  id: string;
  template_id: string | null;
  prompt: string;
  type: string;
  weight: number;
  sort_order: number;
};

type QuestionTemplate = {
  id: string;
  prompt: string;
  type: string;
  tags: string[] | null;
  weight: number;
  order: number;
  is_default?: boolean;
  default_rank?: number;
};

type LoadResult = {
  selected: EventQuestion[];
  available: QuestionTemplate[];
  defaults: QuestionTemplate[];
  has_answers: boolean;
};

async function bootstrapDefaults(eventId: string): Promise<void> {
  await fetch(`/api/admin/events/${eventId}/questions/bootstrap-defaults`, {
    method: "POST",
  });
}

export default function AdminEventQuestionsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params?.id ?? "";
  const isCreateMode = searchParams?.get("mode") === "create";

  const [selected, setSelected] = useState<EventQuestion[]>([]);
  const [available, setAvailable] = useState<QuestionTemplate[]>([]);
  const [hasAnswers, setHasAnswers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}/questions`);
    if (!res.ok) throw new Error("Failed to load questions");
    return res.json() as Promise<LoadResult>;
  }, [eventId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In create mode: bootstrap defaults server-side first (idempotent)
      if (isCreateMode) {
        await bootstrapDefaults(eventId);
      }
      const data = await fetchQuestions();
      setSelected([...data.selected].sort((a, b) => a.sort_order - b.sort_order));
      setAvailable(data.available);
      setHasAnswers(data.has_answers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [eventId, isCreateMode, fetchQuestions]);

  useEffect(() => { void load(); }, [load]);

  // Derive tags from the available list only (selected don\'t have tags in state)
  const allTags = Array.from(
    new Set(available.flatMap((t) => t.tags ?? []))
  ).sort();

  const filteredAvailable = tagFilter
    ? available.filter((t) => t.tags?.includes(tagFilter))
    : available;

  function addTemplate(tpl: QuestionTemplate) {
    setSelected((prev) => [
      ...prev,
      {
        id: `_new_${tpl.id}`,
        template_id: tpl.id,
        prompt: tpl.prompt,
        type: tpl.type,
        weight: tpl.weight,
        sort_order: prev.length,
      },
    ]);
    setAvailable((prev) => prev.filter((t) => t.id !== tpl.id));
    setSuccessMsg(null);
  }

  function removeQuestion(eq: EventQuestion) {
    if (hasAnswers) return;
    setSelected((prev) => prev.filter((q) => q.id !== eq.id));
    if (eq.template_id) {
      setAvailable((prev) => [
        ...prev,
        {
          id: eq.template_id!,
          prompt: eq.prompt,
          type: eq.type,
          tags: null,
          weight: eq.weight,
          order: eq.sort_order,
        },
      ]);
    }
    setSuccessMsg(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    const templateIds = selected
      .map((q) => q.template_id)
      .filter((id): id is string => id !== null);

    const res = await fetch(`/api/admin/events/${eventId}/questions/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_ids: templateIds }),
    });
    const data = await res.json() as { ok: boolean; error?: string; count?: number };
    if (!data.ok) {
      setError(data.error ?? "Save failed");
      setSaving(false);
      return;
    }

    if (isCreateMode) {
      router.push(`/admin/events/${eventId}?toast=Questions+saved+(${data.count ?? templateIds.length})`);
      return;
    }

    setSuccessMsg(`Questions saved (${data.count ?? templateIds.length}).`);
    await load();
    setSaving(false);
  }

  async function resetToDefaults() {
    setLoading(true);
    setError(null);
    try {
      // Re-bootstrap to ensure defaults are in DB, then reload
      await bootstrapDefaults(eventId);
      const data = await fetchQuestions();

      // All templates pool: selected + available, deduped
      const seen = new Set<string>();
      const allTemplates: QuestionTemplate[] = [];
      for (const eq of data.selected) {
        if (eq.template_id && !seen.has(eq.template_id)) {
          seen.add(eq.template_id);
          allTemplates.push({ id: eq.template_id, prompt: eq.prompt, type: eq.type, tags: null, weight: eq.weight, order: eq.sort_order });
        }
      }
      for (const t of data.available) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          allTemplates.push(t);
        }
      }

      // Use defaults from server, ordered by default_rank
      const defaultIds = new Set(data.defaults.map((d) => d.id));
      const defaultSelected: EventQuestion[] = data.defaults.map((tpl, idx) => ({
        id: `_new_${tpl.id}`,
        template_id: tpl.id,
        prompt: tpl.prompt,
        type: tpl.type,
        weight: tpl.weight,
        sort_order: idx,
      }));

      setSelected(defaultSelected);
      setAvailable(allTemplates.filter((t) => !defaultIds.has(t.id)));
      setHasAnswers(data.has_answers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setLoading(false);
      setSuccessMsg(null);
    }
  }

  /** "Skip for now": bootstrap defaults on server so event is never left with 0 questions, then navigate. */
  async function handleSkip() {
    setSkipping(true);
    try {
      await bootstrapDefaults(eventId);
    } catch {
      // Non-fatal — navigate regardless
    }
    router.push(`/admin/events/${eventId}`);
  }

  const count = selected.length;
  const countOk = count >= 20 && count <= 30;
  const countColor = countOk ? "var(--success, #16a34a)" : "var(--danger, #dc2626)";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p style={{ color: "var(--text-muted)" }}>Loading questions…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 pb-32">
      {/* Breadcrumb */}
      <div className="mb-4 flex gap-4 flex-wrap items-center">
        <Link
          href={`/admin/events/${eventId}`}
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Event
        </Link>
        {isCreateMode && (
          <span className="text-sm py-2" style={{ color: "var(--text-muted)" }}>
            Step 2 of 2: Select Questions
          </span>
        )}
      </div>

      <PageHeader
        title={isCreateMode ? "Choose Your Event Questions" : "Manage Questions"}
        subtitle="Select 20–30 questions for this event\'s questionnaire."
      />

      {/* Locked warning */}
      {hasAnswers && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={{
            background: "rgba(180,130,0,0.08)",
            borderColor: "rgba(180,130,0,0.3)",
            color: "var(--text)",
          }}
        >
          <strong>⚠ Questions locked — answers exist.</strong> You can add new questions
          but cannot remove existing ones. Reset to defaults is disabled.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#dc2626" }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "#dcfce7", color: "#16a34a" }}>
          {successMsg}
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left — Selected */}
        <div>
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                Your event questions
              </h2>
              <div className="flex items-center gap-2">
                {hasAnswers && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(180,130,0,0.12)", color: "rgba(140,100,0,1)" }}
                  >
                    Locked
                  </span>
                )}
                <span className="text-sm font-mono font-semibold" style={{ color: countColor }}>
                  {count}/30
                </span>
              </div>
            </div>

            {selected.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
                No questions selected yet. Add from the library →
              </p>
            ) : (
              <ol className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {selected.map((eq, idx) => (
                  <li
                    key={eq.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg"
                    style={{ background: "var(--bg-dark, #f5f3ec)" }}
                  >
                    <span
                      className="text-xs font-mono mt-0.5 w-5 shrink-0 text-right tabular-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {idx + 1}.
                    </span>
                    <span className="text-sm flex-1 leading-snug" style={{ color: "var(--text)" }}>
                      {eq.prompt}
                    </span>
                    <button
                      onClick={() => removeQuestion(eq)}
                      disabled={hasAnswers}
                      className="text-xs shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: "var(--danger, #dc2626)" }}
                      title={hasAnswers ? "Cannot remove after users have answered" : "Remove"}
                      aria-label="Remove question"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Right — Library */}
        <div>
          <Card padding="md">
            <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>
              Question Library
            </h2>

            {/* Tag filter pills: red filled when active */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
                  style={tagFilter === null ? {
                    background: "var(--primary, #B90F14)",
                    borderColor: "var(--primary, #B90F14)",
                    color: "#fff",
                  } : {
                    background: "transparent",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  ALL
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                    className="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
                    style={tagFilter === tag ? {
                      background: "var(--primary, #B90F14)",
                      borderColor: "var(--primary, #B90F14)",
                      color: "#fff",
                    } : {
                      background: "transparent",
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {filteredAvailable.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
                {available.length === 0 ? "All templates added." : "No templates match this filter."}
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {filteredAvailable.map((tpl) => (
                  <li key={tpl.id}>
                    <button
                      onClick={() => addTemplate(tpl)}
                      className="w-full text-left p-2.5 rounded-lg hover:opacity-80 transition-opacity group"
                      style={{ background: "var(--bg-dark, #f5f3ec)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm leading-snug flex-1" style={{ color: "var(--text)" }}>
                          {tpl.prompt}
                        </span>
                        <span
                          className="text-xs shrink-0 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--primary, #B90F14)" }}
                        >
                          Add +
                        </span>
                      </div>
                      {tpl.tags?.length ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tpl.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t px-4 py-3 sm:py-4"
        style={{ background: "var(--bg-panel, #fff)", borderColor: "var(--border)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm font-medium" style={{ color: countColor }}>
            {countOk
              ? `${count} questions selected — ready to save.`
              : count < 20
              ? `Select ${20 - count} more question${20 - count === 1 ? "" : "s"} (minimum 20).`
              : `Remove ${count - 30} question${count - 30 === 1 ? "" : "s"} (maximum 30).`}
          </p>
          <div className="flex items-center gap-3 shrink-0">
            {isCreateMode && (
              <button
                onClick={handleSkip}
                disabled={skipping || saving}
                className="text-sm hover:underline disabled:opacity-50"
                style={{ color: "var(--text-muted)" }}
                data-testid="questions-skip"
              >
                {skipping ? "Saving defaults…" : "Skip for now"}
              </button>
            )}
            {!hasAnswers && (
              <Button
                variant="secondary"
                size="sm"
                onClick={resetToDefaults}
                disabled={saving || hasAnswers}
                data-testid="questions-reset"
              >
                Reset to defaults
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={!countOk || saving}
              data-testid="questions-save"
            >
              {saving ? "Saving…" : isCreateMode ? "Save & Finish" : "Save Questions"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
