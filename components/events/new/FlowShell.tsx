import { ReactNode } from "react";

interface FlowShellProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function FlowShell({
  children,
  maxWidth = "max-w-[720px]",
}: FlowShellProps) {
  return (
    <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-12`}>
      {children}
    </div>
  );
}

