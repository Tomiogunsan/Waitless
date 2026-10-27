// Mock versions of the public booking RPCs: get_available_slots,
// book_public_appointment and get_public_appointment.

import { normalizePhone } from "@/utils/format";
import { SLOT_TIMES, atClinicTime, bookableDates } from "@/utils/time";
import type { PublicAppointment, Slot } from "@/types/clinic";
import { departments, getDepartment } from "./clinic";

/** Deterministic 0-1 value for a string, so "taken" slots stay stable. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function getAvailableSlots(
  departmentId: string,
  date: string,
  now = new Date(),
): Slot[] {
  const earliest = now.getTime() + 60 * 60_000;
  return SLOT_TIMES.map((time) => {
    const slotAt = atClinicTime(date, time);
    const taken = hash01(`${departmentId}:${date}:${time}`) < 0.32;
    return {
      slot_at: slotAt.toISOString(),
      is_available: !taken && slotAt.getTime() >= earliest,
    };
  });
}

const PHYSICIAN_BY_DEPARTMENT: Record<string, string[]> = {
  "dep-gm": ["Dr. Adaeze Nwosu", "Dr. Tunde Bakare"],
  "dep-paed": ["Dr. Ngozi Eze"],
  "dep-og": ["Dr. Kemi Alabi"],
  "dep-derm": ["Dr. Ibrahim Sule"],
};

interface StoredBooking extends PublicAppointment {
  phone: string;
  patient_name: string;
}

const demoDate = bookableDates()[3]!;

/** Bookings by reference code. Starts with one demo booking. */
const bookings = new Map<string, StoredBooking>([
  [
    "CLN-7F3A9C21B4E8",
    {
      booking_reference: "CLN-7F3A9C21B4E8",
      appointment_time: atClinicTime(demoDate, "10:40").toISOString(),
      appointment_status: "scheduled",
      department_name: "General Medicine",
      physician_name: "Dr. Tunde Bakare",
      time_under_review: false,
      phone: "+2348031234567",
      patient_name: "Amaka Obi",
    },
  ],
]);

export const DEMO_LOOKUP = {
  reference: "CLN-7F3A9C21B4E8",
  phone: "0803 123 4567",
};

function newReference(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `CLN-${hex}`;
}

export function bookPublicAppointment(input: {
  departmentId: string;
  slotAt: string;
  fullName: string;
  phone: string;
}): StoredBooking {
  const names = PHYSICIAN_BY_DEPARTMENT[input.departmentId] ?? [
    "Dr. Adaeze Nwosu",
  ];
  const booking: StoredBooking = {
    booking_reference: newReference(),
    appointment_time: input.slotAt,
    appointment_status: "scheduled",
    department_name:
      getDepartment(input.departmentId)?.name ?? "General Medicine",
    physician_name: names[Math.floor(hash01(input.slotAt) * names.length)]!,
    time_under_review: false,
    phone: normalizePhone(input.phone),
    patient_name: input.fullName.trim(),
  };
  bookings.set(booking.booking_reference, booking);
  return booking;
}

export function getBooking(reference: string): StoredBooking | undefined {
  return bookings.get(reference.trim().toUpperCase());
}

/** Lookup needs both the code and the phone number, like the real RPC. */
export function getPublicAppointment(
  reference: string,
  phone: string,
): StoredBooking | undefined {
  const booking = getBooking(reference);
  return booking && booking.phone === normalizePhone(phone)
    ? booking
    : undefined;
}

export function updateBooking(
  reference: string,
  changes: Partial<StoredBooking>,
): StoredBooking | undefined {
  const booking = getBooking(reference);
  if (!booking) return undefined;
  const updated = { ...booking, ...changes };
  bookings.set(updated.booking_reference, updated);
  return updated;
}

export const departmentSummaries = departments.map((d) => ({
  ...d,
  physicianCount: PHYSICIAN_BY_DEPARTMENT[d.id]?.length ?? 0,
  description: {
    "dep-gm":
      "Check-ups, fever, infections, blood pressure and everyday health concerns.",
    "dep-paed":
      "Care for babies, children and teenagers, including immunisations.",
    "dep-og": "Pregnancy care, antenatal visits and women's health.",
    "dep-derm":
      "Skin, hair and nail conditions such as eczema, acne and rashes.",
  }[d.id]!,
}));
