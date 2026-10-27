import { useEffect, useState } from "react";
import { atClinicTime, clinicToday } from "./time";

// The staff dashboards show a mock clinic day. To keep the story coherent
// whenever someone opens the demo, "now" starts at 10:47 on today's date
// and then moves forward in real time.

export const DEMO_TODAY = clinicToday();
const DEMO_START = atClinicTime(DEMO_TODAY, "10:47").getTime();
const LOADED_AT = Date.now();

export function demoNow(): Date {
  return new Date(DEMO_START + (Date.now() - LOADED_AT));
}

/** The demo clock, re-rendering every `intervalMs`. */
export function useDemoNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(demoNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(demoNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
