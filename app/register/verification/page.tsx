"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRegistrationData } from "@/lib/demoStore";
import {
  sendOTP,
  verifyEmailOTP,
  DEMO_OTP_CODE,
  createOrUpdateUser,
  canReapply,
} from "@/lib/demo/userStore";
import { setCurrentUserId } from "@/lib/demo/authStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

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

    const cooldown = canReapply(data.email);
    if (!cooldown.can) {
      setError(
        `You can reapply after ${cooldown.hoursRemaining} hour(s). Your previous application was rejected.`
      );
      return;
    }

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
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = createOrUpdateUser({
        id: userId,
        name: `${registrationData.firstName} ${registrationData.lastName}`.trim(),
        email: registrationData.email,
        phone: registrationData.phone,
        age: registrationData.birthDate
          ? new Date().getFullYear() -
            new Date(registrationData.birthDate).getFullYear()
          : undefined,
        gender: registrationData.gender?.toLowerCase() as any,
        city: registrationData.city,
        orientation: {
          attractedTo:
            registrationData.attractedTo?.map((g: string) => g.toLowerCase()) ||
            [],
          lookingFor: registrationData.lookingFor || [],
        },
        profilePhotoUrl: registrationData.profilePhoto
          ? URL.createObjectURL(registrationData.profilePhoto)
          : undefined,
        questionnaireAnswers: {},
        status: "unverified",
      });

      const verified = verifyEmailOTP(registrationData.email, otp);
      if (!verified) {
        setError("OTP verification failed");
        return;
      }

      setCurrentUserId(userId);
      setVerified(true);

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
        <Card padding="lg">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--success-light)" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12"
                style={{ color: "var(--success)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--text)" }}>
              Email Verified
            </h1>
            <p className="text-lg mb-8" style={{ color: "var(--text-muted)" }}>
              Your account is being created. Redirecting...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Verify Your Email"
        subtitle={`We sent a verification code to ${registrationData?.email || ""}`}
      />

      <Card>
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
            {error}
          </div>
        )}

        {otpSent && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--info-light)", color: "var(--info)", border: "1px solid var(--info)" }}>
            OTP sent! Demo code: <strong>{DEMO_OTP_CODE}</strong>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Enter Verification Code"
            type="text"
            id="otp"
            data-testid="otp-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="text-center text-2xl tracking-widest"
          />

          <Button
            onClick={handleVerifyOTP}
            data-testid="otp-submit"
            fullWidth
            size="lg"
          >
            Verify Email
          </Button>

          <Button
            onClick={handleResendOTP}
            variant="ghost"
            fullWidth
            size="md"
          >
            Resend Code
          </Button>
        </div>
      </Card>

      <div className="text-center mt-6">
        <Link
          href="/register"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          Back to Registration
        </Link>
      </div>
    </div>
  );
}
