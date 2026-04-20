"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AvatarSquare } from "@/components/ui/AvatarSquare";
import {
  GENDERS,
  ATTRACTED_TO_OPTIONS,
  MIN_AGE,
  normalizeCityForSelect,
  normalizeGenderForSelect,
  normalizeAttractedToForSelect,
} from "@/lib/constants/profileOptions";
import { useCityConfig } from "@/lib/cities/useCityConfig";
import type { Profile, ProfileUpdateInput } from "@/types/profile";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const SECTION_LABEL =
  "text-sm font-semibold text-[var(--text)] mb-3 block";

const selectClass =
  "w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200";

function isAtLeast18(dob: string | null): boolean {
  if (!dob || !dob.trim()) return true;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= MIN_AGE;
}

const RESET_COOLDOWN_SECONDS = 30;

export function ProfileForm({
  initialProfile,
  showResetSuccess = false,
}: {
  initialProfile: Profile;
  showResetSuccess?: boolean;
}) {
  const cityConfig = useCityConfig();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");
  const [resetCooldown, setResetCooldown] = useState(0);
  const resetCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showResetSuccessToast, setShowResetSuccessToast] = useState(showResetSuccess);

  useEffect(() => {
    if (showResetSuccess) {
      setShowResetSuccessToast(true);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
      const t = setTimeout(() => setShowResetSuccessToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showResetSuccess]);

  useEffect(() => {
    return () => {
      if (resetCooldownRef.current) clearInterval(resetCooldownRef.current);
    };
  }, []);

  const handleChange = (field: keyof ProfileUpdateInput, value: string | null) => {
    setProfile((p) => ({ ...p, [field]: value ?? "" }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (profile.dob && !isAtLeast18(profile.dob)) {
      setMessage({ type: "error", text: `You must be at least ${MIN_AGE} years old.` });
      setLoading(false);
      return;
    }

    const payload: ProfileUpdateInput = {
      username: profile.username || undefined,
      full_name: profile.full_name || undefined,
      phone_e164: profile.phone_e164 || undefined,
      instagram: profile.instagram || undefined,
      city: profile.city || undefined,
      dob: profile.dob || undefined,
      gender: profile.gender || undefined,
      attracted_to: profile.attracted_to || undefined,
      reason: profile.reason || undefined,
    };

    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save" });
        setLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Profile saved successfully." });
      if (data.profile) {
      setProfile((p) => ({
        ...p,
        ...data.profile,
        full_name: data.profile.full_name ?? p.full_name,
        phone_e164: data.profile.phone_e164 ?? p.phone_e164,
        dob: data.profile.dob ? String(data.profile.dob).slice(0, 10) : p.dob,
        avatar_path: data.profile.avatar_path ?? p.avatar_path,
        avatar_updated_at: data.profile.avatar_updated_at ?? p.avatar_updated_at,
      }));
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      setMessage({ type: "error", text: "File too large. Max 5MB." });
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Use JPG, PNG, or WebP." });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Upload failed" });
        return;
      }
      setProfile((p) => ({
        ...p,
        avatar_path: data.avatar_path ?? p.avatar_path,
        avatar_updated_at: data.avatar_updated_at ?? p.avatar_updated_at,
      }));
      setMessage({ type: "success", text: "Profile photo updated." });
      window.dispatchEvent(new CustomEvent("profile-avatar-updated"));
    } catch {
      setMessage({ type: "error", text: "Upload failed. Try again." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showResetSuccessToast && (
        <div
          role="status"
          className="rounded-xl px-4 py-3 text-sm bg-[var(--success)]/20 text-[var(--success)] flex items-center gap-3"
          data-testid="reset-success-toast"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-medium">Password updated successfully.</p>
        </div>
      )}

      {/* Profile Photo */}
      <Card padding="md">
        <span className={SECTION_LABEL}>Profile Photo</span>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <AvatarSquare
            avatarPath={profile.avatar_path}
            cacheBust={profile.avatar_updated_at ?? profile.updated_at}
            size={120}
            alt="Your profile photo"
          />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
              data-testid="profile-avatar-input"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="profile-avatar-upload"
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              JPG, PNG or WebP. Max 5MB.
            </p>
          </div>
        </div>
      </Card>

      {/* Account */}
      <Card padding="md">
        <span className={SECTION_LABEL}>Account</span>
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={profile.email ?? ""}
            onChange={(e) => handleChange("email", e.target.value || null)}
            disabled
            helperText="Read-only (from registration)"
          />
          <Input
            label="Phone"
            type="tel"
            value={profile.phone_e164 ?? ""}
            onChange={(e) => handleChange("phone_e164", e.target.value || null)}
            placeholder="+65 9123 4567"
            helperText="Used for event/match communication (WhatsApp/Telegram)."
            data-testid="profile-phone"
          />
          <Input
            label="Username"
            type="text"
            value={profile.username ?? ""}
            onChange={(e) => handleChange("username", e.target.value || null)}
            placeholder="username"
            maxLength={50}
            data-testid="profile-username"
          />
        </div>
      </Card>

      {/* Security */}
      <Card padding="md" data-testid="profile-security-section">
        <span className={SECTION_LABEL}>Security</span>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Manage your account security.
        </p>
        <div className="border rounded-xl border-[var(--border)] p-4 bg-[var(--bg-panel)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Password</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                We&apos;ll send a reset link to your account email.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (resetState !== "idle" || resetCooldown > 0) return;
                setResetState("sending");
                try {
                  const { createClient } = await import("@/lib/supabase/client");
                  const supabase = createClient();
                  const { data: { user } } = await supabase.auth.getUser();
                  const email = user?.email ?? profile.email?.trim();
                  if (!email) {
                    setResetState("idle");
                    return;
                  }
                  const siteUrl =
                    typeof window !== "undefined"
                      ? window.location.origin
                      : (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "");
                  const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/reset-password`;
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
                  if (error) {
                    setResetState("idle");
                    return;
                  }
                  setResetState("sent");
                  setResetCooldown(RESET_COOLDOWN_SECONDS);
                  resetCooldownRef.current = setInterval(() => {
                    setResetCooldown((prev) => {
                      if (prev <= 1) {
                        if (resetCooldownRef.current) clearInterval(resetCooldownRef.current);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                } catch {
                  setResetState("idle");
                }
              }}
              disabled={resetState === "sending" || resetCooldown > 0}
              data-testid="profile-reset-password-btn"
            >
              {resetState === "sending"
                ? "Sending…"
                : resetCooldown > 0
                ? `Resend in ${resetCooldown}s`
                : "Reset password"}
            </Button>
          </div>
          {resetState === "sent" && (
            <p className="mt-3 text-sm text-[var(--text-muted)]" data-testid="profile-reset-sent-msg">
              If an account exists for this email, you&apos;ll receive a reset link shortly. Check your inbox and spam folder.
            </p>
          )}
        </div>
      </Card>

      {/* Personal */}
      <Card padding="md">
        <span className={SECTION_LABEL}>Personal</span>
        <div className="space-y-4">
          <Input
            label="Full name"
            type="text"
            value={profile.full_name ?? ""}
            onChange={(e) => handleChange("full_name", e.target.value || null)}
            placeholder="Your name"
            maxLength={100}
            data-testid="profile-full-name"
          />
          <Input
            label="Date of birth"
            type="date"
            value={profile.dob ?? ""}
            onChange={(e) => handleChange("dob", e.target.value || null)}
            helperText={`Must be at least ${MIN_AGE} years old`}
            data-testid="profile-dob"
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              City
            </label>
            <select
              value={normalizeCityForSelect(profile.city ?? "")}
              onChange={(e) => handleChange("city", e.target.value || null)}
              className={selectClass}
              data-testid="profile-city"
            >
              <option value="">Select city</option>
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
            </select>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card padding="md">
        <span className={SECTION_LABEL}>Preferences</span>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Gender
            </label>
            <select
              value={normalizeGenderForSelect(profile.gender ?? "")}
              onChange={(e) => handleChange("gender", e.target.value || null)}
              className={selectClass}
              data-testid="profile-gender"
            >
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Attracted to
            </label>
            <select
              value={normalizeAttractedToForSelect(profile.attracted_to ?? "")}
              onChange={(e) => handleChange("attracted_to", e.target.value || null)}
              className={selectClass}
              data-testid="profile-attracted-to"
            >
              <option value="">Select</option>
              {ATTRACTED_TO_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Social */}
      <Card padding="md">
        <span className={SECTION_LABEL}>Social</span>
        <Input
          label="Instagram"
          type="text"
          value={profile.instagram ?? ""}
          onChange={(e) => handleChange("instagram", e.target.value || null)}
          placeholder="@handle or instagram.com/handle"
          maxLength={100}
          helperText="Handle or URL"
          data-testid="profile-instagram"
        />
      </Card>

      {/* About */}
      <Card padding="md">
        <span className={SECTION_LABEL}>About</span>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Reason for joining
          </label>
          <textarea
            value={profile.reason ?? ""}
            onChange={(e) => handleChange("reason", e.target.value || null)}
            placeholder="Why did you join Never Strangers?"
            maxLength={500}
            rows={3}
            className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200"
            data-testid="profile-reason"
          />
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Max 500 characters
          </p>
        </div>
      </Card>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-[var(--success)]/20 text-[var(--success)]"
              : "bg-[var(--danger)]/20 text-[var(--danger)]"
          }`}
          data-testid={message.type === "success" ? "profile-success" : "profile-error"}
        >
          {message.text}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={loading}
        data-testid="profile-save"
      >
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
