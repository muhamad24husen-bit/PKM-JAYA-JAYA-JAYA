import { Baby, Bell, CircleUserRound } from "lucide-react";
import { statusOf } from "@/lib/format";
import { profile } from "@/lib/profile";
import { SimulationBadge } from "@/components/ui/SimulationBadge";

export function TopAppBar({ current, simulation = null }) {
  const meta = statusOf(current.alertStatus);

  return (
    <header className="sticky top-0 z-20 border-b border-nirwana-border bg-nirwana-surface px-5 py-4 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-nirwana-accentSoft text-nirwana-accent">
            <Baby size={24} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-nirwana-text sm:text-2xl">
              NIRWANA-AI Monitoring Dashboard
            </h2>
            <p className="mt-1 text-sm text-nirwana-muted">Monitoring Hipoksia Ginjal Neonatus</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 lg:justify-end">
          <SimulationBadge simulation={simulation} />
          <div className="text-left lg:text-right">
            <p className="font-medium text-nirwana-text">ID: {profile.monitorId}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-nirwana-muted lg:justify-end">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              Status: <span className={`font-semibold ${meta.tone}`}>{meta.top}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-nirwana-muted">
            <Bell size={21} />
            <CircleUserRound size={24} />
          </div>
        </div>
      </div>
    </header>
  );
}
