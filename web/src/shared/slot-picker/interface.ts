import type { LucideIcon } from "lucide-react";
import type { Slot } from "@/types/clinic";

export type IDateStripProp = {
  /** Bookable dates as YYYY-MM-DD, in clinic (Lagos) time. */
  dates: string[];
  value: string | null;
  onChange: (_date: string) => void;
};

export type ISlotGridProp = {
  /** Rows from get_available_slots(); unavailable ones are shown disabled. */
  slots: Slot[];
  /** The selected slot's start time (ISO string). */
  value: string | null;
  onChange: (_slotAt: string) => void;
};

export type ISlotGroupProp = ISlotGridProp & {
  icon: LucideIcon;
  label: string;
};
