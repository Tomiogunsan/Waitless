// Text formatting shared across screens.

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Mirror of public.normalize_phone() in the database: local Nigerian
 * numbers (0803...) become +234803...
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\s*\+/.test(input)) return `+${digits}`;
  return digits;
}

export function isValidPhone(input: string): boolean {
  return /^\+\d{8,15}$/.test(normalizePhone(input));
}

/** +2348031234567 → 0803 123 4567 for display. */
export function formatPhone(phone: string): string {
  const match = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : phone;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

