import { cookies } from "next/headers";
import { verifyPendingInviteToken } from "@/lib/auth/sessionToken";

/** Returns whether user has a valid pending invite (for invite-based registration). */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_pending_invite")?.value;
  const pending = verifyPendingInviteToken(token);
  return Response.json({ hasInvite: !!pending });
}
