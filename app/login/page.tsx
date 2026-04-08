"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getPostLoginRedirect } from "@/lib/auth/getPostLoginRedirect";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const RESET_COOLDOWN_SECONDS = 60;

// Splash screen: full-bleed image, headline, two CTA buttons
function SplashScreen({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <div className="relative flex flex-col" style={{ minHeight: "100svh" }}>
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/carousel-2.webp"
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      {/* Gradient overlay — dark at bottom for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col justify-end px-6 pb-10"
        style={{ minHeight: "100svh" }}
      >
        {/* Logo wordmark top-left */}
        <div style={{ position: "absolute", top: 24, left: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Never Strangers" style={{ height: 36, filter: "brightness(0) invert(1)" }} />
        </div>

        {/* Headline */}
        <h1
          className="mb-8 text-white"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(32px, 9vw, 52px)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            maxWidth: 380,
          }}
        >
          We all start as strangers
        </h1>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
          <button
            onClick={onRegister}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              border: "1.5px solid rgba(255,255,255,0.5)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Get Invited
          </button>
          <button
            onClick={onLogin}
            style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              border: "none",
              color: "#111",
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Login
          </button>
        </div>

        {/* Legal */}
        <p className="mt-5 text-center" style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", maxWidth: 420 }}>
          By continuing you agree to our{" "}
          <Link href="https://thisisneverstrangers.com/terms" target="_blank" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="https://thisisneverstrangers.com/privacy" target="_blank" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

// Login form — slides up as a bottom sheet over the splash
function LoginForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (redirectTo: string) => void;
}) {
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
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) { setError("Enter a valid email address."); setLoading(false); return; }
    if (!trimmedPassword) { setError("Password is required."); setLoading(false); return; }
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPassword });
      if (signInError) {
        setError(signInError.message?.toLowerCase().includes("invalid") || signInError.message?.toLowerCase().includes("credentials") ? "Invalid email or password." : signInError.message || "Login failed.");
        setLoading(false);
        return;
      }
      if (!data.user) { setError("Login failed. Please try again."); setLoading(false); return; }
      await fetch("/api/auth/sync-session", { method: "POST", credentials: "include" });
      const res = await fetch("/api/profile", { credentials: "include" });
      const profile = res.ok ? await res.json().catch(() => null) : null;
      onSuccess(getPostLoginRedirect(profile?.status ?? "pending_verification"));
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
    try { await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmed }) }); } catch { /* silent */ }
    setForgotSent(true);
    setForgotLoading(false);
    setForgotCooldown(RESET_COOLDOWN_SECONDS);
    const t = setInterval(() => { setForgotCooldown((prev) => { if (prev <= 1) clearInterval(t); return Math.max(0, prev - 1); }); }, 1000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onBack(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg)",
          borderRadius: "24px 24px 0 0",
          padding: "32px 24px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto 24px" }} />

        {!showForgot ? (
          <>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--text)", marginBottom: 4, letterSpacing: "-0.02em" }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>Sign in to your account</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input label="Email" type="email" id="email" name="email" data-testid="login-email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="you@example.com" required autoComplete="email" />
              <Input label="Password" type="password" id="password" name="password" data-testid="login-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="Your password" required autoComplete="current-password" />
              {error && (
                <div className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-muted)", color: "var(--danger)" }} data-testid="login-error">
                  {error}
                </div>
              )}
              <Button type="submit" data-testid="login-submit" fullWidth size="lg" disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </Button>
              <p className="text-center" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <button type="button" onClick={() => setShowForgot(true)} className="hover:underline" style={{ color: "var(--primary)" }} data-testid="login-forgot-password">
                  Forgot password?
                </button>
              </p>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--text)", marginBottom: 4, letterSpacing: "-0.02em" }}>Reset password</h2>
            {!forgotSent ? (
              <>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>We&apos;ll email you a link to reset your password.</p>
                <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Input label="Email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" data-testid="forgot-email" />
                  <Button type="submit" variant="secondary" fullWidth disabled={forgotLoading || forgotCooldown > 0} data-testid="forgot-submit">
                    {forgotLoading ? "Sending…" : forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : "Send reset link"}
                  </Button>
                </form>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-muted)" }} data-testid="forgot-sent">
                If an account exists for this email, you&apos;ll receive a reset link shortly.
              </p>
            )}
            <button type="button" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} className="mt-4 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
              ← Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type Screen = "splash" | "login";

export default function LoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("splash");

  // Redirect already-authenticated users
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: { user: unknown } | null } }) => {
      if (!session) return;
      const res = await fetch("/api/profile", { credentials: "include" });
      const profile = res.ok ? await res.json().catch(() => null) : null;
      router.replace(getPostLoginRedirect(profile?.status));
    });
  }, [router]);

  const handleSuccess = (redirectTo: string) => {
    router.replace(redirectTo);
    window.location.href = redirectTo;
  };

  return (
    <>
      <SplashScreen
        onLogin={() => setScreen("login")}
        onRegister={() => router.push("/register")}
      />
      {screen === "login" && (
        <LoginForm
          onBack={() => setScreen("splash")}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
