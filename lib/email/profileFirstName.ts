/**
 * First word of the best available profile name for email greetings (`{{first_name}}`).
 * Order: name → full_name → display_name.
 */
export function firstNameFromProfileFields(p: {
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
}): string {
  const raw = (p.name?.trim() || p.full_name?.trim() || p.display_name?.trim() || "").split(/\s+/)[0];
  return raw ?? "";
}
