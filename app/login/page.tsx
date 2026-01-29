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

export default function LoginPage() {
  const router = useRouter();
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [countryCode] = useState("+65");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const digits = normalizePhoneDigits(phoneDigits);
    const phone_e164 = digits.length ? `+${countryCode.replace(/\D/g, "")}${digits}` : "";

    if (digits.length < 8) {
      setError("Enter a valid phone number (at least 8 digits).");
      setLoading(false);
      return;
    }
    if (!otp.trim()) {
      setError("Enter the OTP.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone_e164, otp: otp.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      const redirectTo = (data.redirect as string) || "/events";
      router.replace(redirectTo);
      if (typeof window !== "undefined") {
        window.location.href = redirectTo;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Login"
        subtitle="Enter your phone and OTP"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  id="countryCode"
                  name="countryCode"
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
                id="phone"
                name="phone"
                data-testid="login-phone"
                value={phoneDigits}
                onChange={(e) => {
                  setPhoneDigits(normalizePhoneDigits(e.target.value));
                  setError(null);
                }}
                inputMode="numeric"
                placeholder="81234567"
                required
                helperText="Must already be registered (use event link first)"
              />
            </div>
          </div>

          <Input
            label="OTP"
            type="text"
            id="otp"
            name="otp"
            data-testid="login-otp"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.slice(0, 6));
              setError(null);
            }}
            inputMode="numeric"
            placeholder="Enter OTP"
            required
            helperText="Demo OTP: 6969"
          />

          {error && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--bg-muted)", color: "var(--text)" }}
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            data-testid="login-submit"
            fullWidth
            size="lg"
            disabled={loading}
          >
            {loading ? "Logging in…" : "Login"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        New? Use the event QR or link to <a href="/register" className="hover:underline">Register</a>.
      </p>
    </div>
  );
}
