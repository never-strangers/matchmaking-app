import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

type Body = {
  question_id?: string;
  value?: number;
};

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const eventId = context.params.id;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const questionId = body.question_id;
  const value = body.value;

  if (!questionId || !(value === 1 || value === 2 || value === 3 || value === 4)) {
    return new Response("Invalid payload", { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from("answers")
    .upsert(
      {
        event_id: eventId,
        question_id: questionId,
        profile_id: session.profile_id,
        answer: { value },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,question_id,profile_id" }
    );

  if (error) {
    console.error("Error upserting answer:", error);
    return new Response("Failed to save answer", { status: 500 });
  }

  return Response.json({ ok: true });
}

