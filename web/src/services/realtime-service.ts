import { supabase } from "@/config/supabase";

// The database's row level security applies to these events, so each
// signed-in user only hears about appointments they're allowed to see.
export function subscribeToAppointmentChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("appointments-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
