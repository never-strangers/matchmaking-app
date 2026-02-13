"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CITIES,
  GENDERS,
  ATTRACTED_TO_OPTIONS,
  LOOKING_FOR_OPTIONS,
  MIN_AGE,
} from "@/lib/constants/profileOptions";

/** Set to true or use NEXT_PUBLIC_PREFILL_REGISTER_FORM=true to prefill form with random valid values. */
const PREFILL_REGISTER_FORM =
  process.env.NEXT_PUBLIC_PREFILL_REGISTER_FORM === "true";

function getRandomPrefillValues() {
  const rnd = (arr: readonly { value: string }[]) =>
    arr[Math.floor(Math.random() * arr.length)].value;
  const suffix = Math.random().toString(36).slice(2, 10);
  const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey"];
  const lastNames = ["Lee", "Chen", "Kim", "Nguyen", "Wong", "Tan"];
  const year = new Date().getFullYear() - (MIN_AGE + Math.floor(Math.random() * 20));
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return {
    email: `test_${suffix}@example.com`,
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    password: `Pass${suffix}1!`,
    phoneRaw: `9${String(Math.floor(1000000 + Math.random() * 8999999))}`,
    city: rnd(CITIES),
    birthDate: `${year}-${month}-${day}`,
    gender: rnd(GENDERS),
    attractedTo: [rnd(ATTRACTED_TO_OPTIONS)],
    lookingFor: [rnd(LOOKING_FOR_OPTIONS)],
    reason: "Looking to meet new people and expand my social circle.",
    instagram: `@user_${suffix}`,
    termsAccepted: true,
    privacyAccepted: true,
  };
}

const selectClass =
  "w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200";

/** Normalize raw input to E.164. */
function normalizeToE164(raw: string, defaultCountryCode: string): string {
  const trimmed = String(raw).trim().replace(/[\s\-\.]/g, "");
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  const countryDigits = defaultCountryCode.replace(/\D/g, "");

  if (digits.length === 0) return "";
  if (hasPlus) return `+${digits}`;
  const localDigits = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+${countryDigits}${localDigits}`;
}

function isValidPhoneE164(e164: string): boolean {
  const digits = e164.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isAtLeast18(dob: string | null): boolean {
  if (!dob || !dob.trim()) return true;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= MIN_AGE;
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB for registration
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [countryCode] = useState("+65");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [attractedTo, setAttractedTo] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [instagram, setInstagram] = useState("");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!PREFILL_REGISTER_FORM) return;
    const prefill = getRandomPrefillValues();
    setEmail(prefill.email);
    setFirstName(prefill.firstName);
    setLastName(prefill.lastName);
    setPassword(prefill.password);
    setPhoneRaw(prefill.phoneRaw);
    setCity(prefill.city);
    setBirthDate(prefill.birthDate);
    setGender(prefill.gender);
    setAttractedTo(prefill.attractedTo);
    setLookingFor(prefill.lookingFor);
    setReason(prefill.reason);
    setInstagram(prefill.instagram);
    setTermsAccepted(prefill.termsAccepted);
    setPrivacyAccepted(prefill.privacyAccepted);
  }, []);

  const handleAttractedToChange = (value: string) => {
    setAttractedTo((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleLookingForChange = (value: string) => {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      setError("Profile photo must be under 2MB.");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Use JPG, PNG, or WebP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProfilePhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneError(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();
    const phone_e164 = normalizeToE164(phoneRaw, countryCode);

    if (!trimmedEmail) {
      setError("Email is required.");
      setLoading(false);
      return;
    }
    if (!fullName) {
      setError("First and last name are required.");
      setLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    if (!city) {
      setError("City is required.");
      setLoading(false);
      return;
    }
    if (!birthDate) {
      setError("Birth date is required.");
      setLoading(false);
      return;
    }
    if (!isAtLeast18(birthDate)) {
      setError(`You must be at least ${MIN_AGE} years old.`);
      setLoading(false);
      return;
    }
    if (!gender) {
      setError("Gender is required.");
      setLoading(false);
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setError("Please accept the Terms and Privacy Policy.");
      setLoading(false);
      return;
    }

    try {
      // Check if user has invite (invite flow requires phone)
      const contextRes = await fetch("/api/auth/register/context", {
        credentials: "include",
      });
      const context = (await contextRes.json().catch(() => ({}))) as {
        hasInvite?: boolean;
      };
      const hasInvite = !!context.hasInvite;

      if (hasInvite) {
        // Invite flow: phone required
        if (!phone_e164) {
          setPhoneError("Phone is required for invite registration.");
          setLoading(false);
          return;
        }
        if (!isValidPhoneE164(phone_e164)) {
          setPhoneError("Enter a valid phone number (8–15 digits, e.g. +65 9123 4567).");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            display_name: fullName,
            phone_e164,
            email: trimmedEmail,
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            password,
            city,
            dob: birthDate,
            gender,
            attracted_to: attractedTo.join(",") || undefined,
            looking_for: lookingFor.join(",") || undefined,
            reason: reason.trim() || undefined,
            instagram: instagram.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          router.replace((data.redirect as string) || "/pending");
          if (typeof window !== "undefined") {
            window.location.href = (data.redirect as string) || "/pending";
          }
          return;
        }
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // No invite: Supabase email+password signup (phone optional)
      const supabase = createClient();
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              display_name: fullName,
              full_name: fullName,
              city,
              dob: birthDate,
              gender,
              attracted_to: attractedTo.join(",") || null,
              reason: reason.trim() || null,
              instagram: instagram.trim() || null,
              phone_e164: phone_e164 || null,
            },
          },
        });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          setError("This email is already registered. Use Login instead.");
        } else {
          setError(signUpError.message || "Sign up failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Email confirmation required: redirect to pending screen
      if (signUpData.user && !signUpData.session) {
        router.replace("/pending?registered=1");
        if (typeof window !== "undefined") {
          window.location.href = "/pending?registered=1";
        }
        return;
      }

      // Session created: complete profile and redirect to pending
      const completeRes = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          display_name: fullName,
          full_name: fullName,
          email: trimmedEmail,
          phone_e164: phone_e164 || undefined,
          city,
          dob: birthDate,
          gender,
          attracted_to: attractedTo.join(",") || undefined,
          reason: reason.trim() || undefined,
          instagram: instagram.trim() || undefined,
        }),
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json().catch(() => ({}));
        setError(errData.error || "Profile setup failed. Please try again.");
        setLoading(false);
        return;
      }

      router.replace("/pending");
      if (typeof window !== "undefined") {
        window.location.href = "/pending";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Create your account"
        subtitle="All attendees are vetted to ensure everyone is here for the right reasons."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Account</h3>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="register-email"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                data-testid="register-first-name"
              />
              <Input
                label="Last name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                data-testid="register-last-name"
              />
            </div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              data-testid="register-password"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Country
                </label>
                <div
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)]"
                  style={{ minHeight: "2.75rem" }}
                >
                  <span className="text-xl shrink-0 select-none" aria-hidden>
                    🇸🇬
                  </span>
                  <input
                    type="text"
                    value={countryCode}
                    disabled
                    className="flex-1 min-w-0 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-[var(--text)] disabled:cursor-default"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Phone"
                  type="tel"
                  value={phoneRaw}
                  onChange={(e) => {
                    setPhoneRaw(e.target.value);
                    setPhoneError(null);
                    setError(null);
                  }}
                  placeholder="+65 9123 4567 or 91234567"
                  error={phoneError ?? undefined}
                  helperText="Optional. Used for event/match communication (WhatsApp/Telegram)."
                  data-testid="register-phone"
                />
              </div>
            </div>
          </div>

          {/* Personal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Personal</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={selectClass}
                required
                data-testid="register-city"
              >
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Birth date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              helperText={`Must be at least ${MIN_AGE} years old`}
              data-testid="register-birth-date"
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={selectClass}
                required
                data-testid="register-gender"
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Preferences</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Attracted to
              </label>
              <div className="flex flex-wrap gap-2">
                {ATTRACTED_TO_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                    style={{
                      borderColor: attractedTo.includes(o.value)
                        ? "var(--primary)"
                        : "var(--border)",
                      backgroundColor: attractedTo.includes(o.value)
                        ? "var(--primary)/10"
                        : "var(--bg-panel)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={attractedTo.includes(o.value)}
                      onChange={() => handleAttractedToChange(o.value)}
                      className="sr-only"
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Looking for
              </label>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                    style={{
                      borderColor: lookingFor.includes(o.value)
                        ? "var(--primary)"
                        : "var(--border)",
                      backgroundColor: lookingFor.includes(o.value)
                        ? "var(--primary)/10"
                        : "var(--bg-panel)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(o.value)}
                      onChange={() => handleLookingForChange(o.value)}
                      className="sr-only"
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">About</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Why Never Strangers?
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why did you join Never Strangers?"
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200"
                data-testid="register-reason"
              />
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">Max 500 characters</p>
            </div>
            <Input
              label="Instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@handle"
              helperText="Optional"
              data-testid="register-instagram"
            />
          </div>

          {/* Profile photo */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Profile photo</h3>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {profilePhotoDataUrl && (
                <img
                  src={profilePhotoDataUrl}
                  alt="Preview"
                  className="w-24 h-24 rounded-xl object-cover border"
                  style={{ borderColor: "var(--border)" }}
                />
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                  data-testid="register-avatar-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="register-avatar-upload"
                >
                  {profilePhotoDataUrl ? "Change photo" : "Upload"}
                </Button>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                  JPG, PNG or WebP. Max 2MB. Optional.
                </p>
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 rounded border-[var(--border)]"
                data-testid="register-terms"
              />
              <span className="text-sm text-[var(--text)]">
                I accept the{" "}
                <Link href="/terms" className="underline" target="_blank">
                  Terms of Service
                </Link>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-1 rounded border-[var(--border)]"
                data-testid="register-privacy"
              />
              <span className="text-sm text-[var(--text)]">
                I accept the{" "}
                <Link href="/privacy" className="underline" target="_blank">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {error && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--bg-muted)", color: "var(--danger)" }}
              data-testid="register-error"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            data-testid="register-submit"
            fullWidth
            size="lg"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Register"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Login
        </Link>
      </p>
    </div>
  );
}
