"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  validateDob21Plus,
  parseDateOfBirth,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";
import {
  CITIES,
  ATTRACTED_TO_OPTIONS,
  LOOKING_FOR_OPTIONS,
  normalizeCityForSelect,
} from "@/lib/constants/profileOptions";

const LABEL_WHY =
  "Let's know more about you. Tell us why Never Strangers is for you!";
const LABEL_INSTAGRAM =
  "Vibe Check! What's Your Instagram? (With a clear picture of yourself in your display picture!)";

type ProfileRow = {
  name: string | null;
  full_name: string | null;
  city: string | null;
  dob: string | null;
  gender: string | null;
  attracted_to: string | null;
  orientation: { lookingFor?: string[] } | null;
  preferred_language: string | null;
  instagram: string | null;
  reason: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    city: string | null;
    dob: string | null;
    gender: string | null;
    attracted_to: string[];
    looking_for: string[];
    preferred_language: string | null;
    instagram: string | null;
    reason: string | null;
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const user = data.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email ?? null);
      supabase
        .from("profiles")
        .select("name, full_name, city, dob, gender, attracted_to, orientation, preferred_language, instagram, reason")
        .eq("id", user.id)
        .single()
        .then(({ data }: { data: ProfileRow | null }) => {
          if (data) {
            const dobStr =
              data.dob == null
                ? null
                : typeof data.dob === "string"
                  ? String(data.dob).slice(0, 10)
                  : null;
            const full = (data.full_name ?? data.name ?? "").trim();
            const parts = full.split(/\s+/);
            const first_name = parts[0] ?? null;
            const last_name = parts.length > 1 ? parts.slice(1).join(" ") : null;
            const orient = data.orientation as { lookingFor?: string[] } | null;
            const lookingFor = Array.isArray(orient?.lookingFor) ? orient.lookingFor : [];
            const attractedTo = data.attracted_to
              ? String(data.attracted_to).split(",").map((s) => s.trim()).filter(Boolean)
              : [];
            setProfile({
              first_name,
              last_name,
              city: data.city ?? null,
              dob: dobStr,
              gender: data.gender ?? null,
              attracted_to: attractedTo,
              looking_for: lookingFor,
              preferred_language: data.preferred_language ?? null,
              instagram: data.instagram ?? null,
              reason: data.reason ?? null,
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

  const defaultProfile = (): NonNullable<typeof profile> => ({
    first_name: null,
    last_name: null,
    city: null,
    dob: null,
    gender: null,
    attracted_to: [],
    looking_for: [],
    preferred_language: null,
    instagram: null,
    reason: null,
  });

  const toggleAttractedTo = (value: string) => {
    setProfile((p) => {
      if (!p) return { ...defaultProfile(), attracted_to: [value] };
      const next = p.attracted_to.includes(value)
        ? p.attracted_to.filter((v) => v !== value)
        : [...p.attracted_to, value];
      return { ...p, attracted_to: next };
    });
  };
  const toggleLookingFor = (value: string) => {
    setProfile((p) => {
      if (!p) return { ...defaultProfile(), looking_for: [value] };
      const next = p.looking_for.includes(value)
        ? p.looking_for.filter((v) => v !== value)
        : [...p.looking_for, value];
      return { ...p, looking_for: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const dobRaw = (formData.get("dob") as string | null)?.trim() || null;
    const dob = parseDateOfBirth(dobRaw) ?? dobRaw;
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
          first_name: (formData.get("first_name") as string) || null,
          last_name: (formData.get("last_name") as string) || null,
          city: (formData.get("city") as string) || null,
          dob: dob || null,
          gender: formData.get("gender") || null,
          attracted_to: profile?.attracted_to ?? [],
          looking_for: profile?.looking_for ?? [],
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
        first_name: (formData.get("first_name") as string) || null,
        last_name: (formData.get("last_name") as string) || null,
        city: (formData.get("city") as string) || null,
        dob: dob || null,
        gender: (formData.get("gender") as string) || null,
        attracted_to: profile?.attracted_to ?? [],
        looking_for: profile?.looking_for ?? [],
        preferred_language: (formData.get("preferred_language") as string) || null,
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
            <label htmlFor="first_name" className="block text-sm font-medium text-[var(--text)] mb-1">
              First Name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              value={profile?.first_name ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, first_name: e.target.value || null } : { ...defaultProfile(), first_name: e.target.value || null }))
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="First name"
              data-testid="profile-first-name"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-[var(--text)] mb-1">
              Last Name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              value={profile?.last_name ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, last_name: e.target.value || null } : { ...defaultProfile(), last_name: e.target.value || null }))
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Last name"
              data-testid="profile-last-name"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-[var(--text)] mb-1">
              Which city are you in?
            </label>
            <select
              id="city"
              name="city"
              value={normalizeCityForSelect(profile?.city ?? null)}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, city: e.target.value || null } : { ...defaultProfile(), city: e.target.value || null }))
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="profile-city"
            >
              <option value="">Choose a City</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
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
              type="text"
              autoComplete="bday"
              required
              placeholder="e.g. 1995-06-15 or 15/06/1995"
              value={profile?.dob ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const normalized = raw ? parseDateOfBirth(raw) ?? raw : "";
                setProfile((p) => (p ? { ...p, dob: normalized } : { ...defaultProfile(), dob: normalized }));
              }}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="profile-dob"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              You must be 21+ to join Never Strangers. Type or paste a date (yyyy-mm-dd or dd/mm/yyyy).
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
                setProfile((p) => (p ? { ...p, gender: e.target.value } : { ...defaultProfile(), gender: e.target.value }))
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
            <span className="block text-sm font-medium text-[var(--text)] mb-1">Which gender are you attracted to?</span>
            <div className="flex flex-wrap gap-4 mt-2" role="group">
              {ATTRACTED_TO_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile?.attracted_to?.includes(o.value) ?? false}
                    onChange={() => toggleAttractedTo(o.value)}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    data-testid={`profile-attracted-to-${o.value}`}
                  />
                  <span className="text-sm text-[var(--text)]">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-[var(--text)] mb-1">What are you looking for?</span>
            <div className="flex flex-wrap gap-4 mt-2" role="group">
              {LOOKING_FOR_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile?.looking_for?.includes(o.value) ?? false}
                    onChange={() => toggleLookingFor(o.value)}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    data-testid={`profile-looking-for-${o.value}`}
                  />
                  <span className="text-sm text-[var(--text)]">{o.label}</span>
                </label>
              ))}
            </div>
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
                  p ? { ...p, preferred_language: e.target.value } : { ...defaultProfile(), preferred_language: e.target.value }
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
                setProfile((p) => (p ? { ...p, instagram: e.target.value } : { ...defaultProfile(), instagram: e.target.value }))
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
                setProfile((p) => (p ? { ...p, reason: e.target.value } : { ...defaultProfile(), reason: e.target.value }))
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
