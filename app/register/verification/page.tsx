"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRegistrationData } from "@/lib/demoStore";

export default function VerificationPage() {
  const [registrationData, setRegistrationData] = useState<any>(null);

  useEffect(() => {
    // Load registration data
    const data = getRegistrationData();
    if (data) {
      setRegistrationData(data);
    }
  }, []);

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
            Your Profile is Under Verification
          </h1>
          <p className="text-lg text-gray-medium mb-8">
            Thank you for registering with Never Strangers!
          </p>
        </div>

        <div className="bg-beige-frame border border-beige-frame rounded-lg p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-gray-dark mb-4">
            What happens next?
          </h2>
          <ul className="space-y-3 text-gray-dark">
            <li className="flex items-start">
              <span className="text-red-accent mr-2">•</span>
              <span>
                Our team is reviewing your profile and application.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-red-accent mr-2">•</span>
              <span>
                You&apos;ll receive an email at{" "}
                <span className="font-medium">
                  {registrationData?.email || "your email"}
                </span>{" "}
                once your profile is approved.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-red-accent mr-2">•</span>
              <span>
                This process typically takes 24-48 hours. We appreciate your
                patience!
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-medium">
            In the meantime, you can check your email for updates or contact
            our support team if you have any questions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="bg-red-accent text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Back to Home
            </Link>
            <Link
              href="/login"
              className="bg-gray-dark text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

