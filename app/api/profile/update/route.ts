import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateDob21Plus,
  normalizeGender,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";

const VALID_LANGUAGES = new Set(
  PREFERRED_LANGUAGE_OPTIONS.map((o) => o.value)
);
const VALID_GENDERS = new Set(GENDER_OPTIONS.map((o) => o.value));

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to update your profile." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      dob,
      gender,
      preferred_language,
      instagram,
      reason,
      username: _username, // intentionally ignore for WP migration compat
    } = body;

    if (dob !== undefined && dob !== null) {
      const dobError = validateDob21Plus(dob);
      if (dobError) {
        return NextResponse.json({ error: dobError }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};

    if (dob !== undefined) {
      updates.dob = dob ? new Date(dob).toISOString().slice(0, 10) : null;
    }
    if (gender !== undefined) {
      const normalized = normalizeGender(gender);
      if (normalized && VALID_GENDERS.has(normalized)) {
        updates.gender = normalized;
      } else if (gender === null || gender === "") {
        updates.gender = null;
      }
    }
    if (preferred_language !== undefined) {
      const lang =
        typeof preferred_language === "string"
          ? preferred_language.trim().toLowerCase()
          : "";
      if (lang === "" || VALID_LANGUAGES.has(lang)) {
        updates.preferred_language = lang || null;
      }
    }
    if (instagram !== undefined) {
      updates.instagram =
        typeof instagram === "string" ? instagram.trim() || null : null;
    }
    if (reason !== undefined) {
      updates.reason =
        typeof reason === "string" ? reason.trim() || null : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, ...updates, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update profile." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "An error occurred while updating your profile." },
      { status: 500 }
    );
  }
}
