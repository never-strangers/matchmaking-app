interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

export default function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: TextFieldProps) {
  return (
    <div>
      <label className="block text-sm text-gray-medium mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white border border-beige-frame rounded-lg text-gray-dark placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-red-accent focus:border-transparent"
      />
    </div>
  );
}

