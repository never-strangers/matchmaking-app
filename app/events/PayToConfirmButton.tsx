"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = { eventId: string; label?: string };

export function PayToConfirmButton({ eventId, label = "Pay to confirm" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event_id: eventId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to start checkout");
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="md"
      onClick={handleClick}
      disabled={loading}
      data-testid="pay-to-confirm-button"
    >
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
