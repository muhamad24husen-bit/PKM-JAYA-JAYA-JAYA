"use client";

import { useMemo, useState } from "react";
import {
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
import {
  buildTrendSeries,
  describeCoverage,
  DEFAULT_TREND_WINDOW,
  TREND_WINDOWS,
} from "@/lib/trend";
import { profile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";
import { AiInsightCard } from "@/components/ui/AiInsightCard";

const pct = (value) => (Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "-");

function DeviceStrip({ current, connectionStatus }) {
  const online = connectionStatus === "connected";

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-nirwana-accentSoft text-nirwana-accent">
            <Cpu size={18} strokeWidth={1.75} />
          </span>
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="text-nirwana-muted">ID Perangkat:</span>
            <span className="font-semibold text-nirwana-text">{current.deviceId || DEFAULT_DEVICE_ID}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span
            className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
              online ? "text-nirwana-normal" : "text-nirwana-hipoksia"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-nirwana-normal" : "bg-nirwana-hipoksia"}`} />
            {online ? "Online" : "Terputus"}
          </span>

          <span className="inline-flex items-center gap-2 text-sm">
            <ShieldCheck size={16} strokeWidth={1.75} className="text-nirwana-muted" />
            <span className="font-semibold uppercase tracking-wide text-nirwana-muted">Sinyal:</span>
            <span className="font-semibold text-nirwana-accent">{pct(current.sqi)}</span>
          </span>

          <span className="inline-flex items-center gap-2 text-sm">
            <BatteryFull size={16} strokeWidth={1.75} className="text-nirwana-normal" />
            <span className="font-semibold uppercase tracking-wide text-nirwana-muted">Baterai:</span>
            <span className="font-semibold text-nirwana-normal">{pct(current.battery)}</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Rso2TrendChart({ history, rollup, alertStatus }) {
  const color = statusOf(alertStatus).chart;
  const [windowKey, setWindowKey] = useState(DEFAULT_TREND_WINDOW);
  const series = useMemo(
    () => buildTrendSeries({ windowKey, history, rollup }),
    [windowKey, history, rollup],
  );
  const def = series.windowDef;
  const hasChart = series.points.length >= 2;
  const showCoverage = hasChart && series.coverageMs < series.windowMs * 0.95;
  const averageLabel = Number.isFinite(series.average) ? series.average.toFixed(1) : "-";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nirwana-muted">
            Grafik rSO&#8322; Ginjal
          </h3>
          <p className="mt-1 text-xs text-nirwana-muted">
            {def.subLabel} &middot; {def.rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-4">
          <select
            value={windowKey}
            onChange={(event) => setWindowKey(event.target.value)}
            aria-label="Jendela waktu grafik"
            className="rounded-lg border border-nirwana-border bg-white px-2.5 py-1.5 text-xs font-semibold text-nirwana-text focus:outline-none focus:ring-2 focus:ring-nirwana-accent/40"
          >
            {TREND_WINDOWS.map((trendWindow) => (
              <option key={trendWindow.key} value={trendWindow.key}>
                {trendWindow.label}
              </option>
            ))}
          </select>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">Rata-rata</p>
            <p className="text-3xl font-semibold leading-none" style={{ color }}>
              {averageLabel}
              <span className="ml-1 text-base text-nirwana-muted">%</span>
            </p>
          </div>
        </div>
      </div>

      {hasChart ? (
        <div className="mt-5 h-[240px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.points} margin={{ top: 12, right: 20, bottom: 12, left: 0 }}>
              <defs>
                <linearGradient id="rso2-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e4e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "#e4e7eb" }}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                minTickGap={20}
              />
              <YAxis
                domain={[10, 100]}
                ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                width={40}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#14181b", fontSize: 11, fontWeight: 600 }}
                tickFormatter={(value) => `${value}%`}
              />
              {series.baseline ? (
                <ReferenceLine
                  y={series.baseline.value}
                  stroke="#9ca3af"
                  strokeDasharray="6 6"
                  label={{
                    value: `Baseline ${series.baseline.value}%`,
                    position: "insideTopRight",
                    fill: "#6b7280",
                    fontSize: 10,
                  }}
                />
              ) : null}
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e4e7eb", borderRadius: "8px", color: "#14181b" }}
                labelStyle={{ color: "#6b7280" }}
                labelFormatter={(value) => (def.key === "72h" ? value : `Pukul ${value}`)}
                formatter={(value) => {
                  const numericValue = Number(value);
                  return [Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : value, "rSO2 rata-rata"];
                }}
              />
              <Area
                type="monotone"
                dataKey="rso2"
                stroke={color}
                strokeWidth={2.5}
                fill="url(#rso2-trend)"
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                isAnimationActive
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 grid h-[240px] w-full place-items-center rounded-lg border border-dashed border-nirwana-border sm:h-[280px]">
          <p className="text-sm text-nirwana-muted">Belum ada data untuk jendela ini.</p>
        </div>
      )}

      {showCoverage ? (
        <p className="mt-2 text-[11px] text-nirwana-muted">{describeCoverage(series.coverageMs, series.windowMs)}</p>
      ) : null}
    </Card>
  );
}

function StatCard({ label, icon: Icon, iconColor, danger = false, children }) {
  return (
    <Card className={danger ? "!border-nirwana-hipoksia/30" : ""}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nirwana-muted">{label}</h3>
        <Icon size={20} strokeWidth={1.75} color={iconColor} />
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

function AlertStatusPanel({ status }) {
  const items = [
    ["NORMAL", "Normal", CheckCircle2],
    ["WASPADA", "Waspada", TriangleAlert],
    ["HIPOKSIA", "Darurat", ShieldAlert],
  ];

  return (
    <Card title="Status Peringatan" className="lg:col-span-4">
      <div className="flex flex-col gap-3">
        {items.map(([key, label, Icon]) => {
          const active = key === status;
          const meta = statusOf(key);

          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition ${
                active ? `${meta.border} ${meta.bg} font-semibold` : "border-nirwana-border text-nirwana-muted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} className={active ? meta.tone : ""} />
              <span className={`text-sm font-semibold ${active ? meta.tone : ""}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </Card>
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
    <Card title="Informasi Perangkat" className="lg:col-span-8">
      <dl className="space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-wide text-nirwana-muted">{label}</dt>
            <dd className="mt-0.5 break-all font-medium text-nirwana-text">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-nirwana-muted">TinyML</dt>
          <dd className="mt-1.5">
            <span className="inline-flex items-center rounded-md border border-nirwana-border bg-nirwana-surfaceMuted px-2.5 py-1 text-xs font-semibold text-nirwana-text">
              Aktif
            </span>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function DashboardView({ current, connectionStatus, insight, history = [], rollup = null }) {
  const critical = current.alertStatus === "HIPOKSIA";
  const meta = statusOf(current.alertStatus);
  const rso2Color = meta.chart;

  return (
    <section className="space-y-5">
      <DeviceStrip current={current} connectionStatus={connectionStatus} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="RSO2 Ginjal" icon={TriangleAlert} iconColor={rso2Color} danger={critical}>
          <p className="text-5xl font-semibold leading-none" style={{ color: rso2Color }}>
            {formatRso2(current.rso2)}
            <span className="ml-1 align-top text-base font-medium text-nirwana-muted">%</span>
          </p>
        </StatCard>

        <StatCard label="Status Peringatan" icon={ShieldAlert} iconColor={critical ? "#dc2626" : "#6b7280"} danger={critical}>
          <p className={`text-3xl font-semibold leading-none sm:text-4xl ${meta.tone}`}>{meta.header}</p>
        </StatCard>
      </div>

      <AiInsightCard insight={insight} />

      <Rso2TrendChart history={history} rollup={rollup} alertStatus={current.alertStatus} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <AlertStatusPanel status={current.alertStatus} />
        <DeviceInfoPanel connectionStatus={connectionStatus} />
      </div>
    </section>
  );
}
