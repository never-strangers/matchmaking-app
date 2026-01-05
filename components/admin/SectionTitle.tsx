interface SectionTitleProps {
  number: string;
  title: string;
  subtitle?: string;
}

export default function SectionTitle({
  number,
  title,
  subtitle,
}: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-light text-gray-dark mb-1">
        <span className="text-gray-medium">{number}.</span> {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-medium mt-1">{subtitle}</p>
      )}
    </div>
  );
}

