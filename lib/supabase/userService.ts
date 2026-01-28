import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UserProfile, UserStatus, Gender, OrientationPreferences } from "@/types/user";
import { QuestionnaireAnswers } from "@/types/questionnaire";
import type { Role } from "@/types/roles";

// Supabase row type (snake_case)
interface ProfileRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  city: string;
  city_locked: boolean;
  city_change_requested?: string | null;
  orientation?: OrientationPreferences | null;
  profile_photo_url?: string | null;
  questionnaire_answers: QuestionnaireAnswers;
  status: string;
  email_verified: boolean;
  role: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
}

// Convert Supabase row to UserProfile (camelCase)
function rowToUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    age: row.age || undefined,
    gender: row.gender as Gender | undefined,
    city: row.city,
    cityLocked: row.city_locked,
    cityChangeRequested: row.city_change_requested || undefined,
    orientation: row.orientation || undefined,
    profilePhotoUrl: row.profile_photo_url || undefined,
    questionnaireAnswers: row.questionnaire_answers || {},
    status: row.status as UserStatus,
    emailVerified: row.email_verified,
    role: row.role as Role,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
    approvedAt: row.approved_at || undefined,
    rejectedAt: row.rejected_at || undefined,
  };
}

// Convert UserProfile to Supabase row format
function userProfileToRow(profile: Partial<UserProfile> & { id: string }): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = { id: profile.id };

  if (profile.name !== undefined) row.name = profile.name;
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.phone !== undefined) row.phone = profile.phone || null;
  if (profile.age !== undefined) row.age = profile.age || null;
  if (profile.gender !== undefined) row.gender = profile.gender || null;
  if (profile.city !== undefined) row.city = profile.city;
  if (profile.cityLocked !== undefined) row.city_locked = profile.cityLocked;
  if (profile.cityChangeRequested !== undefined) row.city_change_requested = profile.cityChangeRequested || null;
  if (profile.orientation !== undefined) row.orientation = profile.orientation || null;
  if (profile.profilePhotoUrl !== undefined) row.profile_photo_url = profile.profilePhotoUrl || null;
  if (profile.questionnaireAnswers !== undefined) row.questionnaire_answers = profile.questionnaireAnswers;
  if (profile.status !== undefined) row.status = profile.status;
  if (profile.emailVerified !== undefined) row.email_verified = profile.emailVerified;
  if (profile.role !== undefined) row.role = profile.role;
  if (profile.notes !== undefined) row.notes = profile.notes || null;
  if (profile.createdAt !== undefined) row.created_at = profile.createdAt;
  if (profile.updatedAt !== undefined) row.updated_at = profile.updatedAt || null;
  if (profile.approvedAt !== undefined) row.approved_at = profile.approvedAt || null;
  if (profile.rejectedAt !== undefined) row.rejected_at = profile.rejectedAt || null;

  return row;
}

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Supabase env vars not configured, using localStorage fallback");
    return null;
  }

  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

/**
 * Supabase User Service
 * Async methods for user operations with Supabase
 */
export const userService = {
  /**
   * List all users from Supabase
   */
  async listUsers(): Promise<UserProfile[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error listing users:", error);
      return [];
    }

    return (data || []).map(rowToUserProfile);
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error getting user:", error);
      }
      return null;
    }

    return data ? rowToUserProfile(data) : null;
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error getting user by email:", error);
      }
      return null;
    }

    return data ? rowToUserProfile(data) : null;
  },

  /**
   * Create a new user
   */
  async createUser(profile: {
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
  }): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      ...profile,
      cityLocked: false,
      status: "unverified",
      emailVerified: false,
      role: "guest",
      createdAt: now,
    };

    const row = userProfileToRow(newProfile);

    const { data, error } = await supabase
      .from("profiles")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw new Error(error.message);
    }

    return data ? rowToUserProfile(data) : null;
  },

  /**
   * Update user profile
   */
  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const row = userProfileToRow({ id, ...updates });
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return null;
    }

    return data ? rowToUserProfile(data) : null;
  },

  /**
   * Upsert user (create or update)
   */
  async upsertUser(profile: Partial<UserProfile> & { id: string; name: string; email: string; city: string }): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const now = new Date().toISOString();
    const fullProfile: UserProfile = {
      cityLocked: false,
      questionnaireAnswers: {},
      status: "unverified",
      emailVerified: false,
      role: "guest",
      createdAt: now,
      ...profile,
    };

    const row = userProfileToRow(fullProfile);

    const { data, error } = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting user:", error);
      return null;
    }

    return data ? rowToUserProfile(data) : null;
  },

  /**
   * Set user status
   */
  async setUserStatus(id: string, status: UserStatus, notes?: string): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const now = new Date().toISOString();
    const updates: Partial<ProfileRow> = {
      status,
      updated_at: now,
    };

    if (status === "approved") {
      updates.approved_at = now;
      updates.rejected_at = null;
      updates.city_locked = true;
    } else if (status === "rejected") {
      updates.rejected_at = now;
      updates.approved_at = null;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error setting user status:", error);
      return null;
    }

    return data ? rowToUserProfile(data) : null;
  },

  /**
   * Verify email (mark as verified and set pending_approval)
   */
  async verifyEmail(email: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase
      .from("profiles")
      .update({
        email_verified: true,
        status: "pending_approval",
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .eq("status", "unverified");

    if (error) {
      console.error("Error verifying email:", error);
      return false;
    }

    return true;
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error);
      return false;
    }

    return true;
  },

  /**
   * Check if Supabase is available
   */
  isAvailable(): boolean {
    return getSupabase() !== null;
  },
};
