import {
  Baby,
  HeartPulse,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export const DEPARTMENT_DETAILS: Record<
  string,
  { icon: LucideIcon; description: string }
> = {
  "General Medicine": {
    icon: Stethoscope,
    description:
      "Check-ups, fever, infections, blood pressure and everyday health concerns.",
  },
  Paediatrics: {
    icon: Baby,
    description:
      "Care for babies, children and teenagers, including immunisations.",
  },
  "Obstetrics & Gynaecology": {
    icon: HeartPulse,
    description: "Pregnancy care, antenatal visits and women's health.",
  },
  Dermatology: {
    icon: Sparkles,
    description:
      "Skin, hair and nail conditions such as eczema, acne and rashes.",
  },
};

export const DEFAULT_DEPARTMENT = {
  icon: Stethoscope,
  description: "Book a consultation with this department.",
};
