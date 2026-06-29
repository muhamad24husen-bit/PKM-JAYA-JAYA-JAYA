import { Baby, Bell, CircleUserRound } from "lucide-react";
import { statusOf } from "@/lib/format";
import { profile } from "@/lib/profile";

export function TopAppBar({ current }) {
  const meta = statusOf(current.alertStatus);

  return (
    <header className="sticky top-0 z-20 border-b border-[#3a494b] bg-[#0d1515]/90 px-5 py-4 backdrop-blur-md sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Baby className="text-[#e1fdff]" size={32} />
          <div>
            <h2 className="font-display text-xl font-bold text-[#dce4e4] sm:text-2xl">
              NIRWANA-AI Monitoring Dashboard
            </h2>
            <p className="mt-1 text-sm text-[#b9cacb] sm:text-base">Monitoring Hipoksia Ginjal Neonatus</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 lg:justify-end">
          <div className="text-left lg:text-right">
            <p className="font-medium text-[#dce4e4]">ID: {profile.monitorId}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-[#b9cacb] lg:justify-end">
              <span className="h-2 w-2 rounded-full bg-[#ffb4ab]" />
              Status: <span className={`font-bold ${meta.tone}`}>{meta.top}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-[#b9cacb]">
            <Bell size={22} />
            <CircleUserRound size={25} />
          </div>
        </div>
      </div>
    </header>
  );
}
