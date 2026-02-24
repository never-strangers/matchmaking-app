"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  validateDob21Plus,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";

const LABEL_WHY =
  "Let's know more about you. Tell us why Never Strangers is for you!";
const LABEL_INSTAGRAM =
  "Vibe Check! What's Your Instagram? (With a clear picture of yourself in your display picture!)";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [preferred_language, setPreferredLanguage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const dobErr = validateDob21Plus(dob);
    if (dobErr) {
      setError(dobErr);
      return;
    }
    if (!email?.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          dob: dob || null,
          gender: gender || null,
          preferred_language: preferred_language || null,
          instagram: instagram.trim() || null,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Signup failed.");
        setSubmitting(false);
        return;
      }
      router.replace("/register/verification");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-xl border border-[var(--border)] p-8 bg-[var(--bg-panel)]">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Join Never Strangers
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Create your account. You must be 21+ to join.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Min. 8 characters"
            />
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
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="register-dob"
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
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="register-gender"
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
              value={preferred_language}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              data-testid="register-preferred-language"
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
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Your Instagram handle"
              data-testid="register-instagram"
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
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Tell us why you want to join"
              data-testid="register-reason"
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
            data-testid="register-submit"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-[var(--text-muted)] mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
