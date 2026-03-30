import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  let count = 10;
  try {
    const body = await req.json() as { count?: number };
    if (typeof body.count === "number") {
      count = Math.min(Math.max(Math.floor(body.count), 1), 50);
    }
  } catch {
    // use default
  }

  const supabase = getServiceSupabaseClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.thisisneverstrangers.com").replace(/\/$/, "");

  // Get max guest number and existing phones to avoid clashes
  const { data: existing } = await supabase
    .from("invited_users")
    .select("display_name, phone_e164");

  let nextNum = 1;
  const phoneSet = new Set<string>();
  (existing || []).forEach((r: { display_name?: string; phone_e164?: string }) => {
    const m = (r.display_name || "").match(/^Guest (\d+)$/);
    if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1);
    if (r.phone_e164) phoneSet.add(r.phone_e164);
  });
  let nextPhone = 91000000;
  while (phoneSet.has(`+65${nextPhone}`) && nextPhone < 99999999) nextPhone++;

  const rows = Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    phone_e164: `+65${nextPhone + i}`,
    display_name: `Guest ${nextNum + i}`,
    role: "user",
    invite_token: crypto.randomUUID(),
  }));

  const { data: inserted, error } = await supabase
    .from("invited_users")
    .insert(rows)
    .select("invite_token, display_name, phone_e164");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const urls = (inserted || []).map((row: { invite_token: string; display_name: string }) => ({
    display_name: row.display_name,
    url: `${appUrl}/invite/${row.invite_token}`,
  }));

  return Response.json({ ok: true, urls });
}
