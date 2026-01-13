"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to events - onboarding is deprecated
    router.push("/events");
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-dark mb-4">
          Onboarding Deprecated
        </h2>
        <p className="text-gray-medium mb-4">
          Onboarding has been removed. Questionnaires are now per-event and collected after RSVP and payment.
        </p>
        <p className="text-sm text-gray-medium">
          Redirecting to events...
        </p>
      </div>
    </div>
  );
}
