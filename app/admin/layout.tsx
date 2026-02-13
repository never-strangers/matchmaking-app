import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);

  if (!session) {
    redirect("/");
  }
  if (session.role !== "admin") {
    redirect("/events");
  }

  return <>{children}</>;
}
