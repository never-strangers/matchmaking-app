"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  validateDob21Plus,
  parseDateOfBirth,
  getDobDateInputBounds,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";
import {
  ATTRACTED_TO_OPTIONS,
  LOOKING_FOR_OPTIONS,
} from "@/lib/constants/profileOptions";
import { useCityConfig } from "@/lib/cities/useCityConfig";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getPostLoginRedirect } from "@/lib/auth/getPostLoginRedirect";

const LABEL_WHY =
  "Let's know more about you. Tell us why Never Strangers is for you!";
const LABEL_INSTAGRAM =
  "Vibe Check! What's Your Instagram? (With a clear picture of yourself in your display picture!)";
const AGREEMENT_MARKETING =
  "By submitting this form, I agree to be contacted for event updates and marketing.";
const AGREEMENT_ACCURATE =
  "I confirm that the details I have provided are accurate and truthful. I understand that I may be required to present a valid photo ID at the event for verification purposes, and entry may be denied if the information does not match.";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  backgroundColor: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 6,
  fontFamily: "var(--font-sans)",
};

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,15,20,0.1)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,15,20,0.1)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: "vertical" }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,15,20,0.1)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();

  // Redirect already-authenticated users away from the registration page
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: { user: unknown } | null } }) => {
      if (!session) return;
      const res = await fetch("/api/profile", { credentials: "include" });
      const profile = res.ok ? await res.json().catch(() => null) : null;
      router.replace(getPostLoginRedirect(profile?.status));
    });
  }, [router]);
  const cityConfig = useCityConfig();
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
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [reason, setReason] = useState("");
  const [agreementMarketing, setAgreementMarketing] = useState(false);
  const [agreementAccurate, setAgreementAccurate] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
    if (!reason?.trim()) {
      setError("Please tell us why Never Strangers is for you.");
      return;
    }
    if (!photoFile) {
      setError("Please upload a profile photo. It is required for identity verification.");
      return;
    }
    if (!agreementAccurate) {
      setError("You must confirm that your details are accurate and that you may be required to present ID at the event.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("email", email.trim());
      fd.append("password", password);
      fd.append("first_name", firstName.trim());
      fd.append("last_name", lastName.trim());
      fd.append("city", city.trim());
      fd.append("dob", normalizedDob || "");
      fd.append("gender", gender || "");
      fd.append("attracted_to", JSON.stringify(attractedTo));
      fd.append("looking_for", JSON.stringify(lookingFor));
      fd.append("preferred_language", preferred_language || "");
      fd.append("phone_e164", phone.trim());
      fd.append("instagram", instagram.trim());
      fd.append("reason", reason.trim());
      fd.append("agreement_marketing", String(agreementMarketing));
      fd.append("agreement_accurate", String(agreementAccurate));
      if (photoFile) fd.append("photo", photoFile);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: fd,
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
    <div style={{ display: "flex", minHeight: "100svh", backgroundColor: "var(--bg)" }} className="register-layout">
      {/* Left sticky panel */}
      <div style={{
        width: "40%",
        minHeight: "100svh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100svh",
        display: "flex",
        flexDirection: "column",
        padding: "32px 40px",
        borderRight: "1px solid var(--border)",
      }} className="register-left">
        <Image src="/logo.png" alt="Never Strangers" width={130} height={44} style={{ objectFit: "contain", objectPosition: "left" }} priority />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }} className="register-hero">
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(44px, 5.5vw, 68px)",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            marginBottom: 0,
          }}>
            You won&apos;t be
          </h1>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(44px, 5.5vw, 68px)",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            marginBottom: 0,
          }}>
            strangers
          </h1>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(44px, 5.5vw, 68px)",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "var(--primary)",
            fontStyle: "italic",
            marginBottom: 28,
          }}>
            for long.
          </h1>
          <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.65, maxWidth: 340 }}>
            Just be open about who you are and what you&apos;re here for. We review every application ourselves.
          </p>
        </div>
      </div>

      {/* Right: scrollable form */}
      <div style={{ flex: 1, padding: "48px 48px 80px", overflowY: "auto" }} className="register-right">
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 28 }}>
            Create your account. You must be 21+ to join.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label htmlFor="email" style={labelStyle}>E-mail Address</label>
              <StyledInput
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="register-email"
              />
            </div>

            <div>
              <label htmlFor="first_name" style={labelStyle}>First Name</label>
              <StyledInput
                id="first_name"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                data-testid="register-first-name"
              />
            </div>

            <div>
              <label htmlFor="last_name" style={labelStyle}>Last Name</label>
              <StyledInput
                id="last_name"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                data-testid="register-last-name"
              />
            </div>

            <div>
              <label htmlFor="phone" style={labelStyle}>Phone Number</label>
              <StyledInput
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+65 9123 4567"
                data-testid="register-phone"
              />
              <p style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
                Used for event & match communication. Optional.
              </p>
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>Create Password</label>
              <StyledInput
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                data-testid="register-password"
              />
            </div>

            <div>
              <label htmlFor="city" style={labelStyle}>Which city are you in?</label>
              <StyledSelect
                id="city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                }}
                data-testid="register-city"
              >
                <option value="">Choose a City</option>
                <optgroup label="Live now">
                  {cityConfig.live.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Coming soon">
                  {cityConfig.comingSoon.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              </StyledSelect>
              {city && cityConfig.comingSoon.some((c) => c.value === city) && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  We&apos;re not live there yet — we&apos;ll notify you when we launch.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="dob" style={labelStyle}>Birth Date</label>
              <StyledInput
                id="dob"
                name="dob"
                type="date"
                required
                autoComplete="bday"
                {...getDobDateInputBounds()}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                data-testid="register-dob"
              />
              <p style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
                You must be 21+ to join Never Strangers.
              </p>
            </div>

            <div>
              <span style={labelStyle}>Gender</span>
              <div className="flex flex-wrap gap-4 mt-2" role="group" aria-label="Gender">
                {GENDER_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={o.value}
                      checked={gender === o.value}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ accentColor: "var(--primary)" }}
                      data-testid={`register-gender-${o.value}`}
                    />
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span style={labelStyle}>Which gender are you attracted to?</span>
              <div className="flex flex-wrap gap-4 mt-2" role="group">
                {ATTRACTED_TO_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attractedTo.includes(o.value)}
                      onChange={() => toggleAttractedTo(o.value)}
                      style={{ accentColor: "var(--primary)" }}
                      data-testid={`register-attracted-to-${o.value}`}
                    />
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span style={labelStyle}>What are you looking for?</span>
              <div className="flex flex-wrap gap-4 mt-2" role="group">
                {LOOKING_FOR_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(o.value)}
                      onChange={() => toggleLookingFor(o.value)}
                      style={{ accentColor: "var(--primary)" }}
                      data-testid={`register-looking-for-${o.value}`}
                    />
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="reason" style={labelStyle}>{LABEL_WHY}</label>
              <StyledTextarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Tell us why you want to join"
                data-testid="register-reason"
              />
            </div>

            <div>
              <label htmlFor="instagram" style={labelStyle}>{LABEL_INSTAGRAM}</label>
              <StyledInput
                id="instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Username"
                data-testid="register-instagram"
              />
            </div>

            <div>
              <label style={labelStyle}>Upload your Profile Photo <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[var(--primary)] file:text-white file:font-medium"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                data-testid="register-photo"
              />
              <p style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>Required for identity verification</p>
            </div>

            <div>
              <label htmlFor="preferred_language" style={labelStyle}>
                Preferred language for event & communications
              </label>
              <StyledSelect
                id="preferred_language"
                value={preferred_language || "en"}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                data-testid="register-preferred-language"
              >
                <option value="en">English (Default)</option>
                {PREFERRED_LANGUAGE_OPTIONS.filter((o) => o.value !== "en").map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </StyledSelect>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementMarketing}
                  onChange={(e) => setAgreementMarketing(e.target.checked)}
                  style={{ marginTop: 3, accentColor: "var(--primary)" }}
                  data-testid="register-agreement-marketing"
                />
                <span style={{ fontSize: 14, color: "var(--text)" }}>{AGREEMENT_MARKETING}</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccurate}
                  onChange={(e) => setAgreementAccurate(e.target.checked)}
                  style={{ marginTop: 3, accentColor: "var(--primary)" }}
                  data-testid="register-agreement-accurate"
                />
                <span style={{ fontSize: 14, color: "var(--text)" }}>{AGREEMENT_ACCURATE}</span>
              </label>
            </div>

            {error && (
              <p role="alert" data-testid="register-error" style={{ fontSize: 14, color: "var(--danger)" }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              fullWidth
              size="lg"
              data-testid="register-submit"
            >
              {submitting ? "Creating account…" : "Register"}
            </Button>
          </form>

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 24, textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary)" }} className="hover:underline" data-testid="register-login-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
