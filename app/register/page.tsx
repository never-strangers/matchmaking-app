"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const cities = [
  "Choose a City",
  "Singapore",
  "Kuala Lumpur",
  "Manila",
  "Bangkok",
  "Hong Kong",
  "Tokyo",
  "Seoul",
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "mihailzlochevskiy@gmail.com",
    firstName: "",
    lastName: "",
    password: "**********",
    city: "",
    birthDate: "",
    gender: "Male",
    attractedTo: [] as string[],
    lookingFor: [] as string[],
    whyNeverStrangers: "",
    instagram: "",
    profilePhoto: null as File | null,
    termsAccepted: false,
    privacyAccepted: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (field: string, value: string) => {
    setFormData((prev) => {
      const current = prev[field as keyof typeof prev] as string[];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleRadioChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, profilePhoto: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save registration data (mocked)
    localStorage.setItem("registrationData", JSON.stringify(formData));
    // Navigate to verification page
    router.push("/register/verification");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            E-mail Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          />
        </div>

        {/* First Name */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          />
        </div>

        {/* Last Name */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-dark"
            >
              Create Password
            </label>
            <button
              type="button"
              className="text-gray-medium hover:text-gray-dark"
              aria-label="Password help"
            >
              ?
            </button>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          />
        </div>

        {/* City */}
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            Which city are you in?
          </label>
          <select
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          >
            {cities.map((city) => (
              <option key={city} value={city === "Choose a City" ? "" : city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Birth Date */}
        <div>
          <label
            htmlFor="birthDate"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            Birth Date
          </label>
          <div className="relative">
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-dark mb-3">
            Gender
          </label>
          <div className="space-y-2">
            {["Male", "Female", "Others"].map((gender) => (
              <label
                key={gender}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="gender"
                  value={gender}
                  checked={formData.gender === gender}
                  onChange={() => handleRadioChange(gender)}
                  className="w-4 h-4 text-red-accent border-beige-frame focus:ring-red-accent"
                />
                <span className="text-gray-dark">{gender}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Attracted To */}
        <div>
          <label className="block text-sm font-medium text-gray-dark mb-3">
            Which gender are you attracted to?
          </label>
          <div className="space-y-2">
            {["Men", "Women"].map((option) => (
              <label
                key={option}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.attractedTo.includes(option)}
                  onChange={() => handleCheckboxChange("attractedTo", option)}
                  className="w-4 h-4 text-red-accent border-beige-frame rounded focus:ring-red-accent"
                />
                <span className="text-gray-dark">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Looking For */}
        <div>
          <label className="block text-sm font-medium text-gray-dark mb-3">
            What are you looking for?
          </label>
          <div className="space-y-2">
            {["Friends", "A Date"].map((option) => (
              <label
                key={option}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.lookingFor.includes(option)}
                  onChange={() => handleCheckboxChange("lookingFor", option)}
                  className="w-4 h-4 text-red-accent border-beige-frame rounded focus:ring-red-accent"
                />
                <span className="text-gray-dark">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Why Never Strangers */}
        <div>
          <label
            htmlFor="whyNeverStrangers"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            Let&apos;s know more about you. Tell us why Never Strangers is for
            you!
          </label>
          <textarea
            id="whyNeverStrangers"
            name="whyNeverStrangers"
            value={formData.whyNeverStrangers}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
          />
        </div>

        {/* Instagram */}
        <div>
          <label
            htmlFor="instagram"
            className="block text-sm font-medium text-gray-dark mb-2"
          >
            Vibe Check! What&apos;s Your Instagram? (With a clear picture of
            yourself in your display picture!)
          </label>
          <div>
            <span className="text-sm text-gray-medium mr-2">@</span>
            <input
              type="text"
              id="instagram"
              name="instagram"
              placeholder="Username"
              value={formData.instagram}
              onChange={handleInputChange}
              className="inline-block w-[calc(100%-2rem)] px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>
        </div>

        {/* Profile Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-dark mb-2">
            Upload your Profile Photo
          </label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border-2 border-beige-frame rounded-full flex items-center justify-center bg-white overflow-hidden">
              {formData.profilePhoto ? (
                <img
                  src={URL.createObjectURL(formData.profilePhoto)}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
              )}
            </div>
            <div>
              <input
                type="file"
                id="profilePhoto"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="profilePhoto"
                className="inline-block bg-gray-dark text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Upload
              </label>
            </div>
          </div>
        </div>

        {/* Terms Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  termsAccepted: e.target.checked,
                }))
              }
              required
              className="mt-1 w-4 h-4 text-red-accent border-beige-frame rounded focus:ring-red-accent"
            />
            <span className="text-sm text-gray-dark">
              I agree to the Terms and Conditions
            </span>
          </label>
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.privacyAccepted}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  privacyAccepted: e.target.checked,
                }))
              }
              required
              className="mt-1 w-4 h-4 text-red-accent border-beige-frame rounded focus:ring-red-accent"
            />
            <span className="text-sm text-gray-dark">
              I agree to the Privacy Policy
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-red-accent text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Register
          </button>
          <Link
            href="/login"
            className="flex-1 bg-red-accent text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
          >
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}

