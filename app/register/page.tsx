"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAdminPhone, setSession, ADMIN_PHONES_RAW } from "@/lib/demo/authStore";
import { upsertUser } from "@/lib/demo/userStore";
import type { Role } from "@/types/roles";

function normalizeSgPhoneDigits(phoneDigits: string): string {
  return phoneDigits.replace(/\D/g, "").slice(0, 8);
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const normalizedDigits = normalizeSgPhoneDigits(phoneDigits);
    const fullPhone = `+65${normalizedDigits}`;

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (normalizedDigits.length !== 8) {
      setError("Please enter an 8-digit Singapore phone number.");
      return;
    }

    const userId = `usr_65${normalizedDigits}`;
    
    // Admin is determined by allowlisted phone numbers (default: +6511111111)
    const role: Role = isAdminPhone(fullPhone) ? "admin" : "user";
    
    upsertUser({
      id: userId,
      name: trimmedName,
      phone: fullPhone,
      city: "Singapore",
      role,
    });

    setSession({
      userId,
      phone: fullPhone,
      name: trimmedName,
      role,
    });

    setSuccess("Signed in. Redirecting to events...");
    // Use full page reload so global layout/NavBar re-mounts
    // and picks up the new demo session deterministically.
    if (typeof window !== "undefined") {
      window.location.href = "/events";
    } else {
      router.replace("/events");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Login"
        subtitle="Internal demo phone login (no OTP for now)"
      />
      
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Name"
            type="text"
            id="name"
            name="name"
            data-testid="register-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Input
                label="Country"
                type="text"
                id="countryCode"
                name="countryCode"
                value="+65"
                disabled
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Phone (8 digits)"
                type="tel"
                id="phone"
                name="phone"
                data-testid="register-phone"
                value={phoneDigits}
                onChange={(e) => {
                  setPhoneDigits(normalizeSgPhoneDigits(e.target.value));
                  setError(null);
                }}
                inputMode="numeric"
                placeholder="81234567"
                required
                helperText={`Singapore numbers only. Admin: ${ADMIN_PHONES_RAW.split(",")[0].replace("+65", "")}`}
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

          {success && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--bg-muted)", color: "var(--text)" }}
              data-testid="register-success"
            >
              {success}
            </div>
          )}

          <Button type="submit" data-testid="register-submit" fullWidth size="lg">
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
}
