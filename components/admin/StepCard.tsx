import { ReactNode } from "react";
import Card from "./Card";

interface StepCardProps {
  children: ReactNode;
  className?: string;
}

export default function StepCard({ children, className = "" }: StepCardProps) {
  return <Card className={`mb-8 ${className}`}>{children}</Card>;
}

