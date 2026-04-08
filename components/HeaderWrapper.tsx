"use client";
import { usePathname } from "next/navigation";

const HIDDEN_HEADER_ROUTES = ["/login", "/register"];

export default function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = HIDDEN_HEADER_ROUTES.some((r) => pathname === r || pathname?.startsWith(r + "/"));
  if (hide) return null;
  return <>{children}</>;
}
