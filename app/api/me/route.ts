import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json({
    profile_id: session.profile_id,
    invited_user_id: session.invited_user_id,
    role: session.role,
    phone_e164: session.phone_e164,
    display_name: session.display_name,
  });
}

