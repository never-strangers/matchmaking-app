import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { verifySessionToken } from "@/lib/auth/sessionToken";

type LikeBody = { to_profile_id?: string };

function buildWhatsAppUrl(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const eventId = (await params).id;
  if (!eventId) {
    return new Response("Missing event id", { status: 400 });
  }

  let body: LikeBody;
  try {
    body = (await req.json()) as LikeBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const toProfileId = body.to_profile_id;
  if (!toProfileId) {
    return new Response("Missing to_profile_id", { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const { error: insertError } = await supabase.from("likes").upsert(
    {
      event_id: eventId,
      from_profile_id: session.profile_id,
      to_profile_id: toProfileId,
    },
    { onConflict: "event_id,from_profile_id,to_profile_id" }
  );

  if (insertError) {
    console.error("Like upsert error:", insertError);
    return new Response("Failed to record like", { status: 500 });
  }

  const { data: reverseLike } = await supabase
    .from("likes")
    .select("from_profile_id")
    .eq("event_id", eventId)
    .eq("from_profile_id", toProfileId)
    .eq("to_profile_id", session.profile_id)
    .maybeSingle();

  const mutual = !!reverseLike;

  let whatsapp_url: string | undefined;
  if (mutual) {
    const { data: toProfile } = await supabase
      .from("profiles")
      .select("phone_e164")
      .eq("id", toProfileId)
      .maybeSingle();
    if (toProfile?.phone_e164) {
      whatsapp_url = buildWhatsAppUrl(toProfile.phone_e164);
    }
  }

  return Response.json({ mutual, whatsapp_url });
}
