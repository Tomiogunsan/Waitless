import { useSyncExternalStore } from "react";
import type { Appointment, Patient, Staff, VisitNote } from "@/types/clinic";
import {
  appointments as seedAppointments,
  patients as seedPatients,
  staff as seedStaff,
  visitNotes as seedNotes,
} from "./clinic";

// In-memory stand-in for the database while the UI is built. Changes made
// on one screen (e.g. a check-in at the front desk) show up on the others,
// the way Supabase Realtime will keep them in sync later.

function createStore<T extends { id: string }>(initial: T[]) {
  let items = initial;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    getAll: () => items,
    get: (id: string) => items.find((item) => item.id === id),
    update(id: string, patch: Partial<T>) {
      items = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
      emit();
    },
    add(item: T) {
      items = [...items, item];
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const appointmentStore = createStore<Appointment>(seedAppointments);
export const staffStore = createStore<Staff>(seedStaff);
export const noteStore = createStore<VisitNote>(seedNotes);
export const patientStore = createStore<Patient>(seedPatients);

export function useAppointments(): Appointment[] {
  return useSyncExternalStore(appointmentStore.subscribe, appointmentStore.getAll);
}

export function useStaffList(): Staff[] {
  return useSyncExternalStore(staffStore.subscribe, staffStore.getAll);
}

export function useVisitNotes(): VisitNote[] {
  return useSyncExternalStore(noteStore.subscribe, noteStore.getAll);
}

export function usePatients(): Patient[] {
  return useSyncExternalStore(patientStore.subscribe, patientStore.getAll);
}
