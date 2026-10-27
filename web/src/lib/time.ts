// The clinic runs on Lagos time (UTC+1, no daylight saving), whatever
// time zone the viewer is in. All formatting goes through these helpers.

export const CLINIC_TZ = "Africa/Lagos";

/** Slot start times, matching the physician working hours in migration 3. */
export const MORNING_SLOTS = ["08:40", "09:20", "10:00", "10:40", "11:20"] as const;
export const AFTERNOON_SLOTS = ["13:00", "13:40", "14:20", "15:00", "15:40", "16:20"] as const;
export const SLOT_TIMES = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

export const APPOINTMENT_MINUTES = 40;
export const BOOKING_WINDOW_DAYS = 30;

/** A clinic date (YYYY-MM-DD) and time (HH:MM) as a real instant. */
export function atClinicTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+01:00`);
}

/** Today's date in the clinic's time zone, as YYYY-MM-DD. */
export function clinicToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday: Monday = 1 ... Sunday = 7. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isClinicDay(date: string): boolean {
  return isoWeekday(date) <= 5;
}

/** Bookable clinic days from today, within the booking window. */
export function bookableDates(today: string = clinicToday()): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= BOOKING_WINDOW_DAYS; i++) {
    const date = addDays(today, i);
    if (isClinicDay(date)) dates.push(date);
  }
  return dates;
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLINIC_TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTime(value: string | Date): string {
  return timeFormat.format(new Date(value));
}

export function formatTimeRange(start: string | Date): string {
  const from = new Date(start);
  const to = new Date(from.getTime() + APPOINTMENT_MINUTES * 60_000);
  return `${formatTime(from)} – ${formatTime(to)}`;
}

export function formatDate(
  value: string | Date,
  style: "short" | "long" | "weekday" = "long",
): string {
  const date =
    typeof value === "string" && value.length === 10 ? atClinicTime(value, "12:00") : new Date(value);
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "weekday"
        ? { weekday: "short", day: "numeric", month: "short" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", { timeZone: CLINIC_TZ, ...options }).format(date);
}

export function minutesBetween(from: string | Date, to: string | Date): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
