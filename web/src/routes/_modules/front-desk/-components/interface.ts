import type { StaffAppointment } from "@/types/appointment";

export interface IAppointmentDialogProp {
  appointment: StaffAppointment;
  onOpenChange: (open: boolean) => void;
}
