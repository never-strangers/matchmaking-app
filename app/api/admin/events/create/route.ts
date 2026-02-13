import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export type CreateEventBody = {
  name: string;
  description?: string;
  start_at?: string;
  city?: string;
};

const DEFAULT_QUESTIONS: { prompt: string; type: string; options: null; weight: number; order_index: number }[] = [
  { prompt: "I enjoy socialising with colleagues outside of work.", type: "scale", options: null, weight: 2, order_index: 1 },
  { prompt: "Work culture in Singapore often blurs personal identity with career success.", type: "scale", options: null, weight: 2, order_index: 2 },
  { prompt: "Music and nightlife help me disconnect from work stress.", type: "scale", options: null, weight: 2, order_index: 3 },
  { prompt: 'I prefer social events where "no work talk" is encouraged.', type: "scale", options: null, weight: 2, order_index: 4 },
  { prompt: "I feel pressure in Singapore to keep up professionally or financially.", type: "scale", options: null, weight: 2, order_index: 5 },
  { prompt: "I'm comfortable meeting new people through parties or nightlife events.", type: "scale", options: null, weight: 2, order_index: 6 },
  { prompt: "I value experiences (music, memories, vibes) more than status or titles.", type: "scale", options: null, weight: 2, order_index: 7 },
  { prompt: "I enjoy themed events (e.g. throwbacks, Y2K, nostalgia) more than generic clubbing.", type: "scale", options: null, weight: 2, order_index: 8 },
  { prompt: "I feel more myself in social settings than in professional ones.", type: "scale", options: null, weight: 2, order_index: 9 },
  { prompt: "I would trade some career growth for better balance and freedom in life.", type: "scale", options: null, weight: 2, order_index: 10 },
  { prompt: "I feel closer to people after spending time together in person.", type: "scale", options: null, weight: 2, order_index: 11 },
  { prompt: "I prefer a small circle of close connections over many casual ones.", type: "scale", options: null, weight: 2, order_index: 12 },
  { prompt: "Shared experiences are more important to me than constant online communication.", type: "scale", options: null, weight: 2, order_index: 13 },
  { prompt: "Emotional safety matters more to me than instant chemistry.", type: "scale", options: null, weight: 2, order_index: 14 },
  { prompt: "I enjoy deep conversations more than surface-level small talk.", type: "scale", options: null, weight: 2, order_index: 15 },
  { prompt: "Consistency is important to me in relationships.", type: "scale", options: null, weight: 2, order_index: 16 },
  { prompt: "I feel comfortable being myself around people I trust.", type: "scale", options: null, weight: 2, order_index: 17 },
  { prompt: "I value people who show up and keep their word.", type: "scale", options: null, weight: 2, order_index: 18 },
  { prompt: "I'm open to building meaningful connections, not just having fun.", type: "scale", options: null, weight: 2, order_index: 19 },
  { prompt: "I believe strong relationships are built over time, not instantly.", type: "scale", options: null, weight: 2, order_index: 20 },
];

async function createEventWithDirectInserts(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  name: string,
  description: string | null,
  start_at: string | null,
  city: string | null
): Promise<string | null> {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title: name,
      description: description || null,
      start_at: start_at || null,
      city: city || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (eventError || !event) {
    console.error("Error inserting event:", eventError);
    return null;
  }

  const eventId = String(event.id);
  const questionRows = DEFAULT_QUESTIONS.map((q) => ({
    event_id: eventId,
    prompt: q.prompt,
    type: q.type,
    options: q.options,
    weight: q.weight,
    order_index: q.order_index,
  }));

  const { error: questionsError } = await supabase.from("questions").insert(questionRows);

  if (questionsError) {
    console.error("Error inserting questions:", questionsError);
    await supabase.from("events").delete().eq("id", eventId);
    return null;
  }

  return eventId;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  let body: CreateEventBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return new Response("Name is required", { status: 400 });
  }

  if (body.start_at) {
    const startDate = new Date(body.start_at);
    if (isNaN(startDate.getTime()) || startDate < new Date()) {
      return new Response(
        JSON.stringify({ message: "Start date cannot be in the past" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const supabase = getServiceSupabaseClient();
  const description = body.description?.trim() || null;
  const startAt = body.start_at || null;
  const city = body.city?.trim() || null;

  // Try RPC first (when migration 009 is applied)
  const { data: eventId, error } = await supabase.rpc("create_event_with_default_questions", {
    p_name: name,
    p_description: description,
    p_start_at: startAt,
    p_city: city,
  });

  if (!error) {
    return Response.json({ ok: true, event_id: eventId });
  }

  // PGRST202 = function not found; fallback to direct inserts (works without migration 009)
  if (error.code === "PGRST202") {
    const id = await createEventWithDirectInserts(supabase, name, description, startAt, city);
    if (id) {
      return Response.json({ ok: true, event_id: id });
    }
    return new Response(JSON.stringify({ message: "Failed to create event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.error("Error creating event:", error);
  return new Response(error.message || "Failed to create event", { status: 500 });
}
