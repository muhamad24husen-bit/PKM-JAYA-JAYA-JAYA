import { FlaskConical } from "lucide-react";

export function SimulationBadge({ simulation }) {
  if (!simulation?.running) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-nirwana-waspada/40 bg-nirwana-waspadaSoft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-nirwana-waspada">
      <FlaskConical size={12} strokeWidth={2.2} />
      Simulasi
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nirwana-waspada" />
    </span>
  );
}
