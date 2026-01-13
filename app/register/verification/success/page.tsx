"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerificationSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to /events after 2 seconds
    const timer = setTimeout(() => {
      router.push("/events");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-dark mb-4">
            Email Verified!
          </h1>
          <p className="text-lg text-gray-medium mb-8">
            Your account is pending admin approval. Redirecting to events...
          </p>
        </div>
      </div>
    </div>
  );
}
