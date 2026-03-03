import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApprovedUser();
  return <>{children}</>;
}
