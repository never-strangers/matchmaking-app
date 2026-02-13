import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import {
  CITY_VALUES,
  GENDER_VALUES,
  ATTRACTED_TO_VALUES,
  MIN_AGE,
} from "@/lib/constants/profileOptions";
import type { ProfileUpdateInput } from "@/types/profile";

const MAX_LENGTHS = {
  username: 50,
  full_name: 100,
  instagram: 100,
  reason: 500,
};

function isValidDate(s: string | null): boolean {
  if (!s || !s.trim()) return true;
  const d = new Date(s);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s.slice(0, 10);
}

function isAtLeast18(dob: string | null): boolean {
  if (!dob || !dob.trim()) return true;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= MIN_AGE;
}

function normalizeInstagram(val: string | null): string | null {
  if (!val || !val.trim()) return null;
  const t = val.trim();
  // Strip @ and URL prefix to store handle
  const handle = t
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .slice(0, MAX_LENGTHS.instagram);
  return handle || null;
}

function normalizePhoneE164(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const digits = String(raw).trim().replace(/[\s\-\.]/g, "").replace(/\D/g, "");
  return digits.length ? `+${digits}` : null;
}

function isValidPhoneE164(e164: string): boolean {
  const digits = e164.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ProfileUpdateInput;
  try {
    body = (await req.json()) as ProfileUpdateInput;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const errors: string[] = [];
  if (body.dob !== undefined && body.dob !== null && !isValidDate(body.dob)) {
    errors.push("Invalid date of birth format (use YYYY-MM-DD)");
  }
  if (
    body.dob !== undefined &&
    body.dob !== null &&
    body.dob.trim() &&
    !isAtLeast18(body.dob)
  ) {
    errors.push(`You must be at least ${MIN_AGE} years old`);
  }
  if (
    body.city !== undefined &&
    body.city !== null &&
    body.city.trim() &&
    !CITY_VALUES.includes(body.city.trim() as (typeof CITY_VALUES)[number])
  ) {
    errors.push("City must be selected from the predefined list");
  }
  if (
    body.gender !== undefined &&
    body.gender !== null &&
    body.gender.trim() &&
    !GENDER_VALUES.includes(body.gender.trim() as (typeof GENDER_VALUES)[number])
  ) {
    errors.push("Gender must be Male or Female");
  }
  if (
    body.attracted_to !== undefined &&
    body.attracted_to !== null &&
    body.attracted_to.trim() &&
    !ATTRACTED_TO_VALUES.includes(
      body.attracted_to.trim() as (typeof ATTRACTED_TO_VALUES)[number]
    )
  ) {
    errors.push("Attracted to must be Men or Women");
  }
  if (
    body.username !== undefined &&
    body.username !== null &&
    body.username.length > MAX_LENGTHS.username
  ) {
    errors.push(`Username max ${MAX_LENGTHS.username} characters`);
  }
  if (
    body.full_name !== undefined &&
    body.full_name !== null &&
    body.full_name.length > MAX_LENGTHS.full_name
  ) {
    errors.push(`Full name max ${MAX_LENGTHS.full_name} characters`);
  }
  if (
    body.instagram !== undefined &&
    body.instagram !== null &&
    body.instagram.length > MAX_LENGTHS.instagram
  ) {
    errors.push(`Instagram max ${MAX_LENGTHS.instagram} characters`);
  }
  if (
    body.reason !== undefined &&
    body.reason !== null &&
    body.reason.length > MAX_LENGTHS.reason
  ) {
    errors.push(`Reason max ${MAX_LENGTHS.reason} characters`);
  }
  if (body.phone_e164 !== undefined && body.phone_e164 !== null) {
    const normalized = normalizePhoneE164(body.phone_e164);
    if (normalized && !isValidPhoneE164(normalized)) {
      errors.push("Phone must be 8–15 digits (e.g. +65 9123 4567)");
    }
  }

  if (errors.length > 0) {
    return new Response(
      JSON.stringify({ error: errors.join(". ") }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const profileId = auth.profile_id;
  const supabase = getServiceSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email || null;
  if (body.phone_e164 !== undefined) {
    const normalized = normalizePhoneE164(body.phone_e164);
    updates.phone_e164 = normalized;
    updates.phone = normalized;
  }
  if (body.username !== undefined) updates.username = body.username?.trim() || null;
  if (body.full_name !== undefined) updates.full_name = body.full_name?.trim() || null;
  if (body.city !== undefined) updates.city = body.city?.trim() || null;
  if (body.dob !== undefined) updates.dob = body.dob?.trim() || null;
  if (body.gender !== undefined) updates.gender = body.gender?.trim() || null;
  if (body.attracted_to !== undefined)
    updates.attracted_to = body.attracted_to?.trim() || null;
  if (body.instagram !== undefined)
    updates.instagram = normalizeInstagram(body.instagram);
  if (body.reason !== undefined) updates.reason = body.reason?.trim() || null;

  // Keep display_name and name in sync with full_name for compatibility
  if (body.full_name !== undefined) {
    updates.display_name = body.full_name?.trim() || null;
    updates.name = body.full_name?.trim() || null;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select(
      "id, email, phone_e164, username, full_name, instagram, city, dob, gender, attracted_to, reason, status, created_at, updated_at, avatar_path, avatar_updated_at"
    )
    .single();

  if (error) {
    console.error("Profile update error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({ ok: true, profile: data });
}
