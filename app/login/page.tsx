"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPostLoginRedirect } from "@/lib/auth/getPostLoginRedirect";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      setLoading(false);
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }
    if (!trimmedPassword) {
      setError("Password is required.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (signInError) {
        if (signInError.message?.toLowerCase().includes("email not confirmed")) {
          setError("Please confirm your email before logging in.");
        } else if (
          signInError.message?.toLowerCase().includes("invalid") ||
          signInError.message?.toLowerCase().includes("credentials")
        ) {
          setError("Invalid email or password.");
        } else {
          setError(signInError.message || "Login failed.");
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Ensure profile exists and get status for redirect
      const res = await fetch("/api/profile", { credentials: "include" });
      const profile = res.ok ? await res.json().catch(() => null) : null;
      const status = profile?.status ?? "pending_verification";
      const redirectTo = getPostLoginRedirect(status);

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
        subtitle="Enter your email and password"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email"
            type="email"
            id="email"
            name="email"
            data-testid="login-email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            id="password"
            name="password"
            data-testid="login-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Your password"
            required
            autoComplete="current-password"
          />

          {error && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--bg-muted)", color: "var(--danger)" }}
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
        New? <Link href="/register" className="hover:underline">Register</Link>.
      </p>
    </div>
  );
}
