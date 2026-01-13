"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRegistrationData } from "@/lib/demoStore";
import { sendOTP, verifyEmailOTP, DEMO_OTP_CODE, createOrUpdateUser, canReapply } from "@/lib/demo/userStore";
import { setCurrentUserId } from "@/lib/demo/authStore";

export default function VerificationPage() {
  const router = useRouter();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const data = getRegistrationData();
    if (!data || !data.email) {
      router.push("/register");
      return;
    }

    setRegistrationData(data);

    // Check cooldown if user was rejected
    const cooldown = canReapply(data.email);
    if (!cooldown.can) {
      setError(
        `You can reapply after ${cooldown.hoursRemaining} hour(s). Your previous application was rejected.`
      );
      return;
    }

    // Auto-send OTP
    sendOTP(data.email);
    setOtpSent(true);
  }, [router]);

  const handleVerifyOTP = () => {
    if (!registrationData?.email) return;

    setError("");
    if (otp !== DEMO_OTP_CODE) {
      setError("Invalid OTP code. Demo code is: " + DEMO_OTP_CODE);
      return;
    }

    try {
      // Create user profile first (with unverified status)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = createOrUpdateUser({
        id: userId,
        name: `${registrationData.firstName} ${registrationData.lastName}`.trim(),
        email: registrationData.email,
        phone: registrationData.phone,
        age: registrationData.birthDate
          ? new Date().getFullYear() - new Date(registrationData.birthDate).getFullYear()
          : undefined,
        gender: registrationData.gender?.toLowerCase() as any,
        city: registrationData.city,
        orientation: {
          attractedTo: registrationData.attractedTo?.map((g: string) => g.toLowerCase()) || [],
          lookingFor: registrationData.lookingFor || [],
        },
        profilePhotoUrl: registrationData.profilePhoto
          ? URL.createObjectURL(registrationData.profilePhoto)
          : undefined,
        questionnaireAnswers: {}, // Empty initially, filled during onboarding
        status: "unverified", // Start as unverified
      });

      // Now verify OTP (this will update status to pending_approval)
      const verified = verifyEmailOTP(registrationData.email, otp);
      if (!verified) {
        setError("OTP verification failed");
        return;
      }

      setCurrentUserId(userId);
      setVerified(true);

      // Redirect to /events with pending banner
      setTimeout(() => {
        router.push("/events");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

  const handleResendOTP = () => {
    if (!registrationData?.email) return;
    sendOTP(registrationData.email);
    setOtpSent(true);
    setError("");
  };

  if (verified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-green-600"
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
            Your account is being created. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-dark mb-4">
          Verify Your Email
        </h1>
        <p className="text-lg text-gray-medium">
          We sent a verification code to{" "}
          <span className="font-medium">{registrationData?.email}</span>
        </p>
      </div>

      <div className="bg-white border border-beige-frame rounded-lg p-6 mb-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        {otpSent && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            OTP sent! Demo code: <strong>{DEMO_OTP_CODE}</strong>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              Enter Verification Code
            </label>
            <input
              type="text"
              id="otp"
              data-testid="otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent text-center text-2xl tracking-widest"
            />
          </div>

          <button
            onClick={handleVerifyOTP}
            data-testid="otp-submit"
            className="w-full bg-red-accent text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Verify Email
          </button>

          <button
            onClick={handleResendOTP}
            className="w-full text-gray-medium hover:text-gray-dark text-sm"
          >
            Resend Code
          </button>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/register"
          className="text-gray-medium hover:text-gray-dark text-sm"
        >
          Back to Registration
        </Link>
      </div>
    </div>
  );
}
