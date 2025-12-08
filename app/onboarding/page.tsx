"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    city: "",
    interests: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  const interestOptions = [
    "Running",
    "Books",
    "Coffee",
    "Tech",
    "Fitness",
    "Cinema",
  ];

  const handleInterestChange = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Onboarding form data:", JSON.stringify(formData, null, 2));
    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-dark mb-8 text-center">
        Welcome to Never Strangers
      </h1>
      {submitted ? (
        <div className="bg-beige-frame border border-beige-frame rounded-lg p-4 text-center">
          <p className="text-gray-dark">
            Thank you, onboarding complete (fake)
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              City
            </label>
            <input
              type="text"
              id="city"
              required
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-dark mb-3">
              Interests
            </label>
            <div className="space-y-2">
              {interestOptions.map((interest) => (
                <label
                  key={interest}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestChange(interest)}
                    className="w-4 h-4 text-red-accent border-beige-frame rounded focus:ring-red-accent"
                  />
                  <span className="text-gray-dark">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}


