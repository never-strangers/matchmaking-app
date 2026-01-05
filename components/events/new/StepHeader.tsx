interface StepHeaderProps {
  title: string;
  subtitle?: string;
}

export default function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl md:text-5xl font-light text-gray-dark mb-2 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-gray-medium mt-2">{subtitle}</p>
      )}
    </div>
  );
}

