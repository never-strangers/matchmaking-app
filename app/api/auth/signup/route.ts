import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
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
    const body = await request.json().catch(() => ({}));
    const {
      email,
      password,
      dob,
      gender,
      preferred_language,
      instagram,
      reason,
    } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const dobError = validateDob21Plus(dob);
    if (dobError) {
      return NextResponse.json({ error: dobError }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message || "Signup failed." },
        { status: 400 }
      );
    }
    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Signup failed." },
        { status: 500 }
      );
    }

    const normalizedGender = normalizeGender(gender);
    const lang =
      typeof preferred_language === "string"
        ? preferred_language.trim().toLowerCase()
        : "";
    const profileRow = {
      id: userId,
      dob: new Date(dob).toISOString().slice(0, 10),
      gender:
        normalizedGender && VALID_GENDERS.has(normalizedGender)
          ? normalizedGender
          : null,
      preferred_language: lang && VALID_LANGUAGES.has(lang) ? lang : null,
      instagram:
        typeof instagram === "string" ? instagram.trim() || null : null,
      reason: typeof reason === "string" ? reason.trim() || null : null,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(profileRow, { onConflict: "id" });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "Profile save failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e) {
    return NextResponse.json(
      { error: "An error occurred during signup." },
      { status: 500 }
    );
  }
}
