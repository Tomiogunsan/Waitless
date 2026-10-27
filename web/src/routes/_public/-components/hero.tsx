import { Activity, Check } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-600 pb-28 text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--color-brand-400),transparent),radial-gradient(40rem_20rem_at_0%_120%,var(--color-brand-800),transparent)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-size-[32px_32px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
          <Activity className="size-3.5" aria-hidden />
          Average wait this week: 14 minutes
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          See a doctor, not a waiting room.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-brand-100">
          Book a 40-minute appointment in under a minute. No account, no phone
          calls, and your place in the queue is kept for you.
        </p>
        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-50">
          {[
            "No account needed",
            "Free to cancel or reschedule",
            "Doctors assigned automatically",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
                <Check className="size-3" aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
