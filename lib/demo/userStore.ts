"use client";

import { UserProfile, UserStatus, Gender, OrientationPreferences } from "@/types/user";
import { QuestionnaireAnswers } from "@/types/questionnaire";
import type { Role } from "@/types/roles";
import { userService } from "@/lib/supabase/userService";

const USERS_KEY = "ns_users";
const OTP_STORAGE_KEY = "ns_otp_"; // Prefix for OTP storage per email

// Mock OTP code (always "123456" for demo)
export const DEMO_OTP_CODE = "123456";

// 24 hours in milliseconds
const REJECTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Cache for Supabase users (to avoid repeated fetches)
let supabaseUsersCache: UserProfile[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Check if we should use Supabase
 */
function useSupabase(): boolean {
  return typeof window !== "undefined" && userService.isAvailable();
}

/**
 * Get all users (sync - localStorage with Supabase cache)
 */
export function listUsers(): UserProfile[] {
  if (typeof window === "undefined") return [];
  
  // Return cached Supabase data if fresh
  if (supabaseUsersCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return supabaseUsersCache;
  }
  
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
 * Get all users (async - Supabase with localStorage fallback)
 */
export async function listUsersAsync(): Promise<UserProfile[]> {
  if (useSupabase()) {
    try {
      const users = await userService.listUsers();
      if (users.length > 0) {
        // Update cache
        supabaseUsersCache = users;
        cacheTimestamp = Date.now();
        // Also sync to localStorage for offline access
        saveUsers(users);
        return users;
      }
    } catch (err) {
      console.warn("Failed to fetch users from Supabase, using localStorage:", err);
    }
  }
  return listUsers();
}

/**
 * Refresh user cache from Supabase
 */
export async function refreshUsersFromSupabase(): Promise<UserProfile[]> {
  if (!useSupabase()) return listUsers();
  
  try {
    const users = await userService.listUsers();
    supabaseUsersCache = users;
    cacheTimestamp = Date.now();
    saveUsers(users);
    return users;
  } catch (err) {
    console.warn("Failed to refresh from Supabase:", err);
    return listUsers();
  }
}

/**
 * MVP phone-login API (required)
 *
 * These helpers provide a clean upgrade path while staying compatible
 * with the existing demo `UserProfile` shape used elsewhere.
 */
export function upsertUser(input: {
  id: string;
  name: string;
  phone: string; // +65xxxxxxxx
  city?: string;
  role?: Role;
}): UserProfile {
  const users = listUsers();
  const now = new Date().toISOString();

  const existing = users.find((u) => u.id === input.id);
  const role = (input.role || "user") as Role;
  const city = input.city || "Singapore";

  // Keep compatibility with code expecting `email` / `status`.
  const syntheticEmail = `phone_${input.phone.replace(/\D/g, "")}@demo.local`;

  if (existing) {
    const updates: Partial<UserProfile> = {
      name: input.name,
      phone: input.phone,
      city,
      role: role as any,
      // If an older record exists, don't clobber email unless missing.
      email: existing.email || syntheticEmail,
      updatedAt: now,
      // Ensure deterministic "demo works" status
      status: (existing.status || "approved") as UserStatus,
      emailVerified: existing.emailVerified ?? true,
    };

    const updated = updateUser(existing.id, updates);
    return updated || existing;
  }

  const userProfile: UserProfile = {
    id: input.id,
    name: input.name,
    email: syntheticEmail,
    phone: input.phone,
    city,
    cityLocked: true,
    questionnaireAnswers: {},
    status: "approved",
    emailVerified: true,
    role: role as any,
    createdAt: now,
    approvedAt: now,
  };

  users.push(userProfile);
  saveUsers(users);
  return userProfile;
}

export function getUser(id: string): UserProfile | null {
  return getUserById(id);
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

// ============================================
// ASYNC SUPABASE METHODS
// ============================================

/**
 * Get user by ID (async - Supabase with localStorage fallback)
 */
export async function getUserByIdAsync(id: string): Promise<UserProfile | null> {
  if (useSupabase()) {
    try {
      const user = await userService.getUserById(id);
      if (user) return user;
    } catch (err) {
      console.warn("Failed to get user from Supabase:", err);
    }
  }
  return getUserById(id);
}

/**
 * Create user (async - Supabase with localStorage fallback)
 */
export async function createUserAsync(profile: {
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
}): Promise<UserProfile> {
  if (useSupabase()) {
    try {
      const user = await userService.createUser(profile);
      if (user) {
        // Invalidate cache
        supabaseUsersCache = null;
        return user;
      }
    } catch (err) {
      console.warn("Failed to create user in Supabase, using localStorage:", err);
    }
  }
  return createUser(profile);
}

/**
 * Update user (async - Supabase with localStorage fallback)
 */
export async function updateUserAsync(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  if (useSupabase()) {
    try {
      const user = await userService.updateUser(userId, updates);
      if (user) {
        // Invalidate cache
        supabaseUsersCache = null;
        return user;
      }
    } catch (err) {
      console.warn("Failed to update user in Supabase, using localStorage:", err);
    }
  }
  return updateUser(userId, updates);
}

/**
 * Set user status (async - Supabase with localStorage fallback)
 */
export async function setUserStatusAsync(
  userId: string,
  status: UserStatus,
  notes?: string
): Promise<UserProfile | null> {
  if (useSupabase()) {
    try {
      const user = await userService.setUserStatus(userId, status, notes);
      if (user) {
        // Invalidate cache
        supabaseUsersCache = null;
        return user;
      }
    } catch (err) {
      console.warn("Failed to set user status in Supabase, using localStorage:", err);
    }
  }
  return setUserStatus(userId, status, notes);
}

/**
 * Verify email OTP (async - Supabase with localStorage fallback)
 */
export async function verifyEmailOTPAsync(email: string, otp: string): Promise<boolean> {
  if (otp !== DEMO_OTP_CODE) {
    return false;
  }

  if (useSupabase()) {
    try {
      const success = await userService.verifyEmail(email);
      if (success) {
        supabaseUsersCache = null;
        return true;
      }
    } catch (err) {
      console.warn("Failed to verify email in Supabase, using localStorage:", err);
    }
  }
  return verifyEmailOTP(email, otp);
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

