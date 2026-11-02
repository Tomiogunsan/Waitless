import type { StaffAppointment } from "@/types/appointment";
import type { AppointmentStatus } from "@/types/clinic";

export type Filter = "all" | "upcoming" | "waiting" | "with_doctor" | "done";

export const FILTER_STATUSES: Record<Filter, AppointmentStatus[] | null> = {
  all: null,
  upcoming: ["scheduled"],
  waiting: ["checked_in"],
  with_doctor: ["in_progress"],
  done: ["completed", "cancelled", "no_show"],
};

export const isDone = (a: StaffAppointment) =>
  a.status === "completed" ||
  a.status === "cancelled" ||
  a.status === "no_show";

export type DialogState = {
  kind: "reassign" | "reschedule" | "cancel";
  appointment: StaffAppointment;
} | null;