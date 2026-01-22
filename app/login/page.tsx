"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";
import { DEMO_USERS } from "@/lib/auth/demoUsers";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, loginAsUser } = useSession();
  const [checkingSession, setCheckingSession] = useState(true);

  // Check session directly from localStorage to avoid hook state delays
  useEffect(() => {
    // Wait a bit to ensure logout has completed
    const timer = setTimeout(() => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        // User is logged in, redirect to events
        router.replace("/events");
      } else {
        // User is not logged in, show login form
        setCheckingSession(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [router]);

  // Show loading state while checking session
  if (isLoading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige-light px-4">
        <div className="max-w-md w-full bg-white border border-beige-frame rounded-lg p-8 shadow-lg text-center">
          <p className="text-gray-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-light px-4">
      <div className="max-w-md w-full bg-white border border-beige-frame rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-dark mb-2">
            Welcome to Never Strangers
          </h1>
          <p className="text-gray-medium">
            Select a demo user to continue
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-dark mb-3">
            Select Demo User
          </label>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                onClick={() => {
                  loginAsUser(user);
                  // Use full page reload to ensure all state is fresh and avoid redirect loops
                  setTimeout(() => {
                    window.location.href = "/events";
                  }, 100);
                }}
                className="w-full flex items-center gap-3 p-3 border-2 border-beige-frame rounded-lg bg-white hover:border-red-accent hover:bg-red-50 transition-all"
              >
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-dark">{user.name}</p>
                  <p className="text-xs text-gray-medium">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>


        <p className="mt-6 text-xs text-gray-medium text-center">
          This is a demo application. All data is stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
