import {
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { profile } from "@/lib/profile";

export function Sidebar({ activeView, onNavigate }) {
  const navItems = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["realtime", "Monitoring Realtime", ChartNoAxesCombined],
    ["history", "Riwayat Data", History],
    ["alert", "Alert", TriangleAlert],
    ["device", "Perangkat", SlidersHorizontal],
    ["settings", "Pengaturan", Settings],
  ];

  const realtime = activeView === "realtime";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-[#3a494b] bg-[#151d1e] lg:flex lg:flex-col">
      <div className={realtime ? "px-6 pb-7 pt-8" : "flex flex-col items-center border-b border-[#3a494b]/45 px-6 py-8"}>
        <div className={realtime ? "flex items-center gap-3" : "flex flex-col items-center"}>
          <div className={`${realtime ? "h-11 w-11 rounded-lg" : "h-20 w-20 rounded-full border border-[#3a494b]"} grid place-items-center bg-[#0d1515]`}>
            <div className={`${realtime ? "h-11 w-11 rounded-lg" : "h-14 w-14 rounded-full"} grid place-items-center bg-[#00f2ff] text-[#00363a] shadow-[0_0_22px_rgba(0,242,255,0.3)]`}>
              {realtime ? <LayoutDashboard size={23} strokeWidth={2.4} /> : <ShieldAlert size={30} strokeWidth={2.4} />}
            </div>
          </div>
          <div className={realtime ? "min-w-0" : "text-center"}>
            <h1 className={`${realtime ? "text-xl" : "mt-6 text-2xl"} font-display font-bold text-[#e1fdff]`}>NIRWANA-AI</h1>
            <p className={`${realtime ? "mt-1 text-[9px] uppercase tracking-[0.14em]" : "mt-2 text-sm"} text-[#b9cacb]`}>
              Neonatal Kidney Monitoring
            </p>
          </div>
        </div>
      </div>

      <nav className={`flex-1 ${realtime ? "px-7 py-2" : "py-4"}`}>
        {navItems.map(([key, label, Icon]) => {
          const active = key === activeView;
          return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            className={`flex items-center gap-4 border-l-4 px-5 py-4 transition ${
              active
                ? "border-[#e1fdff] bg-[#007f7f]/25 font-bold text-[#e1fdff]"
                : "border-transparent text-[#b9cacb] hover:bg-[#232b2c]"
            } ${realtime ? "mb-2 w-full" : "w-full"}`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
          </button>
        )})}
      </nav>

      {realtime ? (
        <div className="m-6 rounded-xl border border-[#3a494b] bg-[#192122] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#00f2ff]/10 text-[#00f2ff]">
              <UserRound size={21} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#dce4e4]">{profile.clinicianName}</p>
              <p className="text-xs text-[#849495]">{profile.clinicianTitle}</p>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
