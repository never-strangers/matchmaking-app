"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
};

export default function AdminEventQuestionsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? "";
  const [selected, setSelected] = useState<EventQuestion[]>([]);
  const [available, setAvailable] = useState<QuestionTemplate[]>([]);
  const [hasAnswers, setHasAnswers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${eventId}/questions`);
    if (!res.ok) { setError("Failed to load questions"); setLoading(false); return; }
    const data = await res.json() as {
      selected: EventQuestion[];
      available: QuestionTemplate[];
      has_answers: boolean;
    };
    setSelected(data.selected.sort((a, b) => a.sort_order - b.sort_order));
    setAvailable(data.available);
    setHasAnswers(data.has_answers);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  // Derive all unique tags from available templates
  const allTags = Array.from(
    new Set(available.flatMap((t) => t.tags ?? []))
  ).sort();

  const filteredAvailable = tagFilter
    ? available.filter((t) => t.tags?.includes(tagFilter))
    : available;

  function addTemplate(tpl: QuestionTemplate) {
    const newEq: EventQuestion = {
      id: `_new_${tpl.id}`,
      template_id: tpl.id,
      prompt: tpl.prompt,
      type: tpl.type,
      weight: tpl.weight,
      sort_order: selected.length,
    };
    setSelected((prev) => [...prev, newEq]);
    setAvailable((prev) => prev.filter((t) => t.id !== tpl.id));
    setSuccess(false);
  }

  function removeQuestion(eq: EventQuestion) {
    if (hasAnswers) return; // guarded in UI too
    setSelected((prev) => prev.filter((q) => q.id !== eq.id));
    if (eq.template_id) {
      // Return to available list (find original template data from selected)
      const tpl: QuestionTemplate = {
        id: eq.template_id,
        prompt: eq.prompt,
        type: eq.type,
        tags: null,
        weight: eq.weight,
        order: eq.sort_order,
      };
      setAvailable((prev) => [...prev, tpl]);
    }
    setSuccess(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const templateIds = selected
      .map((q) => q.template_id)
      .filter((id): id is string => id !== null);

    const res = await fetch(`/api/admin/events/${eventId}/questions/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_ids: templateIds }),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? "Save failed");
    } else {
      setSuccess(true);
      await load();
    }
    setSaving(false);
  }

  async function resetToDefaults() {
    setLoading(true);
    setError(null);
    // Load all default templates
    const res = await fetch(`/api/admin/events/${eventId}/questions`);
    const data = await res.json() as { selected: EventQuestion[]; available: QuestionTemplate[]; has_answers: boolean };
    // Reset: clear selected, put all available back, then re-fetch
    // This just reloads; a proper reset would call an API to delete all event_questions
    setSelected([]);
    setAvailable([...data.selected.map((eq) => ({
      id: eq.template_id ?? eq.id,
      prompt: eq.prompt,
      type: eq.type,
      tags: null,
      weight: eq.weight,
      order: eq.sort_order,
    })), ...data.available]);
    setHasAnswers(data.has_answers);
    setLoading(false);
    setSuccess(false);
  }

  const count = selected.length;
  const countOk = count >= 20 && count <= 30;
  const countColor = countOk ? "var(--success)" : "var(--danger)";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p style={{ color: "var(--text-muted)" }}>Loading questions…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href={`/admin/events/${eventId}`}
          className="text-sm hover:underline py-2 inline-block"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Event
        </Link>
      </div>

      <PageHeader
        title="Manage Questions"
        subtitle="Select 20–30 questions for this event's questionnaire."
      />

      {hasAnswers && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={{
            background: "rgba(180,130,0,0.08)",
            borderColor: "rgba(180,130,0,0.3)",
            color: "var(--text)",
          }}
        >
          <strong>⚠ Users have already answered.</strong> You can add questions but
          cannot remove existing ones.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "var(--danger-light, #fee)", color: "var(--danger)" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "var(--success-light, #efe)", color: "var(--success)" }}>
          Questions saved successfully.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left — Selected */}
        <div>
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                Selected Questions
              </h2>
              <span className="text-sm font-mono" style={{ color: countColor }}>
                {count} / 20–30
              </span>
            </div>

            {selected.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
                No questions selected. Add from the library →
              </p>
            ) : (
              <ol className="space-y-2">
                {selected.map((eq, idx) => (
                  <li
                    key={eq.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "var(--bg-dark, #f5f3ec)" }}
                  >
                    <span
                      className="text-xs font-mono mt-0.5 w-5 shrink-0 text-right"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {idx + 1}.
                    </span>
                    <span className="text-sm flex-1" style={{ color: "var(--text)" }}>
                      {eq.prompt}
                    </span>
                    <button
                      onClick={() => removeQuestion(eq)}
                      disabled={hasAnswers}
                      className="text-xs shrink-0 hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: "var(--danger)" }}
                      title={hasAnswers ? "Cannot remove after users have answered" : "Remove"}
                    >
                      ✕
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

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-xs px-2 py-1 rounded-full border"
                  style={{
                    borderColor: tagFilter === null ? "var(--primary)" : "var(--border)",
                    color: tagFilter === null ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: tagFilter === null ? 600 : 400,
                  }}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                    className="text-xs px-2 py-1 rounded-full border"
                    style={{
                      borderColor: tagFilter === tag ? "var(--primary)" : "var(--border)",
                      color: tagFilter === tag ? "var(--primary)" : "var(--text-muted)",
                      fontWeight: tagFilter === tag ? 600 : 400,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {filteredAvailable.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
                {available.length === 0 ? "All templates added." : "No templates match this tag."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredAvailable.map((tpl) => (
                  <li key={tpl.id}>
                    <button
                      onClick={() => addTemplate(tpl)}
                      className="w-full text-left p-3 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: "var(--bg-dark, #f5f3ec)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--text)" }}>
                        {tpl.prompt}
                      </span>
                      {tpl.tags?.length ? (
                        <span className="block mt-1">
                          {tpl.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm" className="mr-1">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {countOk
            ? `${count} questions selected — ready to save.`
            : `Select ${count < 20 ? `${20 - count} more` : `${count - 30} fewer`} question${count < 20 && 20 - count === 1 ? "" : "s"} (need 20–30).`}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={resetToDefaults} disabled={saving || hasAnswers}>
            Reset to defaults
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={save}
            disabled={!countOk || saving}
          >
            {saving ? "Saving…" : "Save Questions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
