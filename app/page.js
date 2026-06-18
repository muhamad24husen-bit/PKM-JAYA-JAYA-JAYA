"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Baby,
  Battery,
  Bell,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Cpu,
  Download,
  Gauge,
  History,
  LayoutDashboard,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exportHistoryToPDF } from "@/lib/pdf";
import {
  DEFAULT_BROKER_URL,
  DEFAULT_DEVICE_ID,
  DEFAULT_TOPIC,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  createDemoTelemetry,
  formatDateTime,
  parseTelemetryMessage,
  toDisplayValue,
} from "@/lib/telemetry";

const dashboardFallback = {
  id: "reference-preview",
  timestamp: "2026-06-14T09:20:00+07:00",
  deviceId: DEFAULT_DEVICE_ID,
  rso2: 42,
  red: 52420,
  ir: 68360,
  ratio: 0.767,
  motion: "Stabil",
  sqi: 92,
  battery: 87,
  alertStatus: "HIPOKSIA",
};

const realtimeFallback = {
  ...dashboardFallback,
  id: "realtime-reference-preview",
  rso2: 68,
  red: 52420,
  ir: 68360,
  motion: "Low",
  sqi: 98.2,
  alertStatus: "NORMAL",
};

const statusMeta = {
  NORMAL: {
    label: "Normal",
    header: "NORMAL",
    tone: "text-slate-300",
    border: "border-slate-500/25",
    bg: "bg-slate-400/5",
    nav: "Status stabil",
    top: "NORMAL",
  },
  WASPADA: {
    label: "Waspada",
    header: "WASPADA",
    tone: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/8",
    nav: "Perlu pemantauan",
    top: "ALERT",
  },
  HIPOKSIA: {
    label: "Hipoksia",
    header: "HIPOKSIA",
    tone: "text-[#ffb4ab]",
    border: "border-[#ffb4ab]",
    bg: "bg-[#ffb4ab]/8",
    nav: "Kondisi kritis",
    top: "ALERT",
  },
};

function statusOf(status) {
  return statusMeta[status] || statusMeta.NORMAL;
}

function shortDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(".", ":");
}

function signalLabel(value) {
  if (value === null || value === undefined) return "-";
  if (value >= 80) return "BAIK";
  if (value >= 60) return "CUKUP";
  return "BURUK";
}

function formatRso2(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "-";
}

function formatMotion(value) {
  const motion = String(value || "-").trim();
  if (motion === "-") return motion;
  if (motion.toUpperCase() === "TERDETEKSI") return "Terdeteksi";
  if (motion.toUpperCase() === "STABIL") return "Stabil";
  return motion;
}

function Sidebar({ activeView, onNavigate }) {
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
              <p className="text-sm font-bold text-[#dce4e4]">Dr. Arisandi</p>
              <p className="text-xs text-[#849495]">Sp.A(K)</p>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function TopAppBar({ current }) {
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
            <p className="font-medium text-[#dce4e4]">ID: NW-2024-001</p>
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

function TopStatusStrip({ current, connectionStatus }) {
  const online = connectionStatus === "connected";

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-white/10 border-l-4 border-l-[#e1fdff] bg-[#161b26] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Cpu className="text-[#849495]" size={22} />
        <span className="text-[#b9cacb]">ID Perangkat:</span>
        <span className="font-display text-lg font-medium text-[#dce4e4]">{current.deviceId || DEFAULT_DEVICE_ID}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-[#ffb4ab]"
          }`}
        />
        <span className={`font-display text-xs font-bold uppercase tracking-[0.08em] ${online ? "text-emerald-400" : "text-[#ffb4ab]"}`}>
          {online ? "ONLINE" : connectionStatus}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Clock3 className="text-[#849495]" size={22} />
        <span className="text-[#b9cacb]">Update Terakhir:</span>
        <span className="font-display text-lg font-medium text-[#dce4e4]">{shortDateTime(current.timestamp)}</span>
      </div>
    </section>
  );
}

function Sparkline({ danger }) {
  return (
    <svg className="absolute bottom-0 left-0 h-9 w-full opacity-60" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path
        d="M0 15 Q10 10 20 20 T40 15 T60 25 T80 10 L100 25"
        fill="none"
        stroke={danger ? "#ffb4ab" : "#00f2ff"}
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 4px ${danger ? "rgba(255,180,171,0.75)" : "rgba(0,242,255,0.75)"})` }}
      />
    </svg>
  );
}

function SummaryCard({ title, value, suffix, icon: Icon, tone, children, active, danger, pulse }) {
  const valueText = String(value);
  const valueSize = valueText.length > 7 ? "text-3xl sm:text-4xl" : "text-3xl sm:text-5xl";

  return (
    <section
      className={`relative min-h-[138px] overflow-hidden rounded-lg border bg-[#161b26] p-5 ${
        active ? "border-t-[#00f2ff]" : "border-white/10"
      } ${danger ? "border-[#ffb4ab]" : ""} ${pulse ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">{title}</h3>
        <Icon className={tone} size={23} />
      </div>
      <div className="mt-7 flex items-end gap-2">
        <span className={`max-w-full truncate font-display font-bold leading-none ${valueSize} ${tone}`}>{value}</span>
        {suffix ? <span className="mb-1 text-[#dce4e4]">{suffix}</span> : null}
        {children}
      </div>
      {active ? <Sparkline danger={danger} /> : null}
    </section>
  );
}

function DashboardCards({ current }) {
  const meta = statusOf(current.alertStatus);
  const signal = signalLabel(current.sqi);
  const motion = formatMotion(current.motion);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        title="rSO2 Ginjal"
        value={formatRso2(current.rso2)}
        suffix="%"
        icon={TriangleAlert}
        tone={current.alertStatus === "HIPOKSIA" ? "text-[#ffb4ab]" : "text-[#00f2ff]"}
        active
        danger={current.alertStatus === "HIPOKSIA"}
      />
      <SummaryCard title="Kualitas Sinyal" value={toDisplayValue(current.sqi, "%")} icon={Shield} tone="text-[#76d6d5]">
        <span className="mb-1 rounded border border-[#76d6d5]/25 bg-[#76d6d5]/10 px-2 py-0.5 text-xs font-bold text-[#76d6d5]">
          {signal}
        </span>
      </SummaryCard>
      <SummaryCard title="Status Gerak" value={motion} icon={UserRound} tone="text-[#dce4e4]" />
      <SummaryCard title="Baterai" value={toDisplayValue(current.battery, "%")} icon={Battery} tone="text-emerald-400">
        <span className="mb-2 h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </SummaryCard>
      <SummaryCard title="Status Peringatan" value={meta.header} icon={ShieldAlert} tone={meta.tone} danger pulse={current.alertStatus !== "NORMAL"} />
    </section>
  );
}

function WarningPanel({ status }) {
  const items = [
    ["NORMAL", "Normal", CheckCircle2, "text-slate-400"],
    ["WASPADA", "Waspada", TriangleAlert, "text-yellow-400"],
    ["HIPOKSIA", "Hipoksia", Activity, "text-[#690005]"],
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-[#161b26] p-5">
      <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
        Status Peringatan
      </h3>
      <div className="mt-5 flex flex-col gap-3">
        {items.map(([key, label, Icon, iconTone]) => {
          const active = key === status;
          const critical = active && key === "HIPOKSIA";

          return (
            <div
              key={key}
              className={`relative flex items-center gap-3 rounded px-4 py-3 ${
                critical
                  ? "bg-[#ffb4ab] font-bold text-[#690005]"
                  : active
                    ? "border border-[#00f2ff]/25 bg-[#00f2ff]/10 text-[#e1fdff]"
                    : "border border-white/5 bg-[#192122]/50 text-[#b9cacb] opacity-70"
              }`}
            >
              <Icon className={critical ? iconTone : key === "WASPADA" ? "text-yellow-400" : "text-[#849495]"} size={22} />
              <span>{label}</span>
              {critical ? <span className="absolute right-0 top-0 h-full w-1 rounded-r bg-[#690005]" /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeviceInfoPanel({ current, connectionStatus, lastError }) {
  const rows = [
    ["Subjek", "Neonatus-01"],
    ["Mode", "Prototype"],
    ["Koneksi", connectionStatus === "connected" ? "BLE / WiFi" : "BLE / WiFi"],
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-[#161b26] p-5 lg:col-span-3">
      <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
        Informasi Perangkat
      </h3>
      <ul className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <li key={label} className="flex flex-col">
            <span className="mb-1 text-xs text-[#849495]">{label}</span>
            <span className="font-medium text-[#dce4e4]">{value}</span>
          </li>
        ))}
        <li className="flex flex-col">
          <span className="mb-1 text-xs text-[#849495]">TinyML</span>
          <span className="w-max rounded border border-[#dce4e4]/30 bg-[#dce4e4]/10 px-2 py-0.5 text-xs font-bold text-[#dce4e4]">
            Aktif
          </span>
        </li>
        <li className="flex flex-col">
          <span className="mb-1 text-xs text-[#849495]">Device ID</span>
          <span className="font-medium text-[#dce4e4]">{current.deviceId || DEFAULT_DEVICE_ID}</span>
        </li>
      </ul>
      {lastError ? (
        <p className="mt-5 rounded border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
          {lastError}
        </p>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }) {
  const meta = statusOf(status);

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${meta.border} ${meta.bg} ${meta.tone}`}>
      {meta.header}
    </span>
  );
}

function MobileNavigation({ activeView, onNavigate }) {
  const items = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["realtime", "Realtime", ChartNoAxesCombined],
    ["history", "Riwayat", History],
  ];

  return (
    <nav className="z-40 flex border-b border-[#3a494b] bg-[#0d1515]/95 px-2 py-2 backdrop-blur lg:hidden">
      {items.map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onNavigate(key)}
          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded px-2 py-2 text-xs font-semibold transition ${
            activeView === key ? "bg-[#007f7f]/30 text-[#e1fdff]" : "text-[#849495]"
          }`}
        >
          <Icon size={17} />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function RealtimeHeader({ current, connectionStatus, simulationEnabled }) {
  const online = connectionStatus === "connected";
  const simulationActive = simulationEnabled && !online;

  return (
    <header className="sticky top-0 z-20 border-b border-[#3a494b] bg-[#0d1515]/90 px-5 py-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#dce4e4]">Monitoring Realtime</h2>
          <p className="mt-1 text-xs text-[#849495]">Pasien: Neo-0824-A (Ananda Putra)</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          <div className="sm:text-right">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.1em] text-[#849495]">Device ID</p>
            <p className="mt-0.5 font-display text-sm font-bold text-[#e1fdff]">{current.deviceId || DEFAULT_DEVICE_ID}</p>
          </div>
          <span className="hidden h-8 w-px bg-[#3a494b] sm:block" />
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${online ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : simulationActive ? "border-[#00f2ff]/20 bg-[#00f2ff]/10 text-[#00f2ff]" : "border-[#ffb4ab]/20 bg-[#ffb4ab]/10 text-[#ffb4ab]"}`}>
            <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-emerald-400" : simulationActive ? "animate-pulse bg-[#00f2ff]" : "bg-[#ffb4ab]"}`} />
            {online ? "Online" : simulationActive ? "Simulasi" : connectionStatus}
          </div>
          <Bell className="text-[#b9cacb]" size={19} />
          <CircleUserRound className="text-[#b9cacb]" size={20} />
        </div>
      </div>
    </header>
  );
}

function RealtimeMetrics({ current }) {
  const sqi = Number(current.sqi);
  const signal = Number.isFinite(sqi) ? sqi : 0;
  const motion = formatMotion(current.motion);
  const status = statusOf(current.alertStatus);
  const critical = current.alertStatus === "HIPOKSIA";

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-lg border border-white/5 border-l-4 border-l-[#fed83a] bg-[#192122]/80 p-5">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[#849495]">Signal Quality Index</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <strong className="font-display text-2xl text-[#fed83a]">{toDisplayValue(current.sqi, "%")}</strong>
          <div className="mb-2 h-1.5 w-24 overflow-hidden rounded-full bg-[#2e3637]">
            <div className="h-full bg-[#fed83a]" style={{ width: `${Math.min(100, Math.max(0, signal))}%` }} />
          </div>
        </div>
        <p className="mt-1 text-[10px] text-[#849495]">{signal >= 80 ? "Excellent probe coupling" : "Periksa posisi probe"}</p>
      </article>

      <article className="rounded-lg border border-white/5 border-l-4 border-l-[#e1fdff] bg-[#192122]/80 p-5">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[#849495]">Motion Index</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <strong className="truncate font-display text-2xl text-[#e1fdff]">{motion}</strong>
          <CheckCircle2 size={21} className="shrink-0 text-[#dce4e4]" />
        </div>
        <p className="mt-1 text-[10px] text-[#849495]">Minimal sensor movement</p>
      </article>

      <article className={`rounded-lg border border-white/5 border-l-4 bg-[#192122]/80 p-5 ${critical ? "border-l-[#ffb4ab]" : "border-l-emerald-400"}`}>
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[#849495]">Alert Status</p>
        <div className="mt-2 flex items-center gap-3">
          <div className={`grid h-8 w-8 place-items-center rounded ${critical ? "bg-[#ffb4ab]/10 text-[#ffb4ab]" : "bg-emerald-500/10 text-emerald-400"}`}>
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <strong className={`block truncate text-sm ${critical ? status.tone : "text-[#dce4e4]"}`}>{critical ? "Critical Alarm" : "No Critical Alarms"}</strong>
            <p className="mt-0.5 text-[10px] text-[#849495]">Status: {status.label}</p>
          </div>
        </div>
      </article>
    </section>
  );
}

function WaveformCard({ title, wavelength, data, dataKey, color, currentValue, baseline }) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#151d1e]/85 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.08em] text-[#b9cacb]">{title}</h3>
          {title.includes("rSO2") ? <p className="mt-1 text-[10px] text-[#3a494b]">Renal Tissue Oxygen Saturation</p> : null}
        </div>
        <div className="flex items-center gap-5">
          {baseline ? (
            <div className="hidden items-center gap-4 text-[10px] uppercase text-[#849495] sm:flex">
              <span className="flex items-center gap-2"><i className="h-1 w-3 bg-[#00f2ff]" />Current</span>
              <span className="flex items-center gap-2"><i className="h-px w-3 border-t border-dashed border-[#3a494b]" />Baseline (65%)</span>
            </div>
          ) : null}
          {currentValue !== undefined ? (
            <div className="text-right">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[#849495]">Current rSO2</p>
              <p className="font-display text-2xl font-bold text-[#00f2ff]">{formatRso2(currentValue)} <span className="text-base">%</span></p>
            </div>
          ) : (
            <span className="rounded bg-[#00f2ff]/10 px-2 py-1 font-display text-[10px] font-bold text-[#00f2ff]">{wavelength}</span>
          )}
        </div>
      </div>

      <div className="realtime-chart-grid relative h-[360px] overflow-hidden rounded-lg border border-white/5 sm:h-[500px]">
        {title.includes("RED") ? <span className="absolute bottom-0 top-0 z-10 w-px bg-[#00f2ff]/30 shadow-[0_0_10px_rgba(0,242,255,0.5)]" style={{ left: "85%" }} /> : null}
        {baseline ? <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><span className="font-display text-3xl font-bold uppercase tracking-[0.16em] text-white/10 sm:text-5xl">Live Waveform</span></div> : null}
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 1000, height: 500 }}>
          <LineChart data={data} margin={{ top: 22, right: 18, bottom: 18, left: 4 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.035)" vertical={false} />
            <XAxis
              dataKey="second"
              axisLine={{ stroke: "#3a494b" }}
              tickLine={false}
              tick={{ fill: "#849495", fontSize: 11 }}
              tickFormatter={(value) => `${value}s`}
              minTickGap={24}
            />
            <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} width={46} axisLine={false} tickLine={false} tick={{ fill: "#dce4e4", fontSize: 12, fontWeight: 700 }} tickFormatter={(value) => `${value}%`} />
            {baseline ? <ReferenceLine y={65} stroke="#3a494b" strokeDasharray="6 6" /> : null}
            <Tooltip
              contentStyle={{ background: "#151d1e", border: "1px solid #3a494b", borderRadius: "8px", color: "#dce4e4" }}
              labelStyle={{ color: "#849495" }}
              labelFormatter={(value) => `Waktu: ${value} detik`}
              formatter={(value) => {
                const numericValue = Number(value);
                return Number.isFinite(numericValue) ? numericValue.toFixed(2) : value;
              }}
            />
            <Line type="monotone" dataKey={dataKey} name={title} stroke={color} strokeWidth={3} dot={false} isAnimationActive animationDuration={650} style={{ filter: `drop-shadow(0 0 5px ${color}80)` }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function RealtimeView({ current, connectionStatus, chartData, lastError, topic, brokerUrl, simulationEnabled, onToggleSimulation }) {
  const mqttConnected = connectionStatus === "connected";

  return (
    <>
      <RealtimeHeader current={current} connectionStatus={connectionStatus} simulationEnabled={simulationEnabled} />
      <div className="dashboard-grid min-h-[calc(100vh-78px)] px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-[1320px] space-y-4">
          <RealtimeMetrics current={current} />
          <WaveformCard title="RED Raw Signal" wavelength="660 nm" data={chartData} dataKey="redLevel" color="#00f2ff" />
          <WaveformCard title="IR Raw Signal" wavelength="940 nm" data={chartData} dataKey="irLevel" color="#76d6d5" />
          <WaveformCard title="Grafik rSO2 Realtime" data={chartData} dataKey="rso2" color="#00f2ff" currentValue={current.rso2} baseline />

          <div className="flex flex-wrap items-center gap-3 px-1 py-2">
            <button
              type="button"
              onClick={onToggleSimulation}
              disabled={mqttConnected}
              className="inline-flex items-center gap-2 rounded border border-[#00f2ff]/35 bg-[#00f2ff]/10 px-4 py-2 text-sm font-semibold text-[#00f2ff] transition hover:bg-[#00f2ff]/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Radio size={16} className={simulationEnabled && !mqttConnected ? "animate-pulse" : ""} />
              {mqttConnected ? "MQTT Aktif" : simulationEnabled ? "Hentikan Simulasi" : "Mulai Simulasi"}
            </button>
            <span className="text-xs text-[#849495]">Topic: {topic}</span>
            <span className="text-xs text-[#849495]">Broker: {brokerUrl}</span>
            {lastError ? <span className="text-xs text-[#ffb4ab]">{lastError}</span> : null}
          </div>
        </div>
      </div>
      <footer className="bg-[#080f10] p-6 text-center font-display text-[9px] uppercase text-[#3a494b]">NIRWANA-AI System V2.4.1 | Prototype Clinical Research Project | 2026</footer>
    </>
  );
}

function HistoryTable({ history }) {
  return (
    <div data-testid="history-table" className="hidden overflow-x-auto scrollbar-thin md:block">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-[#b9cacb]">
          <tr>
            {["Waktu", "rSO2", "RED", "IR", "Ratio", "Motion", "SQI", "Battery", "Status"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id} className="border-b border-white/5">
              <td className="px-4 py-3 text-[#b9cacb]">{formatDateTime(item.timestamp)}</td>
              <td className="px-4 py-3 font-mono text-white">{toDisplayValue(item.rso2, "%")}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.red)}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.ir)}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.ratio)}</td>
              <td className="px-4 py-3">{toDisplayValue(item.motion)}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.sqi, "%")}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.battery, "%")}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.alertStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryCards({ history }) {
  return (
    <div data-testid="history-cards" className="space-y-3 md:hidden">
      {history.map((item) => (
        <article key={item.id} className="rounded-lg border border-white/10 bg-[#192122]/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{formatDateTime(item.timestamp)}</p>
              <p className="mt-1 text-xs text-[#b9cacb]">{item.deviceId || DEFAULT_DEVICE_ID}</p>
            </div>
            <StatusBadge status={item.alertStatus} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ["rSO2", toDisplayValue(item.rso2, "%")],
              ["RED", toDisplayValue(item.red)],
              ["IR", toDisplayValue(item.ir)],
              ["Ratio", toDisplayValue(item.ratio)],
              ["Motion", toDisplayValue(item.motion)],
              ["SQI", toDisplayValue(item.sqi, "%")],
              ["Battery", toDisplayValue(item.battery, "%")],
            ].map(([label, value]) => (
              <div key={label} className="rounded bg-black/15 p-3">
                <dt className="text-xs text-[#b9cacb]">{label}</dt>
                <dd className="mt-1 font-mono text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

function HistoryPanel({ history, onExport, onClear, message }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#161b26]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">Database</p>
          <h2 className="font-display text-lg font-semibold text-[#dce4e4]">Riwayat Data</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="export-pdf"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded bg-[#00f2ff] px-4 py-2 text-sm font-semibold text-[#002022] transition hover:shadow-[0_0_15px_rgba(0,242,255,0.25)]"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            type="button"
            data-testid="clear-history"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded border border-white/10 px-4 py-2 text-sm font-semibold text-[#b9cacb] transition hover:border-[#ffb4ab]/40 hover:text-[#ffb4ab]"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        </div>
      </div>

      {message ? (
        <p className="mx-5 mt-4 rounded border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
          {message}
        </p>
      ) : null}

      <div className="p-5">
        {history.length ? (
          <>
            <HistoryTable history={history} />
            <HistoryCards history={history} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 py-10 text-center text-sm text-[#b9cacb]">
            Belum ada data riwayat monitoring.
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [brokerUrl] = useState(process.env.NEXT_PUBLIC_MQTT_URL || DEFAULT_BROKER_URL);
  const [topic] = useState(process.env.NEXT_PUBLIC_MQTT_TOPIC || DEFAULT_TOPIC);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [history, setHistory] = useState([]);
  const [lastError, setLastError] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [activeView, setActiveView] = useState("realtime");
  const [simulationEnabled, setSimulationEnabled] = useState(true);
  const demoIndex = useRef(0);

  useEffect(() => {
    let timeoutId;
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return undefined;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        timeoutId = window.setTimeout(() => {
          setHistory(parsed.slice(0, HISTORY_LIMIT));
        }, 0);
      }
    } catch {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  }, [history]);

  useEffect(() => {
    let client;
    let mounted = true;

    async function connectMqtt() {
      try {
        const mqtt = await import("mqtt/dist/mqtt.esm");
        client = mqtt.connect(brokerUrl, {
          reconnectPeriod: 3000,
          connectTimeout: 5000,
          clean: true,
        });

        client.on("connect", () => {
          if (!mounted) return;
          setConnectionStatus("connected");
          setLastError("");
          client.subscribe(topic, (error) => {
            if (error) setLastError(`Gagal subscribe topic ${topic}`);
          });
        });

        client.on("reconnect", () => {
          if (mounted) setConnectionStatus("reconnecting");
        });

        client.on("close", () => {
          if (mounted) setConnectionStatus("disconnected");
        });

        client.on("error", () => {
          if (mounted) {
            setConnectionStatus("error");
            setLastError("Koneksi MQTT belum tersedia. Dashboard tetap dapat digunakan untuk demo lokal.");
          }
        });

        client.on("message", (_, message) => {
          try {
            const item = parseTelemetryMessage(message);
            setHistory((current) => [item, ...current].slice(0, HISTORY_LIMIT));
            setLastError("");
          } catch {
            setLastError("Payload MQTT tidak valid dan diabaikan.");
          }
        });
      } catch {
        setConnectionStatus("error");
        setLastError("Library MQTT gagal dimuat.");
      }
    }

    connectMqtt();

    return () => {
      mounted = false;
      if (client) client.end(true);
    };
  }, [brokerUrl, topic]);

  useEffect(() => {
    if (!simulationEnabled || connectionStatus === "connected") return undefined;

    const intervalId = window.setInterval(() => {
      const item = createDemoTelemetry(demoIndex.current);
      demoIndex.current += 1;
      setHistory((currentHistory) => [item, ...currentHistory].slice(0, HISTORY_LIMIT));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [connectionStatus, simulationEnabled]);

  const current = history[0];
  const displayCurrent = current || dashboardFallback;
  const chartData = useMemo(() => {
    if (!history.length) {
      return Array.from({ length: 30 }, (_, index) => ({
        second: index,
        rso2: 51 + Math.sin(index * 0.55) * (5 + index * 0.28),
        redLevel: 50 + Math.sin(index * 0.62) * 18 + Math.cos(index * 0.21) * 6,
        irLevel: 54 + Math.cos(index * 0.53) * 15 + Math.sin(index * 0.26) * 7,
      }));
    }

    const ordered = history.slice().reverse();
    const normalize = (value, values) => {
      const numeric = values.filter(Number.isFinite);
      if (!numeric.length || !Number.isFinite(value)) return null;
      const min = Math.min(...numeric);
      const max = Math.max(...numeric);
      if (max === min) return 50;
      return 15 + ((value - min) / (max - min)) * 70;
    };
    const redValues = ordered.map((item) => Number(item.red));
    const irValues = ordered.map((item) => Number(item.ir));

    return ordered.map((item, index) => ({
      second: index,
      rso2: Number(item.rso2),
      redLevel: normalize(Number(item.red), redValues),
      irLevel: normalize(Number(item.ir), irValues),
    }));
  }, [history]);

  function addDemoData() {
    const item = createDemoTelemetry(demoIndex.current);
    demoIndex.current += 1;
    setHistory((currentHistory) => [item, ...currentHistory].slice(0, HISTORY_LIMIT));
    setHistoryMessage("");
  }

  function clearHistory() {
    setHistory([]);
    setHistoryMessage("Riwayat data telah dihapus.");
  }

  function handleExport() {
    if (!history.length) {
      setHistoryMessage("Data riwayat masih kosong");
      return;
    }

    exportHistoryToPDF(history);
    setHistoryMessage("PDF riwayat monitoring berhasil dibuat.");
  }

  const realtimeCurrent = current || realtimeFallback;

  return (
    <main className="min-h-screen bg-[#080f10] text-[#dce4e4]">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="min-h-screen lg:ml-[280px]">
        <MobileNavigation activeView={activeView} onNavigate={setActiveView} />

        {activeView === "realtime" ? (
          <RealtimeView
            current={realtimeCurrent}
            connectionStatus={connectionStatus}
            chartData={chartData}
            lastError={lastError}
            topic={topic}
            brokerUrl={brokerUrl}
            simulationEnabled={simulationEnabled}
            onToggleSimulation={() => setSimulationEnabled((enabled) => !enabled)}
          />
        ) : activeView === "history" ? (
          <>
            <TopAppBar current={displayCurrent} />
            <div className="dashboard-grid min-h-[calc(100vh-81px)] px-5 py-6 sm:px-8">
              <div className="mx-auto max-w-[1240px]">
                <HistoryPanel history={history} onExport={handleExport} onClear={clearHistory} message={historyMessage} />
              </div>
            </div>
          </>
        ) : (
          <>
            <TopAppBar current={displayCurrent} />

            <div className="dashboard-grid min-h-[calc(100vh-81px)] overflow-y-auto px-5 py-6 sm:px-8">
              <div className="mx-auto max-w-[1240px] space-y-8">
                <section className="min-h-[calc(100vh-145px)] space-y-8">
                  <TopStatusStrip current={displayCurrent} connectionStatus={connectionStatus} />
                  <DashboardCards current={displayCurrent} />

                  <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <WarningPanel status={displayCurrent.alertStatus} />
                    <DeviceInfoPanel current={displayCurrent} connectionStatus={connectionStatus} lastError={lastError} />
                  </section>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      data-testid="demo-data"
                      onClick={addDemoData}
                      className="inline-flex items-center gap-2 rounded border border-[#00f2ff]/35 bg-[#00f2ff]/10 px-4 py-2 text-sm font-semibold text-[#00f2ff] transition hover:bg-[#00f2ff]/15"
                    >
                      <Radio size={16} />
                      Data Dummy
                    </button>
                    <span className="text-sm text-[#849495]">Topic: {topic}</span>
                    <span className="text-sm text-[#849495]">Broker: {brokerUrl}</span>
                  </div>
                </section>

              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
