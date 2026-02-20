"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

type PageState = "loading" | "ready" | "submitting" | "success" | "error";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string>("");

  const bootstrap = useCallback(async () => {
    const supabase = createClient();
    const code = searchParams.get("code");
    const urlError = searchParams.get("error");

    if (urlError) {
      setErrorMessage("This reset link is invalid or has expired.");
      setPageState("error");
      return;
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setErrorMessage("This reset link is invalid or has already been used.");
        setPageState("error");
        return;
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setPageState("ready");
        }
      }
    );

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      setPageState("ready");
      return () => listener.subscription.unsubscribe();
    }

    const hasRecoveryHash = () =>
      typeof window !== "undefined" &&
      !!window.location.hash &&
      (window.location.hash.includes("type=recovery") ||
        window.location.hash.includes("access_token="));

    const waitForSessionOrShowError = () => {
      const maxWait = 4000;
      const interval = 200;
      let elapsed = 0;
      const poll = () => {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            setPageState("ready");
            return;
          }
          elapsed += interval;
          if (elapsed < maxWait) {
            setTimeout(poll, interval);
          } else {
            setErrorMessage(
              "No recovery session found. Please request a new reset link."
            );
            setPageState("error");
          }
        });
      };
      poll();
    };

    if (hasRecoveryHash()) {
      const t = setTimeout(waitForSessionOrShowError, 100);
      return () => {
        clearTimeout(t);
        listener.subscription.unsubscribe();
      };
    }

    const deferredCheck = setTimeout(() => {
      if (hasRecoveryHash()) {
        waitForSessionOrShowError();
      } else {
        setErrorMessage(
          "No recovery session found. Please request a new reset link."
        );
        setPageState("error");
      }
    }, 100);

    return () => {
      clearTimeout(deferredCheck);
      listener.subscription.unsubscribe();
    };
  }, [searchParams]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const validationError = validatePassword(password);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    if (password !== confirm) {
      setFieldError("Passwords do not match.");
      return;
    }

    setPageState("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFieldError(error.message || "Failed to update password. Please try again.");
      setPageState("ready");
      return;
    }

    setPageState("success");
    setTimeout(() => router.replace("/profile?reset=success"), 2000);
  };

  if (pageState === "loading") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">Verifying reset link…</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="rounded-xl border border-[var(--border)] p-8 text-center bg-[var(--bg-panel)]">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-4">
            Link expired or invalid
          </h1>
          <p className="text-[var(--text-muted)] mb-6">{errorMessage}</p>
          <Link
            href="/profile"
            className="inline-block bg-[var(--primary)] text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="rounded-xl border border-[var(--border)] p-8 text-center bg-[var(--bg-panel)]">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--success)]/20">
            <svg className="w-6 h-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
            Password updated
          </h1>
          <p className="text-[var(--text-muted)]">Redirecting you to your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-xl border border-[var(--border)] p-8 bg-[var(--bg-panel)]">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Set a new password
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Choose a strong password with at least {MIN_PASSWORD_LENGTH}{" "}
          characters, including a letter and a number.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              placeholder="Min. 8 characters"
              data-testid="reset-password-input"
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl border-[var(--border)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              placeholder="Repeat password"
              data-testid="reset-password-confirm"
            />
          </div>

          {fieldError && (
            <p
              role="alert"
              className="text-sm text-[var(--danger)]"
              data-testid="reset-password-error"
            >
              {fieldError}
            </p>
          )}

          <button
            type="submit"
            disabled={pageState === "submitting"}
            className="w-full bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="reset-password-submit"
          >
            {pageState === "submitting" ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-[var(--text-muted)]">Verifying reset link…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
