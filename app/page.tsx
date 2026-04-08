import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";

export default async function Home() {
  const auth = await getAuthUser();

  if (!auth) {
    redirect("/login");
  }

  if (auth.status === "pending_verification") {
    redirect("/pending");
  }

  redirect("/events");
}
