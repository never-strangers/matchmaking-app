import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/");
  }
  if (user.role !== "admin") {
    redirect("/events");
  }

  return <>{children}</>;
}
