"use client";

import { UserProfile, UserStatus, Gender, OrientationPreferences } from "@/types/user";
import { QuestionnaireAnswers } from "@/types/questionnaire";

const USERS_KEY = "ns_users";
const OTP_STORAGE_KEY = "ns_otp_"; // Prefix for OTP storage per email

// Mock OTP code (always "123456" for demo)
export const DEMO_OTP_CODE = "123456";

// 24 hours in milliseconds
const REJECTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Get all users
 */
export function listUsers(): UserProfile[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    // Try to initialize from central init
    try {
      const { initializeDemoData } = require("./initDemoData");
      initializeDemoData();
      const retry = localStorage.getItem(USERS_KEY);
      if (retry) {
        return JSON.parse(retry);
      }
    } catch {
      // Fallback to old seed
      const seeded = seedDemoUsers();
      saveUsers(seeded);
      return seeded;
    }
  }
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Get user by ID
 */
export function getUserById(id: string): UserProfile | null {
  const users = listUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Create user (on registration)
 * Sets status to PENDING and emailVerified to false
 */
export function createUser(profile: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: Gender;
  city: string;
  orientation?: OrientationPreferences;
  profilePhotoUrl?: string;
  questionnaireAnswers: QuestionnaireAnswers;
}): UserProfile {
  const users = listUsers();
  const existing = users.find((u) => u.id === profile.id || u.email === profile.email);
  
  if (existing) {
    throw new Error("User already exists");
  }

  // Check cooldown if user was previously rejected
  const rejectedUser = users.find((u) => u.email === profile.email && u.status === "rejected");
  if (rejectedUser && rejectedUser.rejectedAt) {
    const rejectedAt = new Date(rejectedUser.rejectedAt).getTime();
    const now = Date.now();
    const cooldownRemaining = REJECTION_COOLDOWN_MS - (now - rejectedAt);
    if (cooldownRemaining > 0) {
      const hoursRemaining = Math.ceil(cooldownRemaining / (60 * 60 * 1000));
      throw new Error(`You can reapply after ${hoursRemaining} hour(s). Your previous application was rejected.`);
    }
  }
  
  const now = new Date().toISOString();
  const userProfile: UserProfile = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    age: profile.age,
    gender: profile.gender,
    city: profile.city,
    cityLocked: false,
    orientation: profile.orientation,
    profilePhotoUrl: profile.profilePhotoUrl,
    questionnaireAnswers: profile.questionnaireAnswers,
    status: "unverified", // Start as unverified until OTP is confirmed
    emailVerified: false,
    role: "guest", // New users start as guest
    createdAt: now,
  };

  users.push(userProfile);
  saveUsers(users);
  return userProfile;
}

/**
 * Create or update user (upsert)
 * Creates a new user if they don't exist, or updates existing user
 */
export function createOrUpdateUser(profile: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: Gender;
  city: string;
  orientation?: OrientationPreferences;
  profilePhotoUrl?: string;
  questionnaireAnswers: QuestionnaireAnswers;
  status?: UserStatus;
}): UserProfile {
  const users = listUsers();
  const existing = users.find((u) => u.id === profile.id || u.email === profile.email);
  
  if (existing) {
    // Update existing user
    const updates: Partial<UserProfile> = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      age: profile.age,
      gender: profile.gender,
      city: profile.city,
      orientation: profile.orientation,
      profilePhotoUrl: profile.profilePhotoUrl,
      questionnaireAnswers: profile.questionnaireAnswers,
    };
    
    if (profile.status) {
      updates.status = profile.status;
    }
    
    const updated = updateUser(existing.id, updates);
    return updated || existing;
  }

  // Create new user
  const now = new Date().toISOString();
  const userProfile: UserProfile = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    age: profile.age,
    gender: profile.gender,
    city: profile.city,
    cityLocked: false,
    orientation: profile.orientation,
    profilePhotoUrl: profile.profilePhotoUrl,
    questionnaireAnswers: profile.questionnaireAnswers,
    status: profile.status || "unverified",
    emailVerified: profile.status === "pending_approval" ? true : false,
    role: "guest", // New users start as guest
    createdAt: now,
  };

  users.push(userProfile);
  saveUsers(users);
  return userProfile;
}

/**
 * Update user profile
 */
export function updateUser(
  userId: string,
  updates: Partial<UserProfile>
): UserProfile | null {
  const users = listUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  // Prevent city change if locked (unless admin override)
  if (updates.city && user.cityLocked && updates.city !== user.city) {
    // Allow city change request instead
    user.cityChangeRequested = updates.city;
    updates.city = undefined; // Don't change city directly
  }

  Object.assign(user, updates);
  user.updatedAt = new Date().toISOString();
  saveUsers(users);
  return user;
}

/**
 * Set user status
 */
export function setUserStatus(
  userId: string,
  status: UserStatus,
  notes?: string
): UserProfile | null {
  const users = listUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  const now = new Date().toISOString();
  user.status = status;
  if (status === "approved") {
    user.approvedAt = now;
    user.rejectedAt = undefined;
    user.cityLocked = true; // Lock city after approval
    // Clear city change request if approved
    if (user.cityChangeRequested) {
      user.cityChangeRequested = undefined;
    }
  } else if (status === "rejected") {
    user.rejectedAt = now;
    user.approvedAt = undefined;
  }
  if (notes !== undefined) {
    user.notes = notes;
  }

  saveUsers(users);
  return user;
}

/**
 * Verify email OTP
 */
export function verifyEmailOTP(email: string, otp: string): boolean {
  if (otp !== DEMO_OTP_CODE) {
    return false;
  }

  const users = listUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return false;

  // Mark email as verified and set status to pending_approval
  user.emailVerified = true;
  if (user.status === "unverified") {
    user.status = "pending_approval";
  }
  saveUsers(users);
  return true;
}

/**
 * Send OTP (mock - just stores it)
 */
export function sendOTP(email: string): void {
  if (typeof window === "undefined") return;
  // Store OTP timestamp for rate limiting (not implemented in demo)
  localStorage.setItem(`${OTP_STORAGE_KEY}${email}`, Date.now().toString());
  console.log(`EMAIL: OTP sent to ${email}. Code: ${DEMO_OTP_CODE}`);
}

/**
 * Approve city change request
 */
export function approveCityChange(userId: string): UserProfile | null {
  const users = listUsers();
  const user = users.find((u) => u.id === userId);
  if (!user || !user.cityChangeRequested) return null;

  user.city = user.cityChangeRequested;
  user.cityChangeRequested = undefined;
  saveUsers(users);
  return user;
}

/**
 * Reject city change request
 */
export function rejectCityChange(userId: string): UserProfile | null {
  const users = listUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  user.cityChangeRequested = undefined;
  saveUsers(users);
  return user;
}

/**
 * Check if user can reapply (24h cooldown)
 */
export function canReapply(email: string): { can: boolean; hoursRemaining?: number } {
  const users = listUsers();
  const rejectedUser = users.find((u) => u.email === email && u.status === "rejected");
  if (!rejectedUser || !rejectedUser.rejectedAt) {
    return { can: true };
  }

  const rejectedAt = new Date(rejectedUser.rejectedAt).getTime();
  const now = Date.now();
  const cooldownRemaining = REJECTION_COOLDOWN_MS - (now - rejectedAt);
  
  if (cooldownRemaining > 0) {
    const hoursRemaining = Math.ceil(cooldownRemaining / (60 * 60 * 1000));
    return { can: false, hoursRemaining };
  }
  
  return { can: true };
}

/**
 * Check if user is approved
 */
export function isApproved(userId: string): boolean {
  const user = getUserById(userId);
  return user?.status === "approved";
}

/**
 * Save users to localStorage
 */
function saveUsers(users: UserProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Seed demo users
 */
function seedDemoUsers(): UserProfile[] {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  // Base questionnaire answers
  const baseAnswers: QuestionnaireAnswers = {
    q_lifestyle_1: 3,
    q_lifestyle_2: 2,
    q_lifestyle_3: 4,
    q_lifestyle_4: 4,
    q_lifestyle_5: 2,
    q_social_1: 3,
    q_social_2: 3,
    q_social_3: 3,
    q_social_4: 4,
    q_values_1: 4,
    q_values_2: 4,
    q_values_3: 4,
    q_values_4: 3,
    q_comm_1: 2,
    q_comm_2: 4,
    q_comm_3: 4,
  };

  return [
    // Approved users (Singapore) - role: user
    {
      id: "anna",
      name: "Anna",
      email: "anna@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_1: 4, q_lifestyle_2: 1 },
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    {
      id: "alex",
      name: "Alex",
      email: "alex@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_3: 3, q_social_1: 4 },
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date", "friends"] },
    },
    {
      id: "daniel",
      name: "Daniel",
      email: "daniel@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_values_1: 3, q_comm_2: 3 },
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    {
      id: "david",
      name: "David",
      email: "david@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_2: 3, q_social_4: 3 },
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
    },
    // Approved with RSVP hold (ready to pay) - role: user
    {
      id: "chris",
      name: "Chris",
      email: "chris@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: baseAnswers,
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: oneHourAgo,
      approvedAt: oneHourAgo,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
    },
    // Rejected (cooldown expired) - role: guest
    {
      id: "ethan",
      name: "Ethan",
      email: "ethan@example.com",
      city: "Hong Kong",
      cityLocked: false,
      questionnaireAnswers: baseAnswers,
      status: "rejected",
      emailVerified: true,
      role: "guest" as const,
      createdAt: twoDaysAgo,
      rejectedAt: twoDaysAgo, // Can reapply now
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    // Rejected (cooldown active) - role: guest
    {
      id: "isabella",
      name: "Isabella",
      email: "isabella@example.com",
      city: "Bangkok",
      cityLocked: false,
      questionnaireAnswers: baseAnswers,
      status: "rejected",
      emailVerified: true,
      role: "guest" as const,
      createdAt: oneHourAgo,
      rejectedAt: oneHourAgo, // Still in cooldown
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Unverified - role: guest
    {
      id: "ava",
      name: "Ava",
      email: "ava@example.com",
      city: "Tokyo",
      cityLocked: false,
      questionnaireAnswers: {},
      status: "unverified",
      emailVerified: false,
      role: "guest" as const,
      createdAt: tenMinutesAgo,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Approved with city change request - role: user
    {
      id: "emma",
      name: "Emma",
      email: "emma@example.com",
      city: "Tokyo",
      cityLocked: true,
      cityChangeRequested: "Singapore",
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_4: 3 },
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Approved (Hong Kong) - role: user
    {
      id: "james",
      name: "James",
      email: "james@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_2: 4, q_lifestyle_5: 4 },
      status: "approved",
      emailVerified: true,
      role: "user" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    // Add a host user for demo
    {
      id: "host_singapore",
      name: "Host Singapore",
      email: "host_sg@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: baseAnswers,
      status: "approved",
      emailVerified: true,
      role: "host" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    {
      id: "host_hk",
      name: "Host Hong Kong",
      email: "host_hk@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: baseAnswers,
      status: "approved",
      emailVerified: true,
      role: "host" as const,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
  ];
}

