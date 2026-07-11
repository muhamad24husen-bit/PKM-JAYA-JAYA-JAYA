import {
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { profile } from "@/lib/profile";

export function Sidebar({ activeView, onNavigate, collapsed = false, onToggleCollapse }) {
  const navItems = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["realtime", "Monitoring Realtime", ChartNoAxesCombined],
    ["history", "Riwayat Data", History],
    ["alert", "Alert", TriangleAlert],
    ["device", "Perangkat", SlidersHorizontal],
    ["settings", "Pengaturan", Settings],
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-nirwana-border bg-nirwana-surface transition-[width] duration-300 ease-in-out lg:flex lg:flex-col ${
        collapsed ? "w-[76px]" : "w-[260px]"
      }`}
    >
      <div className={`flex px-3 pt-3 ${collapsed ? "justify-center" : "justify-end"}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Perluas sidebar" : "Kecilkan sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Perluas" : "Kecilkan"}
          className="grid h-9 w-9 place-items-center rounded-lg text-nirwana-muted transition hover:bg-nirwana-surfaceMuted hover:text-nirwana-text"
        >
          {collapsed ? <PanelLeftOpen size={20} strokeWidth={2} /> : <PanelLeftClose size={20} strokeWidth={2} />}
        </button>
      </div>

      <div
        className={`border-b border-nirwana-border ${
          collapsed ? "flex flex-col items-center px-3 pb-6" : "flex flex-col items-center px-6 pb-7 pt-1"
        }`}
      >
        <div className={collapsed ? "flex items-center gap-3" : "flex flex-col items-center"}>
          <div
            className={`grid place-items-center bg-nirwana-accent text-white ${
              collapsed ? "h-11 w-11 rounded-lg" : "h-16 w-16 rounded-full"
            }`}
          >
            {collapsed ? <LayoutDashboard size={22} strokeWidth={2.2} /> : <ShieldAlert size={26} strokeWidth={2.2} />}
          </div>
          {collapsed ? null : (
            <div className="mt-4 text-center">
              <h1 className="text-lg font-semibold text-nirwana-text">NIRWANA-AI</h1>
              <p className="mt-1 text-xs text-nirwana-muted">Neonatal Kidney Monitoring</p>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 ${collapsed ? "py-4" : "py-4"}`}>
        {navItems.map(([key, label, Icon]) => {
          const active = key === activeView;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={`flex items-center border-l-4 text-sm transition ${
                collapsed ? "w-full justify-center px-0 py-3.5" : "w-full gap-3 px-5 py-3"
              } ${
                active
                  ? "border-nirwana-accent bg-nirwana-accentSoft font-semibold text-nirwana-accent"
                  : "border-transparent text-nirwana-muted hover:bg-nirwana-surfaceMuted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              {collapsed ? null : <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {collapsed ? (
        <div className="mb-6 flex justify-center">
          <div
            className="grid h-10 w-10 place-items-center rounded-full bg-nirwana-accentSoft text-nirwana-accent"
            title={`${profile.clinicianName} · ${profile.clinicianTitle}`}
          >
            <UserRound size={20} />
          </div>
        </div>
      ) : (
        <div className="m-4 rounded-lg border border-nirwana-border bg-nirwana-surfaceMuted p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-nirwana-accentSoft text-nirwana-accent">
              <UserRound size={19} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-nirwana-text">{profile.clinicianName}</p>
              <p className="truncate text-xs text-nirwana-muted">{profile.clinicianTitle}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
