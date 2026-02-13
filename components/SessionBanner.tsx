import { getAuthUser } from "@/lib/auth/getAuthUser";

export async function SessionBanner() {
  const auth = await getAuthUser();
  if (!auth) return null;

  return (
    <div
      className="text-center py-2 px-4 sm:px-6 text-sm"
      style={{
        backgroundColor: "var(--bg-muted)",
        color: "var(--text-muted)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      You&apos;re logged in as <strong style={{ color: "var(--text)" }}>{auth.display_name}</strong>
    </div>
  );
}
