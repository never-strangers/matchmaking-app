import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { status: "error", error: "Supabase env vars not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);

  // Try a minimal query (table may or may not exist yet)
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  return NextResponse.json({
    status: "ok",
    error: error?.message ?? null,
    sampleRow: data?.[0] ?? null,
  });
}


