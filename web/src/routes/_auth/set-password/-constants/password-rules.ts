/** What a new password must contain. Each rule shows as a checklist item. */
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "An uppercase and a lowercase letter", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
];

/** Strength meter label and colour, indexed by how many rules pass (0–3). */
export const PASSWORD_STRENGTH = [
  { label: "Too weak", bar: "bg-red-500" },
  { label: "Weak", bar: "bg-amber-500" },
  { label: "Almost there", bar: "bg-brand-400" },
  { label: "Strong", bar: "bg-emerald-500" },
];
