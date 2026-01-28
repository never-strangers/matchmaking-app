"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { setRegistrationData } from "@/lib/demoStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const cities = [
  { value: "", label: "Choose a City" },
  { value: "Singapore", label: "Singapore" },
  { value: "Kuala Lumpur", label: "Kuala Lumpur" },
  { value: "Manila", label: "Manila" },
  { value: "Bangkok", label: "Bangkok" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Tokyo", label: "Tokyo" },
  { value: "Seoul", label: "Seoul" },
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
    setRegistrationData(formData);
    router.push("/register/verification");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Request Access"
        subtitle="Join our curated community of thoughtful connections"
      />
      
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="E-mail Address"
            type="email"
            id="email"
            name="email"
            data-testid="register-email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              id="firstName"
              name="firstName"
              data-testid="register-name"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Last Name"
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
          </div>

          <Input
            label="Create Password"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            helperText="Use a strong password with at least 8 characters"
          />

          <Select
            label="Which city are you in?"
            id="city"
            name="city"
            data-testid="register-city"
            value={formData.city}
            onChange={handleInputChange}
            required
            options={cities}
          />

          <Input
            label="Birth Date"
            type="date"
            id="birthDate"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleInputChange}
            required
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">
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
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-[var(--text)]">{gender}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">
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
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                  <span className="text-[var(--text)]">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">
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
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                  <span className="text-[var(--text)]">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="whyNeverStrangers"
              className="block text-sm font-medium text-[var(--text)] mb-2"
            >
              Tell us why Never Strangers is for you
            </label>
            <textarea
              id="whyNeverStrangers"
              name="whyNeverStrangers"
              value={formData.whyNeverStrangers}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="instagram"
              className="block text-sm font-medium text-[var(--text)] mb-2"
            >
              Instagram Handle
            </label>
            <div className="flex items-center">
              <span className="text-sm text-[var(--text-muted)] mr-2">@</span>
              <input
                type="text"
                id="instagram"
                name="instagram"
                placeholder="username"
                value={formData.instagram}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2.5 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200"
              />
            </div>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Please use a profile picture that clearly shows your face
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 border-2 border-[var(--border)] rounded-full flex items-center justify-center bg-[var(--bg-muted)] overflow-hidden">
                {formData.profilePhoto ? (
                  <Image
                    src={URL.createObjectURL(formData.profilePhoto)}
                    alt="Profile preview"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] opacity-20"></div>
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
                  className="inline-block"
                >
                  <Button type="button" variant="outline" size="md">
                    Upload Photo
                  </Button>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--border)]">
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
                className="mt-1 w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text)]">
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
                className="mt-1 w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text)]">
                I agree to the Privacy Policy
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              type="submit"
              data-testid="register-submit"
              fullWidth
              size="lg"
            >
              Request Access
            </Button>
            <Link href="/login" className="flex-1">
              <Button type="button" variant="outline" fullWidth size="lg">
                Already have an account?
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
