"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InviteLoginPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invite_token: token }),
        });

        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setStatus("error");
            setErrorMessage(text || "Failed to redeem invite");
          }
          return;
        }

        const data = (await res.json()) as { ok?: boolean; pending_registration?: boolean };
        if (!cancelled) {
          if (data.pending_registration) {
            router.replace("/register");
            return;
          }
          // Session cookie is now set; redirect to events
          router.replace("/events");
        }
      } catch (err) {
        console.error("Error redeeming invite:", err);
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Something went wrong. Please try again.");
        }
      }
    }

    if (typeof token === "string" && token.length > 0) {
      void run();
    } else {
      setStatus("error");
      setErrorMessage("Invalid invite link");
    }

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-light px-4">
      <div className="max-w-md w-full bg-white border border-beige-frame rounded-lg p-8 shadow-lg text-center">
        {isLoading ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-dark mb-3">
              Logging you in…
            </h1>
            <p className="text-gray-medium mb-4">
              We&apos;re validating your invite and preparing your event profile.
            </p>
            <div className="flex justify-center mt-4">
              <div className="w-10 h-10 border-4 border-beige-frame border-t-red-accent rounded-full animate-spin" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-dark mb-3">
              Invite problem
            </h1>
            <p className="text-gray-medium mb-4">
              {errorMessage || "This invite link is not valid."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

