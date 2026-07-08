import { ChartNoAxesCombined, History, LayoutDashboard } from "lucide-react";

export function MobileNavigation({ activeView, onNavigate }) {
  const items = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["realtime", "Realtime", ChartNoAxesCombined],
    ["history", "Riwayat", History],
  ];

  return (
    <nav className="z-40 flex border-b border-nirwana-border bg-nirwana-surface px-2 py-2 lg:hidden">
      {items.map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onNavigate(key)}
          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded px-2 py-2 text-xs font-semibold transition ${
            activeView === key ? "bg-nirwana-accentSoft text-nirwana-accent" : "text-nirwana-muted"
          }`}
        >
          <Icon size={17} />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </nav>
  );
}
