import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  adminClient = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
  return adminClient;
}

export async function approveProfileByEmail(email: string): Promise<string> {
  const admin = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  let userId: string | null = null;

  for (let page = 1; page <= 5; page += 1) {
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (usersError) {
      throw new Error(usersError.message || "Failed to list users.");
    }
    const user = usersData.users.find(
      (candidate) => (candidate.email ?? "").toLowerCase() === normalizedEmail
    );
    if (user?.id) {
      userId = user.id;
      break;
    }
    if (usersData.users.length < 200) break;
  }
  if (!userId) {
    throw new Error(`Unable to find auth user for email: ${normalizedEmail}`);
  }

  const fallbackName =
    normalizedEmail.split("@")[0]?.slice(0, 50) || `user_${userId.slice(0, 8)}`;

  const { error: updateError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        name: fallbackName,
        display_name: fallbackName,
        full_name: fallbackName,
        email: normalizedEmail,
        city: "sg",
        status: "approved",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (updateError) {
    throw new Error(updateError.message || "Failed to approve profile.");
  }

  return userId;
}
