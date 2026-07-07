"use client";

import { useMemo } from "react";
import {
  Asterisk,
  BatteryFull,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRso2, statusOf } from "@/lib/format";
import { DEFAULT_DEVICE_ID } from "@/lib/telemetry";
import { profile } from "@/lib/profile";

const STATUS_STYLE = {
  NORMAL: { color: "#34d399", solid: "bg-emerald-400 text-[#00363a]", ghost: "border-white/8 bg-[#192122]/50 text-[#849495]" },
  WASPADA: { color: "#fed83a", solid: "bg-[#fed83a] text-[#3b2f00]", ghost: "border-[#fed83a]/30 bg-[#fed83a]/8 text-[#fed83a]" },
  HIPOKSIA: { color: "#ff8f89", solid: "bg-[#ffb4ab] text-[#690005]", ghost: "border-[#ff8f89]/30 bg-[#ff8f89]/8 text-[#ff8f89]" },
};

const pct = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "-");

function DeviceStrip({ current, connectionStatus }) {
  const online = connectionStatus === "connected";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#161b26] px-5 py-4 sm:px-6">
      <span className="absolute inset-y-0 left-0 w-1 bg-[#00f2ff]" />
      <div className="flex flex-col gap-4 pl-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00f2ff]/10 text-[#00f2ff]">
            <Cpu size={18} strokeWidth={1.5} />
          </span>
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="text-[#849495]">ID Perangkat:</span>
            <span className="font-display font-bold text-[#dce4e4]">{current.deviceId || DEFAULT_DEVICE_ID}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span
            className={`inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.08em] ${
              online ? "text-emerald-400" : "text-[#ff8f89]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-emerald-400" : "bg-[#ff8f89]"}`} />
            {online ? "Online" : "Terputus"}
          </span>

          <span className="inline-flex items-center gap-2 text-sm">
            <ShieldCheck size={16} strokeWidth={1.5} className="text-[#849495]" />
            <span className="font-display font-bold uppercase tracking-[0.06em] text-[#849495]">Sinyal:</span>
            <span className="font-display font-bold text-[#00f2ff]">{pct(current.sqi)}</span>
          </span>

          <span className="inline-flex items-center gap-2 text-sm">
            <BatteryFull size={16} strokeWidth={1.5} className="text-emerald-400" />
            <span className="font-display font-bold uppercase tracking-[0.06em] text-[#849495]">Baterai:</span>
            <span className="font-display font-bold text-emerald-400">{pct(current.battery)}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function MiniWave({ data, color }) {
  const gradientId = `dash-wave-${color.replace("#", "")}`;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 h-10 w-28 sm:w-36">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="rso2"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Rso2HourlyChart({ data, critical }) {
  const color = critical ? "#ff8f89" : "#00f2ff";
  const average = data.length
    ? (data.reduce((sum, point) => sum + point.rso2, 0) / data.length).toFixed(1)
    : "-";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#161b26]">
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#b9cacb]">
            Grafik rSO&#8322; Ginjal &mdash; Rata-rata per Jam
          </h3>
          <p className="mt-1 text-xs text-[#849495]">Renal Tissue Oxygen Saturation (rata-rata tiap jam)</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.1em] text-[#849495]">Rata-rata</p>
          <p className="font-display text-3xl font-bold leading-none" style={{ color, textShadow: `0 0 18px ${color}55` }}>
            {average}
            <span className="ml-1 text-base text-[#849495]">%</span>
          </p>
        </div>
      </div>

      <div className="chart-grid h-[260px] w-full sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 12, left: 0 }}>
            <defs>
              <linearGradient id="rso2-hourly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: "#3a494b" }}
              tickLine={false}
              tick={{ fill: "#849495", fontSize: 11 }}
              minTickGap={20}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              width={40}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#dce4e4", fontSize: 11, fontWeight: 700 }}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={65} stroke="#3a494b" strokeDasharray="6 6" />
            <Tooltip
              contentStyle={{ background: "#151d1e", border: "1px solid #3a494b", borderRadius: "8px", color: "#dce4e4" }}
              labelStyle={{ color: "#849495" }}
              labelFormatter={(value) => `Pukul ${value}`}
              formatter={(value) => {
                const numericValue = Number(value);
                return [Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : value, "rSO2 rata-rata"];
              }}
            />
            <Area
              type="monotone"
              dataKey="rso2"
              stroke={color}
              strokeWidth={3}
              fill="url(#rso2-hourly)"
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={600}
              style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function StatCard({ label, icon: Icon, iconColor, accent, danger = false, children, wave, waveColor }) {
  return (
    <section
      className={`relative min-h-[150px] overflow-hidden rounded-2xl border bg-[#161b26] p-5 ${
        danger ? "border-[#ff8f89]/55 shadow-danger" : "border-white/10"
      }`}
    >
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: danger ? 0.9 : 0.35 }}
      />
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#b9cacb]">{label}</h3>
        <Icon size={20} strokeWidth={1.5} color={iconColor} />
      </div>
      <div className="mt-6">{children}</div>
      {wave ? <MiniWave data={wave} color={waveColor || accent} /> : null}
    </section>
  );
}

function AlertStatusPanel({ status }) {
  const items = [
    ["NORMAL", "Normal", CheckCircle2],
    ["WASPADA", "Waspada", TriangleAlert],
    ["HIPOKSIA", "Hipoksia", Asterisk],
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#161b26] p-5 lg:col-span-4">
      <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#b9cacb]">
        Status Peringatan
      </h3>
      <div className="mt-5 flex flex-col gap-3">
        {items.map(([key, label, Icon]) => {
          const active = key === status;
          const style = STATUS_STYLE[key];

          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                active
                  ? `${style.solid} border border-transparent font-bold ${key === "HIPOKSIA" ? "shadow-danger" : ""}`
                  : `border ${style.ghost}`
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
              <span className="font-display text-sm font-semibold">{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeviceInfoPanel({ connectionStatus }) {
  const online = connectionStatus === "connected";
  const rows = [
    ["Subjek", profile.patientSubject],
    ["Mode", "Prototype"],
    ["Koneksi", online ? "BLE / WiFi" : "Terputus"],
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#161b26] p-5 sm:p-6 lg:col-span-8">
      <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#b9cacb]">
        Informasi Perangkat
      </h3>
      <dl className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-[#849495]">{label}</dt>
            <dd className="mt-0.5 break-all font-medium text-[#dce4e4]">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-[#849495]">TinyML</dt>
          <dd className="mt-1.5">
            <span className="inline-flex items-center rounded-md border border-white/10 bg-[#232b2c] px-2.5 py-1 text-xs font-bold text-[#dce4e4]">
              Aktif
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function DashboardView({ current, connectionStatus, history = [] }) {
  const critical = current.alertStatus === "HIPOKSIA";
  const meta = statusOf(current.alertStatus);
  const status = STATUS_STYLE[current.alertStatus] || STATUS_STYLE.NORMAL;
  const rso2Color = critical ? "#ff8f89" : "#00f2ff";

  const trend = useMemo(() => {
    const source = history.filter((item) => Number.isFinite(Number(item?.rso2)));
    if (source.length > 1) {
      return source
        .slice(0, 40)
        .reverse()
        .map((item, index) => ({ t: index, rso2: Number(item.rso2) }));
    }
    return Array.from({ length: 24 }, (_, index) => ({
      t: index,
      rso2: Number((66 + Math.sin(index * 0.5) * 6 + Math.sin(index * 0.19) * 3).toFixed(1)),
    }));
  }, [history]);

  const hourlyTrend = useMemo(() => {
    const buckets = new Map();

    for (const item of history) {
      const value = Number(item?.rso2);
      if (!Number.isFinite(value)) continue;

      const date = new Date(item?.timestamp);
      if (Number.isNaN(date.getTime())) continue;

      const bucketKey = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
      ).getTime();

      const entry = buckets.get(bucketKey) || { sum: 0, count: 0 };
      entry.sum += value;
      entry.count += 1;
      buckets.set(bucketKey, entry);
    }

    const points = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([bucketKey, { sum, count }]) => ({
        label: `${String(new Date(bucketKey).getHours()).padStart(2, "0")}:00`,
        rso2: Number((sum / count).toFixed(1)),
      }));

    if (points.length >= 2) return points;

    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const hour = new Date(now.getTime() - (11 - index) * 3600000).getHours();
      return {
        label: `${String(hour).padStart(2, "0")}:00`,
        rso2: Number((66 + Math.sin(index * 0.6) * 6 + Math.sin(index * 0.22) * 3).toFixed(1)),
      };
    });
  }, [history]);

  return (
    <section className="space-y-6">
      <DeviceStrip current={current} connectionStatus={connectionStatus} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="RSO2 Ginjal"
          icon={TriangleAlert}
          iconColor={critical ? "#ff8f89" : "#849495"}
          accent={rso2Color}
          wave={trend}
          waveColor={rso2Color}
        >
          <p className="font-display text-5xl font-bold leading-none" style={{ color: rso2Color, textShadow: `0 0 18px ${rso2Color}55` }}>
            {formatRso2(current.rso2)}
            <span className="ml-1 align-top text-base font-medium text-[#849495]">%</span>
          </p>
        </StatCard>

        <StatCard label="Status Peringatan" icon={ShieldAlert} iconColor={status.color} accent={status.color} danger={critical}>
          <p className="font-display text-3xl font-bold leading-none sm:text-4xl" style={{ color: status.color }}>
            {meta.header}
          </p>
        </StatCard>
      </div>

      <Rso2HourlyChart data={hourlyTrend} critical={critical} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <AlertStatusPanel status={current.alertStatus} />
        <DeviceInfoPanel connectionStatus={connectionStatus} />
      </div>
    </section>
  );
}
