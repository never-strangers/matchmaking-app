import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { QuestionnaireAnswers } from "@/types/questionnaire";

// Demo users to seed into Supabase
function getDemoUsers() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Base questionnaire answers
  const baseAnswers: QuestionnaireAnswers = {
    q_lifestyle_1: 3,
    q_lifestyle_2: 2,
    q_lifestyle_3: 4,
    q_lifestyle_4: 4,
    q_lifestyle_5: 2,
    q_social_1: 3,
    q_social_2: 3,
    q_social_3: 3,
    q_social_4: 4,
    q_values_1: 4,
    q_values_2: 4,
    q_values_3: 4,
    q_values_4: 3,
    q_comm_1: 2,
    q_comm_2: 4,
    q_comm_3: 4,
  };

  return [
    // Approved users (Singapore) - role: user
    {
      id: "anna",
      name: "Anna",
      email: "anna@example.com",
      city: "Singapore",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_lifestyle_1: 4, q_lifestyle_2: 1 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    {
      id: "alex",
      name: "Alex",
      email: "alex@example.com",
      city: "Singapore",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_lifestyle_3: 3, q_social_1: 4 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date", "friends"] },
    },
    {
      id: "daniel",
      name: "Daniel",
      email: "daniel@example.com",
      city: "Singapore",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_values_1: 3, q_comm_2: 3 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    {
      id: "david",
      name: "David",
      email: "david@example.com",
      city: "Singapore",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_lifestyle_2: 3, q_social_4: 3 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
    },
    // Approved with RSVP hold (ready to pay) - role: user
    {
      id: "chris",
      name: "Chris",
      email: "chris@example.com",
      city: "Hong Kong",
      city_locked: true,
      questionnaire_answers: baseAnswers,
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: oneHourAgo,
      approved_at: oneHourAgo,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
    },
    // Rejected (cooldown expired) - role: guest
    {
      id: "ethan",
      name: "Ethan",
      email: "ethan@example.com",
      city: "Hong Kong",
      city_locked: false,
      questionnaire_answers: baseAnswers,
      status: "rejected",
      email_verified: true,
      role: "guest",
      created_at: twoDaysAgo,
      rejected_at: twoDaysAgo, // Can reapply now
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    // Rejected (cooldown active) - role: guest
    {
      id: "isabella",
      name: "Isabella",
      email: "isabella@example.com",
      city: "Bangkok",
      city_locked: false,
      questionnaire_answers: baseAnswers,
      status: "rejected",
      email_verified: true,
      role: "guest",
      created_at: oneHourAgo,
      rejected_at: oneHourAgo, // Still in cooldown
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Unverified - role: guest
    {
      id: "ava",
      name: "Ava",
      email: "ava@example.com",
      city: "Tokyo",
      city_locked: false,
      questionnaire_answers: {},
      status: "unverified",
      email_verified: false,
      role: "guest",
      created_at: tenMinutesAgo,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Approved with city change request - role: user
    {
      id: "emma",
      name: "Emma",
      email: "emma@example.com",
      city: "Tokyo",
      city_locked: true,
      city_change_requested: "Singapore",
      questionnaire_answers: { ...baseAnswers, q_lifestyle_4: 3 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Approved (Hong Kong) - role: user
    {
      id: "james",
      name: "James",
      email: "james@example.com",
      city: "Hong Kong",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_lifestyle_2: 4, q_lifestyle_5: 4 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    // Add a host user for demo
    {
      id: "host_singapore",
      name: "Host Singapore",
      email: "host_sg@example.com",
      city: "Singapore",
      city_locked: true,
      questionnaire_answers: baseAnswers,
      status: "approved",
      email_verified: true,
      role: "host",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
    },
    {
      id: "host_hk",
      name: "Host Hong Kong",
      email: "host_hk@example.com",
      city: "Hong Kong",
      city_locked: true,
      questionnaire_answers: baseAnswers,
      status: "approved",
      email_verified: true,
      role: "host",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
    },
    // Additional Hong Kong users for matching demos
    {
      id: "sarah",
      name: "Sarah",
      email: "sarah@example.com",
      city: "Hong Kong",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_lifestyle_1: 3, q_social_2: 4, q_values_1: 3 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["friends", "date"] },
    },
    {
      id: "mike",
      name: "Mike",
      email: "mike@example.com",
      city: "Hong Kong",
      city_locked: true,
      questionnaire_answers: { ...baseAnswers, q_lifestyle_3: 2, q_social_1: 4, q_values_2: 3 },
      status: "approved",
      email_verified: true,
      role: "user",
      created_at: twoDaysAgo,
      approved_at: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
    },
  ];
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase env vars not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);

  // Check if we should clear existing data
  const { searchParams } = new URL(request.url);
  const reset = searchParams.get("reset") === "true";

  try {
    if (reset) {
      // Delete all existing demo users (those with @example.com or @demo.local emails)
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .or("email.ilike.%@example.com,email.ilike.%@demo.local");

      if (deleteError) {
        console.error("Error deleting existing users:", deleteError);
      }
    }

    const users = getDemoUsers();

    // Upsert users (insert or update on conflict)
    const { data, error } = await supabase
      .from("profiles")
      .upsert(users, { onConflict: "id" })
      .select();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Seeded ${data?.length || 0} demo users`,
      users: data?.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase env vars not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);

  // Get all users from profiles table
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, city, status, role")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    count: data?.length || 0,
    users: data,
  });
}
