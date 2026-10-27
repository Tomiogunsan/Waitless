import { formatTime } from "@/utils/time";

export function greeting(now: Date) {
  const hour = Number(formatTime(now).slice(0, 2));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}