"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
} from "@/lib/constants/profileOptions";

const LABEL_WHY =
  "Let's know more about you. Tell us why Never Strangers is for you!";
const LABEL_INSTAGRAM =
  "Vibe Check! What's Your Instagram? (With a clear picture of yourself in your display picture!)";
const AGREEMENT_MARKETING =
  "By submitting this form, I agree to be contacted for event updates and marketing.";
const AGREEMENT_ACCURATE =
  "I confirm that the details I have provided are accurate and truthful. I understand that I may be required to present a valid photo ID at the event for verification purposes, and entry may be denied if the information does not match.";

const inputClass =
  "w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
const selectClass =
  "w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
const labelClass = "block text-sm font-medium text-[var(--text)] mb-1";
const checkboxClass =
  "rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [attractedTo, setAttractedTo] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [preferred_language, setPreferredLanguage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [reason, setReason] = useState("");
  const [agreementMarketing, setAgreementMarketing] = useState(false);
  const [agreementAccurate, setAgreementAccurate] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleAttractedTo = (value: string) => {
    setAttractedTo((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };
  const toggleLookingFor = (value: string) => {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedDob = dob.trim() ? parseDateOfBirth(dob) ?? dob : "";
    const dobErr = validateDob21Plus(normalizedDob);
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
    if (!city?.trim()) {
      setError("Please choose a city.");
      return;
    }
    if (!agreementAccurate) {
      setError("You must confirm that your details are accurate and that you may be required to present ID at the event.");
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
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          city: city.trim() || null,
          dob: normalizedDob || null,
          gender: gender || null,
          attracted_to: attractedTo.length ? attractedTo : null,
          looking_for: lookingFor.length ? lookingFor : null,
          preferred_language: preferred_language || null,
          instagram: instagram.trim() || null,
          reason: reason.trim() || null,
          agreement_marketing: agreementMarketing,
          agreement_accurate: agreementAccurate,
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
            <label htmlFor="email" className={labelClass}>
              E-mail Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
              data-testid="register-email"
            />
          </div>

          <div>
            <label htmlFor="first_name" className={labelClass}>
              First Name
            </label>
            <input
              id="first_name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="First name"
              data-testid="register-first-name"
            />
          </div>

          <div>
            <label htmlFor="last_name" className={labelClass}>
              Last Name
            </label>
            <input
              id="last_name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder="Last name"
              data-testid="register-last-name"
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Create Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Min. 8 characters"
              data-testid="register-password"
            />
          </div>

          <div>
            <label htmlFor="city" className={labelClass}>
              Which city are you in?
            </label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={selectClass}
              data-testid="register-city"
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
            <label htmlFor="dob" className={labelClass}>
              Birth Date
            </label>
            <input
              id="dob"
              type="text"
              required
              autoComplete="bday"
              placeholder="e.g. 1995-06-15 or 15/06/1995"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={inputClass}
              data-testid="register-dob"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              You must be 21+ to join Never Strangers.
            </p>
          </div>

          <div>
            <span className={labelClass}>Gender</span>
            <div className="flex flex-wrap gap-4 mt-2" role="group" aria-label="Gender">
              {GENDER_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={o.value}
                    checked={gender === o.value}
                    onChange={(e) => setGender(e.target.value)}
                    className={checkboxClass}
                    data-testid={`register-gender-${o.value}`}
                  />
                  <span className="text-sm text-[var(--text)]">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Which gender are you attracted to?</span>
            <div className="flex flex-wrap gap-4 mt-2" role="group">
              {ATTRACTED_TO_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attractedTo.includes(o.value)}
                    onChange={() => toggleAttractedTo(o.value)}
                    className={checkboxClass}
                    data-testid={`register-attracted-to-${o.value}`}
                  />
                  <span className="text-sm text-[var(--text)]">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>What are you looking for?</span>
            <div className="flex flex-wrap gap-4 mt-2" role="group">
              {LOOKING_FOR_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lookingFor.includes(o.value)}
                    onChange={() => toggleLookingFor(o.value)}
                    className={checkboxClass}
                    data-testid={`register-looking-for-${o.value}`}
                  />
                  <span className="text-sm text-[var(--text)]">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="reason" className={labelClass}>
              {LABEL_WHY}
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Tell us why you want to join"
              data-testid="register-reason"
            />
          </div>

          <div>
            <label htmlFor="instagram" className={labelClass}>
              {LABEL_INSTAGRAM}
            </label>
            <input
              id="instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputClass}
              placeholder="Username"
              data-testid="register-instagram"
            />
          </div>

          <div>
            <label className={labelClass}>Upload your Profile Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[var(--primary)] file:text-white file:font-medium"
              data-testid="register-photo"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Optional</p>
          </div>

          <div>
            <label htmlFor="preferred_language" className={labelClass}>
              Preferred language for event & communications
            </label>
            <select
              id="preferred_language"
              value={preferred_language || "en"}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className={selectClass}
              data-testid="register-preferred-language"
            >
              <option value="en">English (Default)</option>
              {PREFERRED_LANGUAGE_OPTIONS.filter((o) => o.value !== "en").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreementMarketing}
                onChange={(e) => setAgreementMarketing(e.target.checked)}
                className={`mt-1 ${checkboxClass}`}
                data-testid="register-agreement-marketing"
              />
              <span className="text-sm text-[var(--text)]">{AGREEMENT_MARKETING}</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreementAccurate}
                onChange={(e) => setAgreementAccurate(e.target.checked)}
                className={`mt-1 ${checkboxClass}`}
                data-testid="register-agreement-accurate"
              />
              <span className="text-sm text-[var(--text)]">{AGREEMENT_ACCURATE}</span>
            </label>
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
            {submitting ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="text-sm text-[var(--text-muted)] mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] underline" data-testid="register-login-link">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
