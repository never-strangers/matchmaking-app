import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const PROFILE_COLS =
  "id, full_name, name, username, wp_user_login, instagram, reason, email, dob, city, status, created_at, wp_registered_at, attracted_to, gender, avatar_path, avatar_updated_at";

const VALID_STATUSES = ["pending_verification", "approved", "rejected", "all"] as const;
const SORT_OPTIONS = ["registered_desc", "registered_asc", "status", "city"] as const;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type ProfileRow = {
  id: string;
  full_name: string | null;
  name: string | null;
  username: string | null;
  wp_user_login: string | null;
  instagram: string | null;
  reason: string | null;
  email: string | null;
  dob: string | null;
  city: string | null;
  status: string | null;
  created_at: string | null;
  wp_registered_at: string | null;
  attracted_to: string | null;
  gender: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

function mapRow(r: Record<string, unknown>): ProfileRow {
  return {
    id: String(r.id),
    full_name: (r.full_name as string) ?? null,
    name: (r.name as string) ?? null,
    username: (r.username as string) ?? null,
    wp_user_login: (r.wp_user_login as string) ?? null,
    instagram: (r.instagram as string) ?? null,
    reason: (r.reason as string) ?? null,
    email: (r.email as string) ?? null,
    dob: (r.dob as string) ?? null,
    city: (r.city as string) ?? null,
    status: (r.status as string) ?? null,
    created_at: (r.created_at as string) ?? null,
    wp_registered_at: (r.wp_registered_at as string) ?? null,
    attracted_to: (r.attracted_to as string) ?? null,
    gender: (r.gender as string) ?? null,
    avatar_path: (r.avatar_path as string) ?? null,
    avatar_updated_at: (r.avatar_updated_at as string) ?? null,
  };
}

/** Whole-segment match for attracted_to (comma-separated) */
function matchesAttractedTo(raw: string | null, value: string): boolean {
  if (!value || !raw?.trim()) return true;
  const values = raw.split(/[,;]/).map((s) => s.trim().toLowerCase());
  return values.includes(value.trim().toLowerCase());
}

export async function GET(req: NextRequest) {
  const session = await getAuthUser();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (session.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "all";
  const city = searchParams.get("city")?.trim() || "";
  const gender = searchParams.get("gender")?.trim() || "";
  const attractedTo = searchParams.get("attracted_to")?.trim() || "";
  const sort =
    (searchParams.get("sort") as (typeof SORT_OPTIONS)[number]) || "registered_desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("page_size") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );

  const validStatus = VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
    ? (status as (typeof VALID_STATUSES)[number])
    : "all";
  const validSort = SORT_OPTIONS.includes(sort) ? sort : "registered_desc";

  const supabase = getServiceSupabaseClient();

  let query = supabase.from("profiles").select(PROFILE_COLS, { count: "exact" });

  if (validStatus !== "all") {
    query = query.eq("status", validStatus);
  }
  if (city && city !== "all") {
    query = query.eq("city", city);
  }
  if (gender && gender !== "all") {
    query = query.eq("gender", gender);
  }

  if (q) {
    const term = `%${q.replace(/%/g, "\\%")}%`;
    query = query.or(
      `full_name.ilike.${term},name.ilike.${term},email.ilike.${term},username.ilike.${term},wp_user_login.ilike.${term},instagram.ilike.${term},phone.ilike.${term},phone_e164.ilike.${term}`
    );
  }

  switch (validSort) {
    case "registered_asc":
      query = query.order("created_at", { ascending: true, nullsFirst: false });
      break;
    case "registered_desc":
      query = query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "status":
      query = query.order("status", { ascending: true, nullsFirst: false });
      break;
    case "city":
      query = query.order("city", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false, nullsFirst: false });
  }

  const applyAttractedToInMemory = attractedTo && attractedTo !== "all";

  if (applyAttractedToInMemory) {
    query = query.limit(5000);
  } else {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data: rows, error, count } = await query;

  if (error) {
    console.error("GET /api/admin/users error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch users" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let items: ProfileRow[] = (rows || []).map((r: Record<string, unknown>) => mapRow(r));

  if (applyAttractedToInMemory) {
    items = items.filter((p) => matchesAttractedTo(p.attracted_to, attractedTo));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = (page - 1) * pageSize;
    items = items.slice(from, from + pageSize);
    return Response.json({
      items,
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return Response.json({
    items,
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
  });
}
