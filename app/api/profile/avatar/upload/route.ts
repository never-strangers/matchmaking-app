import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const profileId = auth.profile_id;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid form data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return new Response(
      JSON.stringify({ error: "No file provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Max 5MB." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: "Invalid file type. Use JPG, PNG, or WebP." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const ext = EXT_MAP[file.type] ?? "jpg";
  const path = `${profileId}/${crypto.randomUUID()}.${ext}`;

  const supabase = getServiceSupabaseClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Avatar upload error:", uploadError);
    return new Response(
      JSON.stringify({ error: "Failed to upload. Try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: path, avatar_updated_at: now })
    .eq("id", profileId);

  if (updateError) {
    console.error("Profile avatar update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to save avatar." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({
    ok: true,
    avatar_path: path,
    avatar_updated_at: now,
  });
}
