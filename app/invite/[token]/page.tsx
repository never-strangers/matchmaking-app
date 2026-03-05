"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function InviteLoginPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid invite link.");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_token: token }),
      });

      if (!res.ok) {
        const text = await res.text();
        setStatus("error");
        setErrorMessage(text || "This invite link is not valid or has already been used.");
        return;
      }

      const data = (await res.json()) as { ok?: boolean; pending_registration?: boolean };
      if (data.pending_registration) {
        router.replace("/register");
        return;
      }
      router.replace("/events");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
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
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "40px 32px",
          textAlign: "center",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Wordmark */}
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
            marginBottom: 32,
            textTransform: "uppercase",
          }}
        >
          Never Strangers
        </p>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(28px, 6vw, 40px)",
            color: "var(--text)",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          You&apos;re invited.
        </h1>

        <p
          style={{
            fontSize: 16,
            color: "var(--text-muted)",
            marginBottom: 36,
            lineHeight: 1.6,
          }}
        >
          Tap below to claim your spot at the next event.
        </p>

        <Button
          onClick={handleClaim}
          disabled={status === "loading"}
          fullWidth
          size="lg"
        >
          {status === "loading" ? "Claiming…" : "Claim my invite →"}
        </Button>

        {status === "error" && errorMessage && (
          <p
            style={{
              marginTop: 16,
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
