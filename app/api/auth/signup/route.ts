import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { enqueueEmail } from "@/lib/email/send";
import { applicationReceivedEmail } from "@/lib/email/templates";
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
    // Accept both multipart/form-data (with photo) and application/json
    let body: Record<string, unknown> = {};
    let photoFile: File | null = null;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      for (const [key, value] of fd.entries()) {
        if (key === "photo" && value instanceof File && value.size > 0) {
          photoFile = value;
        } else {
          body[key] = value;
        }
      }
    } else {
      body = await request.json().catch(() => ({}));
    }
    const raw = body as Record<string, unknown>;
    const email         = typeof raw.email          === "string" ? raw.email.trim()          : "";
    const password      = typeof raw.password       === "string" ? raw.password               : "";
    const first_name    = typeof raw.first_name     === "string" ? raw.first_name             : "";
    const last_name     = typeof raw.last_name      === "string" ? raw.last_name              : "";
    const cityBody      = typeof raw.city           === "string" ? raw.city                   : "";
    const dobRaw        = typeof raw.dob            === "string" ? raw.dob.trim()             : "";
    const gender        = typeof raw.gender         === "string" ? raw.gender                 : "";
    const attractedToBody = raw.attracted_to;
    const lookingForBody  = raw.looking_for;
    const preferred_language = typeof raw.preferred_language === "string" ? raw.preferred_language : "";
    const instagram     = typeof raw.instagram      === "string" ? raw.instagram.trim()       : "";
    const reason        = typeof raw.reason         === "string" ? raw.reason.trim()          : "";
    const phone_e164    = typeof raw.phone_e164     === "string" ? raw.phone_e164.trim()      : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const normalizedDob = dobRaw ? (parseDateOfBirth(dobRaw) ?? (!Number.isNaN(new Date(dobRaw).getTime()) ? new Date(dobRaw).toISOString().slice(0, 10) : null)) : null;
    const dobError = validateDob21Plus(normalizedDob ?? dobRaw);
    if (dobError) {
      return NextResponse.json({ error: dobError }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Prevent re-application with the same email or Instagram if a profile
    // has already been explicitly rejected.
    const normalizedEmail = email.trim().toLowerCase();
    const instagramValue = instagram;

    const rejectionFilters: string[] = [];
    if (normalizedEmail) {
      rejectionFilters.push(`email.eq.${normalizedEmail}`);
    }
    if (instagramValue) {
      rejectionFilters.push(`instagram.eq.${instagramValue}`);
    }

    if (rejectionFilters.length > 0) {
      const { data: rejectedExisting } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("status", "rejected")
        .or(rejectionFilters.join(","))
        .maybeSingle();

      if (rejectedExisting) {
        return NextResponse.json(
          {
            error:
              "This account was previously rejected. You can’t reapply with the same email or Instagram handle.",
          },
          { status: 409 }
        );
      }
    }
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
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
    const parseStrArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
      if (typeof v === "string" && v.trim().startsWith("[")) {
        try { return JSON.parse(v); } catch { /* fall through */ }
      }
      if (typeof v === "string" && v.trim()) return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      return [];
    };
    const attractedToArr = parseStrArray(attractedToBody)
      .filter((v) => ["men", "women"].includes(v.toLowerCase()));
    const attractedToStr = attractedToArr.length ? attractedToArr.join(",") : null;
    const lookingForArr = parseStrArray(lookingForBody)
      .filter((v) => ["friends", "date"].includes(v.toLowerCase()));

    const profileRow = {
      id: userId,
      name: fullName.slice(0, 100),
      display_name: fullName.slice(0, 100),
      full_name: fullName.slice(0, 100),
      email: email.trim().toLowerCase(),
      city,
      status: "pending_verification",
      dob: normalizedDob ?? (dobRaw ? new Date(dobRaw).toISOString().slice(0, 10) : null),
      gender:
        normalizedGender && VALID_GENDERS.has(normalizedGender)
          ? normalizedGender
          : null,
      attracted_to: attractedToStr,
      preferred_language: lang && VALID_LANGUAGES.has(lang) ? lang : null,
      instagram: instagram || null,
      reason: reason || null,
      phone_e164: phone_e164 || null,
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

    // Upload avatar if provided
    if (photoFile) {
      const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      const EXT_MAP: Record<string, string> = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };
      if (ALLOWED.includes(photoFile.type) && photoFile.size <= 5 * 1024 * 1024) {
        try {
          const ext = EXT_MAP[photoFile.type] ?? "jpg";
          const avatarPath = `${userId}/${crypto.randomUUID()}.${ext}`;
          const buffer = Buffer.from(await photoFile.arrayBuffer());
          const { error: uploadErr } = await supabase.storage
            .from("avatars")
            .upload(avatarPath, buffer, { contentType: photoFile.type, upsert: false });
          if (!uploadErr) {
            const now = new Date().toISOString();
            await supabase.from("profiles").update({ avatar_path: avatarPath, avatar_updated_at: now }).eq("id", userId);
          }
        } catch {
          // Non-fatal: profile created without avatar
        }
      }
    }

    // Fire-and-forget: welcome email
    void enqueueEmail(
      `application-received:${userId}`,
      "application_received",
      normalizedEmail,
      applicationReceivedEmail(first)
    );

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e) {
    return NextResponse.json(
      { error: "An error occurred during signup." },
      { status: 500 }
    );
  }
}
