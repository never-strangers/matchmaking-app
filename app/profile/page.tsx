"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  validateDob21Plus,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";

const LABEL_WHY =
  "Let's know more about you. Tell us why Never Strangers is for you!";
const LABEL_INSTAGRAM =
  "Vibe Check! What's Your Instagram? (With a clear picture of yourself in your display picture!)";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<{
    dob: string | null;
    gender: string | null;
    preferred_language: string | null;
    instagram: string | null;
    reason: string | null;
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email ?? null);
      supabase
        .from("profiles")
        .select("dob, gender, preferred_language, instagram, reason")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const dobStr =
              data.dob == null
                ? null
                : typeof data.dob === "string"
                  ? data.dob.slice(0, 10)
                  : null;
            setProfile({
              ...data,
              dob: dobStr,
            });
          } else {
            setProfile(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setProfile(null);
          setLoading(false);
        });
    });
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    if (params.get("reset") === "success") setSuccess(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const dob = formData.get("dob") as string | null;
    const dobErr = validateDob21Plus(dob);
    if (dobErr) {
      setError(dobErr);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob: dob || null,
          gender: formData.get("gender") || null,
          preferred_language: formData.get("preferred_language") || null,
          instagram: formData.get("instagram") || null,
          reason: formData.get("reason") || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save profile.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setProfile({
        dob: dob || null,
        gender: (formData.get("gender") as string) || null,
        preferred_language:
          (formData.get("preferred_language") as string) || null,
        instagram: (formData.get("instagram") as string) || null,
        reason: (formData.get("reason") as string) || null,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      {success && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-[var(--success)]/50 bg-[var(--success)]/10 p-4 text-sm text-[var(--success)]"
          data-testid="profile-save-success"
        >
          Profile saved.
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] p-8 bg-[var(--bg-panel)]">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Your profile
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Update your details. You must be 21+ to use Never Strangers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dob"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Date of birth
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              required
              value={profile?.dob ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, dob: e.target.value } : null))
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="profile-dob"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              You must be 21+ to join Never Strangers.
            </p>
          </div>

          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={profile?.gender ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, gender: e.target.value } : null))
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="profile-gender"
            >
              <option value="">Select</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="preferred_language"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Preferred language for event & communications
            </label>
            <select
              id="preferred_language"
              name="preferred_language"
              value={profile?.preferred_language ?? ""}
              onChange={(e) =>
                setProfile((p) =>
                  p ? { ...p, preferred_language: e.target.value } : null
                )
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="profile-preferred-language"
            >
              <option value="">Select</option>
              {PREFERRED_LANGUAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="instagram"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              {LABEL_INSTAGRAM}
            </label>
            <input
              id="instagram"
              name="instagram"
              type="text"
              value={profile?.instagram ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, instagram: e.target.value } : null))
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Your Instagram handle"
              data-testid="profile-instagram"
            />
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              {LABEL_WHY}
            </label>
            <textarea
              id="reason"
              name="reason"
              value={profile?.reason ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, reason: e.target.value } : null))
              }
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Tell us why you want to join"
              data-testid="profile-reason"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="profile-save"
          >
            {submitting ? "Saving…" : "Save profile"}
          </button>
        </form>

        <section
          className="mt-8 pt-8 border-t border-[var(--border)]"
          data-testid="profile-security-section"
        >
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">
            Security
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Reset your password via email.
          </p>
          {resetSent ? (
            <p className="text-sm text-[var(--success)]" data-testid="profile-reset-sent-msg">
              Check your email for the reset link.
            </p>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (!userEmail) return;
                await fetch("/api/auth/reset-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: userEmail }),
                });
                setResetSent(true);
              }}
              className="bg-[var(--bg-panel)] border border-[var(--border)] text-[var(--text)] px-4 py-2 rounded-xl font-medium hover:opacity-90"
              data-testid="profile-reset-password-btn"
            >
              Reset password
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
