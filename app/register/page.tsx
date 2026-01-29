"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [countryCode] = useState("+65");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedName = displayName.trim();
    const digits = normalizePhoneDigits(phoneDigits);
    const phone_e164 = digits.length ? `+${countryCode.replace(/\D/g, "")}${digits}` : "";

    if (!trimmedName) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }
    if (digits.length < 8) {
      setError("Please enter a valid phone number (at least 8 digits).");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          display_name: trimmedName,
          phone_e164: phone_e164 || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Registration failed. Use your invite link and try again.");
        setLoading(false);
        return;
      }
      router.replace((data.redirect as string) || "/events");
      if (typeof window !== "undefined") {
        window.location.href = (data.redirect as string) || "/events";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Complete your profile"
        subtitle="Enter your name and phone to join the event"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Name"
            type="text"
            id="display_name"
            name="display_name"
            data-testid="register-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Input
                label="Country"
                type="text"
                id="countryCode"
                name="countryCode"
                value={countryCode}
                disabled
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Phone"
                type="tel"
                id="phone"
                name="phone"
                data-testid="register-phone"
                value={phoneDigits}
                onChange={(e) => {
                  setPhoneDigits(normalizePhoneDigits(e.target.value));
                  setError(null);
                }}
                inputMode="numeric"
                placeholder="81234567"
                required
                helperText="Singapore numbers: 8 digits"
              />
            </div>
          </div>

          {error && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--bg-muted)", color: "var(--text)" }}
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
            {loading ? "Creating account…" : "Join event"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        No invite? Use the QR or link from your event to register.
      </p>
    </div>
  );
}
