import { ReactNode } from "react";

interface AdminShellProps {
  children: ReactNode;
  twoColumn?: boolean;
}

export default function AdminShell({
  children,
  twoColumn = false,
}: AdminShellProps) {
  if (twoColumn) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {children}
    </div>
  );
}
