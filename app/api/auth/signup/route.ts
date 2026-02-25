import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
import {
  validateDob21Plus,
  parseDateOfBirth,
  normalizeGender,
  GENDER_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
} from "@/lib/profile-validation";

const VALID_LANGUAGES = new Set<string>(
  PREFERRED_LANGUAGE_OPTIONS.map((o) => o.value)
);
const VALID_GENDERS = new Set(GENDER_OPTIONS.map((o) => o.value));

function extractMissingColumn(message: string | undefined): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      email,
      password,
      first_name,
      last_name,
      city: cityBody,
      dob,
      gender,
      attracted_to: attractedToBody,
      looking_for: lookingForBody,
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

    const normalizedDob = dob ? (parseDateOfBirth(dob) ?? (!Number.isNaN(new Date(dob).getTime()) ? new Date(dob).toISOString().slice(0, 10) : null)) : null;
    const dobError = validateDob21Plus(normalizedDob ?? dob);
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
    const first = typeof first_name === "string" ? first_name.trim() : "";
    const last = typeof last_name === "string" ? last_name.trim() : "";
    const fullName = [first, last].filter(Boolean).join(" ") || email.trim().split("@")[0]?.slice(0, 50) || `user_${userId.slice(0, 8)}`;
    const city =
      typeof cityBody === "string" && cityBody.trim()
        ? cityBody.trim().toLowerCase().slice(0, 20)
        : "sg";
    const attractedToArr = Array.isArray(attractedToBody)
      ? attractedToBody.filter((v) => typeof v === "string" && ["men", "women"].includes(String(v).toLowerCase()))
      : typeof attractedToBody === "string" && attractedToBody.trim()
        ? attractedToBody.split(/[,;]/).map((v) => v.trim().toLowerCase()).filter((v) => v === "men" || v === "women")
        : [];
    const attractedToStr = attractedToArr.length ? attractedToArr.join(",") : null;
    const lookingForArr = Array.isArray(lookingForBody)
      ? lookingForBody.filter((v) => typeof v === "string" && ["friends", "date"].includes(String(v).toLowerCase()))
      : [];

    const profileRow = {
      id: userId,
      name: fullName.slice(0, 100),
      display_name: fullName.slice(0, 100),
      full_name: fullName.slice(0, 100),
      email: email.trim().toLowerCase(),
      city,
      status: "pending_verification",
      dob: normalizedDob ?? (dob ? new Date(dob).toISOString().slice(0, 10) : null),
      gender:
        normalizedGender && VALID_GENDERS.has(normalizedGender)
          ? normalizedGender
          : null,
      attracted_to: attractedToStr,
      preferred_language: lang && VALID_LANGUAGES.has(lang) ? lang : null,
      instagram:
        typeof instagram === "string" ? instagram.trim() || null : null,
      reason: typeof reason === "string" ? reason.trim() || null : null,
      updated_at: new Date().toISOString(),
    };
    if (lookingForArr.length > 0) {
      (profileRow as Record<string, unknown>).orientation = { lookingFor: lookingForArr };
    }

    const fallbackRow: Record<string, unknown> = { ...profileRow };
    let profileError: { message?: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase
        .from("profiles")
        .upsert(fallbackRow, { onConflict: "id" });
      profileError = error as { message?: string } | null;
      if (!profileError) break;

      const missingColumn = extractMissingColumn(profileError.message);
      if (!missingColumn || !(missingColumn in fallbackRow)) break;
      delete fallbackRow[missingColumn];
    }

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
