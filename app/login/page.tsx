"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPostLoginRedirect } from "@/lib/auth/getPostLoginRedirect";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const RESET_COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();

  // Redirect already-authenticated users away from the login page
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const res = await fetch("/api/profile", { credentials: "include" });
      const profile = res.ok ? await res.json().catch(() => null) : null;
      router.replace(getPostLoginRedirect(profile?.status));
    });
  }, [router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

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

      // Set ns_session cookie so server-rendered admin and layout see the session
      await fetch("/api/auth/sync-session", { method: "POST", credentials: "include" });

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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!trimmed || !isValidEmail(trimmed) || forgotLoading || forgotCooldown > 0) return;
    setForgotLoading(true);
    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
    } catch {
      /* generic message either way */
    }
    setForgotSent(true);
    setForgotLoading(false);
    setForgotCooldown(RESET_COOLDOWN_SECONDS);
    const t = setInterval(() => {
      setForgotCooldown((prev) => {
        if (prev <= 1) clearInterval(t);
        return Math.max(0, prev - 1);
      });
    }, 1000);
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        backgroundColor: "var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Wordmark */}
        <p
          className="text-center mb-8"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 28,
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}
        >
          Never Strangers
        </p>

        <Card className="sm:shadow-[var(--shadow-card)]" style={{ padding: "40px" }}>
          <h1
            className="mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(22px, 5vw, 28px)",
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h1>
          <p className="mb-6" style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Enter your email and password to sign in.
          </p>

          <form method="post" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

            <p className="text-center" style={{ fontSize: 13, color: "var(--text-muted)" }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="hover:underline"
                style={{ color: "var(--primary)" }}
                data-testid="login-forgot-password"
              >
                Forgot password?
              </button>
            </p>
          </form>
        </Card>

        {showForgot && (
          <Card className="mt-3 sm:shadow-[var(--shadow-card)]" style={{ padding: "24px" }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Reset password
            </h3>
            {!forgotSent ? (
              <>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  We&apos;ll email you a secure link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Input
                    label="Email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    data-testid="forgot-email"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    fullWidth
                    disabled={forgotLoading || forgotCooldown > 0}
                    data-testid="forgot-submit"
                  >
                    {forgotLoading
                      ? "Sending…"
                      : forgotCooldown > 0
                      ? `Resend in ${forgotCooldown}s`
                      : "Send reset link"}
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }} data-testid="forgot-sent">
                If an account exists for this email, you&apos;ll receive a reset link shortly. Check your inbox and spam folder.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotSent(false);
                setForgotEmail("");
              }}
              className="mt-3 text-sm hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Back to login
            </button>
          </Card>
        )}

        <p className="mt-4 text-center" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          New?{" "}
          <Link href="/register" style={{ color: "var(--primary)" }} className="hover:underline">
            Register
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
