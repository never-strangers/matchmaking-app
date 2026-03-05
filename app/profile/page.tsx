"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  validateDob21Plus,
  parseDateOfBirth,
  getDobDateInputBounds,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";
import {
  CITIES,
  ATTRACTED_TO_OPTIONS,
  LOOKING_FOR_OPTIONS,
  normalizeCityForSelect,
} from "@/lib/constants/profileOptions";
import { Button } from "@/components/ui/Button";

const LABEL_WHY =
  "Let's know more about you. Tell us why Never Strangers is for you!";
const LABEL_INSTAGRAM =
  "Vibe Check! What's Your Instagram? (With a clear picture of yourself in your display picture!)";

const MIN_PASSWORD_LENGTH = 6;

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
  const [emailInput, setEmailInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const user = data.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const email = user.email ?? null;
      setUserEmail(email);
      setEmailInput(email ?? "");
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

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    const cur = currentPassword.trim();
    const newP = newPassword.trim();
    const conf = confirmPassword.trim();
    if (newP.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newP !== conf) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (!userEmail) {
      setPasswordError("Email is required to change password.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: cur,
      });
      if (signInError) {
        setPasswordError(signInError.message || "Current password is incorrect.");
        setPasswordSubmitting(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newP });
      if (updateError) {
        setPasswordError(updateError.message || "Failed to update password.");
        setPasswordSubmitting(false);
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    }
    setPasswordSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newEmail = (formData.get("email") as string)?.trim() || null;
    if (newEmail && newEmail !== userEmail) {
      const supabase = createClient();
      const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
      if (emailError) {
        setError(emailError.message || "Failed to update email.");
        return;
      }
      setUserEmail(newEmail);
      setEmailInput(newEmail);
    }
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
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px 80px" }}>
      {success && (
        <div
          role="alert"
          style={{
            marginBottom: 24,
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(45,106,79,0.3)",
            backgroundColor: "var(--success-light)",
            padding: "12px 16px",
            fontSize: 14,
            color: "var(--success)",
          }}
          data-testid="profile-save-success"
        >
          Profile saved.
        </div>
      )}

      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(28px, 5vw, 36px)",
          color: "var(--text)",
          letterSpacing: "-0.025em",
          marginBottom: 6,
        }}
      >
        Your profile
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>
        Update your details. You must be 21+ to use Never Strangers.
      </p>

      <div
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label htmlFor="first_name" style={labelStyle}>First Name</label>
            <StyledInput
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              value={profile?.first_name ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, first_name: e.target.value || null } : { ...defaultProfile(), first_name: e.target.value || null }))
              }
              placeholder="First name"
              data-testid="profile-first-name"
            />
          </div>
          <div>
            <label htmlFor="last_name" style={labelStyle}>Last Name</label>
            <StyledInput
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              value={profile?.last_name ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, last_name: e.target.value || null } : { ...defaultProfile(), last_name: e.target.value || null }))
              }
              placeholder="Last name"
              data-testid="profile-last-name"
            />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <StyledInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              data-testid="profile-email"
            />
            <p style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
              Changing your email may require you to verify the new address.
            </p>
          </div>
          <div>
            <label htmlFor="city" style={labelStyle}>Which city are you in?</label>
            <StyledSelect
              id="city"
              name="city"
              value={normalizeCityForSelect(profile?.city ?? null)}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, city: e.target.value || null } : { ...defaultProfile(), city: e.target.value || null }))
              }
              data-testid="profile-city"
            >
              <option value="">Choose a City</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <label htmlFor="dob" style={labelStyle}>Date of birth</label>
            <StyledInput
              id="dob"
              name="dob"
              type="date"
              autoComplete="bday"
              required
              {...getDobDateInputBounds()}
              value={profile?.dob ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setProfile((p) => (p ? { ...p, dob: v || null } : { ...defaultProfile(), dob: v || null }));
              }}
              data-testid="profile-dob"
            />
            <p style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
              You must be 21+ to join Never Strangers.
            </p>
          </div>

          <div>
            <label htmlFor="gender" style={labelStyle}>Gender</label>
            <StyledSelect
              id="gender"
              name="gender"
              value={profile?.gender ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, gender: e.target.value } : { ...defaultProfile(), gender: e.target.value }))
              }
              data-testid="profile-gender"
            >
              <option value="">Select</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </StyledSelect>
          </div>

          <div>
            <span style={labelStyle}>Which gender are you attracted to?</span>
            <div className="flex flex-wrap gap-4 mt-2" role="group">
              {ATTRACTED_TO_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile?.attracted_to?.includes(o.value) ?? false}
                    onChange={() => toggleAttractedTo(o.value)}
                    style={{ accentColor: "var(--primary)" }}
                    data-testid={`profile-attracted-to-${o.value}`}
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
                    checked={profile?.looking_for?.includes(o.value) ?? false}
                    onChange={() => toggleLookingFor(o.value)}
                    style={{ accentColor: "var(--primary)" }}
                    data-testid={`profile-looking-for-${o.value}`}
                  />
                  <span style={{ fontSize: 14, color: "var(--text)" }}>{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="preferred_language" style={labelStyle}>
              Preferred language for event & communications
            </label>
            <StyledSelect
              id="preferred_language"
              name="preferred_language"
              value={profile?.preferred_language ?? ""}
              onChange={(e) =>
                setProfile((p) =>
                  p ? { ...p, preferred_language: e.target.value } : { ...defaultProfile(), preferred_language: e.target.value }
                )
              }
              data-testid="profile-preferred-language"
            >
              <option value="">Select</option>
              {PREFERRED_LANGUAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </StyledSelect>
          </div>

          <div>
            <label htmlFor="instagram" style={labelStyle}>{LABEL_INSTAGRAM}</label>
            <StyledInput
              id="instagram"
              name="instagram"
              type="text"
              value={profile?.instagram ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, instagram: e.target.value } : { ...defaultProfile(), instagram: e.target.value }))
              }
              placeholder="Your Instagram handle"
              data-testid="profile-instagram"
            />
          </div>

          <div>
            <label htmlFor="reason" style={labelStyle}>{LABEL_WHY}</label>
            <StyledTextarea
              id="reason"
              name="reason"
              value={profile?.reason ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, reason: e.target.value } : { ...defaultProfile(), reason: e.target.value }))
              }
              rows={3}
              placeholder="Tell us why you want to join"
              data-testid="profile-reason"
            />
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 14, color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            fullWidth
            size="lg"
            data-testid="profile-save"
          >
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <section
          style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--border)" }}
          data-testid="profile-security-section"
        >
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 20,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Change password
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
            Enter your current password, then choose a new password.
          </p>
          {passwordSuccess && (
            <p style={{ fontSize: 14, color: "var(--success)", marginBottom: 12 }} data-testid="profile-password-success">
              Password updated successfully.
            </p>
          )}
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="current_password" style={labelStyle}>Current password</label>
              <StyledInput
                id="current_password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="profile-current-password"
              />
            </div>
            <div>
              <label htmlFor="new_password" style={labelStyle}>New password</label>
              <StyledInput
                id="new_password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                data-testid="profile-new-password"
              />
              <p style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>
            <div>
              <label htmlFor="confirm_password" style={labelStyle}>Confirm new password</label>
              <StyledInput
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                data-testid="profile-confirm-password"
              />
            </div>
            {passwordError && (
              <p role="alert" style={{ fontSize: 14, color: "var(--danger)" }}>
                {passwordError}
              </p>
            )}
            <div>
              <Button
                type="submit"
                variant="secondary"
                disabled={passwordSubmitting}
                data-testid="profile-change-password-btn"
              >
                {passwordSubmitting ? "Updating…" : "Change password"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
