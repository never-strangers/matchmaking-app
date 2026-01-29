import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";

export async function SessionBanner() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  return (
    <div
      className="text-center py-2 px-4 sm:px-6 text-sm"
      style={{
        backgroundColor: "var(--bg-muted)",
        color: "var(--text-muted)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      You&apos;re logged in as <strong style={{ color: "var(--text)" }}>{session.display_name}</strong>
    </div>
  );
}
