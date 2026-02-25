import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

/** Extract column name from Supabase/PostgREST "column missing" style errors. */
function extractMissingColumn(message: string | undefined): string | null {
  if (!message) return null;
  const m1 = message.match(/Could not find the '([^']+)' column/i);
  if (m1) return m1[1];
  const m2 = message.match(/column "([^"]+)" of relation "[^"]*" does not exist/i);
  if (m2) return m2[1];
  const m3 = message.match(/Unknown column '([^']+)'/i);
  if (m3) return m3[1];
  return null;
}

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
      first_name,
      last_name,
      city: cityBody,
      dob,
      gender,
      attracted_to: attractedToBody,
      looking_for: lookingForBody,
      preferred_language,
      instagram,
      reason: reasonBody,
      reasons: _reasons, // accept typo from client
      username: _username, // intentionally ignore for WP migration compat
    } = body;
    const reason = reasonBody ?? _reasons;

    if (dob !== undefined && dob !== null) {
      const dobError = validateDob21Plus(dob);
      if (dobError) {
        return NextResponse.json({ error: dobError }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};

    if (first_name !== undefined || last_name !== undefined) {
      const first = typeof first_name === "string" ? first_name.trim() : "";
      const last = typeof last_name === "string" ? last_name.trim() : "";
      const fullName = [first, last].filter(Boolean).join(" ") || undefined;
      if (fullName) {
        updates.full_name = fullName.slice(0, 100);
        updates.display_name = fullName.slice(0, 100);
        updates.name = fullName.slice(0, 100);
      }
    }
    if (cityBody !== undefined) {
      const city =
        typeof cityBody === "string" && cityBody.trim()
          ? cityBody.trim().toLowerCase().slice(0, 20)
          : null;
      updates.city = city;
    }
    if (attractedToBody !== undefined) {
      const arr = Array.isArray(attractedToBody)
        ? attractedToBody.filter((v) => typeof v === "string" && ["men", "women"].includes(String(v).toLowerCase()))
        : typeof attractedToBody === "string" && attractedToBody.trim()
          ? attractedToBody.split(/[,;]/).map((v) => v.trim().toLowerCase()).filter((v) => v === "men" || v === "women")
          : [];
      updates.attracted_to = arr.length ? arr.join(",") : null;
    }
    if (lookingForBody !== undefined) {
      const arr = Array.isArray(lookingForBody)
        ? lookingForBody.filter((v) => typeof v === "string" && ["friends", "date"].includes(String(v).toLowerCase()))
        : [];
      updates.orientation = arr.length ? { lookingFor: arr } : null;
    }
    if (dob !== undefined) {
      const normalized = dob
        ? (parseDateOfBirth(dob) ?? (!Number.isNaN(new Date(dob).getTime()) ? new Date(dob).toISOString().slice(0, 10) : null))
        : null;
      updates.dob = normalized;
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

    const updated_at = new Date().toISOString();
    const updatesWithTimestamp: Record<string, unknown> = { ...updates, updated_at };

    // Ensure DOB is stored as date-only string for the DB (profiles.dob is DATE type)
    if (updatesWithTimestamp.dob && typeof updatesWithTimestamp.dob === "string") {
      updatesWithTimestamp.dob = updatesWithTimestamp.dob.slice(0, 10);
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      const updatePayload: Record<string, unknown> = { ...updatesWithTimestamp };
      let updateError: { message?: string } | null = null;

      // Retry a few times, dropping unknown columns from payload (schema cache lag / older DBs).
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", user.id);
        updateError = error as { message?: string } | null;
        if (!updateError) break;
        const missingColumn = extractMissingColumn(updateError.message);
        if (!missingColumn || !(missingColumn in updatePayload)) break;
        delete updatePayload[missingColumn];
      }

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update profile." },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // No profile row yet: insert with required columns (name, email, city are NOT NULL)
    const fallbackRow: Record<string, unknown> = {
      id: user.id,
      name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      city: "sg",
      ...updatesWithTimestamp,
      updated_at,
    };
    let error: { message?: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await supabase
        .from("profiles")
        .upsert(fallbackRow, { onConflict: "id" });
      error = result.error as { message?: string } | null;
      if (!error) break;
      const missingColumn = extractMissingColumn(error.message);
      if (!missingColumn || !(missingColumn in fallbackRow)) break;
      delete fallbackRow[missingColumn];
    }

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update profile." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An error occurred while updating your profile.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
