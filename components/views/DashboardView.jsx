import {
  Activity,
  Battery,
  CheckCircle2,
  Clock3,
  Cpu,
  Radio,
  Shield,
  ShieldAlert,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { formatMotion, formatRso2, shortDateTime, signalLabel, statusOf } from "@/lib/format";
import { DEFAULT_DEVICE_ID, toDisplayValue } from "@/lib/telemetry";
import { profile } from "@/lib/profile";
import { SummaryCard } from "@/components/ui/SummaryCard";

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
    ["Subjek", profile.patientSubject],
    ["Mode", "Prototype"],
    ["Koneksi", connectionStatus === "connected" ? "MQTT / WiFi" : "Terputus"],
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

export function DashboardView({ current, connectionStatus, lastError, topic, telemetryApiUrl, onAddDemo }) {
  return (
    <section className="space-y-8">
      <TopStatusStrip current={current} connectionStatus={connectionStatus} />
      <DashboardCards current={current} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <WarningPanel status={current.alertStatus} />
        <DeviceInfoPanel current={current} connectionStatus={connectionStatus} lastError={lastError} />
      </section>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          data-testid="demo-data"
          onClick={onAddDemo}
          className="inline-flex items-center gap-2 rounded border border-[#00f2ff]/35 bg-[#00f2ff]/10 px-4 py-2 text-sm font-semibold text-[#00f2ff] transition hover:bg-[#00f2ff]/15"
        >
          <Radio size={16} />
          Data Dummy
        </button>
        <span className="text-sm text-[#849495]">Topic: {topic}</span>
        <span className="text-sm text-[#849495]">Backend: {telemetryApiUrl}</span>
      </div>
    </section>
  );
}
