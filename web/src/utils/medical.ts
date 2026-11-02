export const UNKNOWN_ALLERGIES = "Unknown";
export const NO_KNOWN_ALLERGIES = "None known";

export function hasKnownAllergy(allergies: string | undefined): boolean {
  return Boolean(allergies) && allergies !== UNKNOWN_ALLERGIES && allergies !== NO_KNOWN_ALLERGIES;
}
