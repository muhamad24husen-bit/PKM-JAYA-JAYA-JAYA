import { Bell, CheckCircle2, CircleUserRound, Shield } from "lucide-react";
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
import { formatMotion, formatRso2, statusOf } from "@/lib/format";
import { DEFAULT_DEVICE_ID, toDisplayValue } from "@/lib/telemetry";
import { profile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";

function RealtimeHeader({ current, connectionStatus }) {
  const online = connectionStatus === "connected";

  return (
    <header className="sticky top-0 z-20 border-b border-nirwana-border bg-nirwana-surface px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-nirwana-text">
            Monitoring Realtime
          </h2>
          <p className="mt-1 text-xs text-nirwana-muted">
            Pasien: {profile.patientCode} ({profile.patientName})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">
              Device ID
            </p>
            <p className="mt-0.5 text-sm font-semibold text-nirwana-text">
              {current.deviceId || DEFAULT_DEVICE_ID}
            </p>
          </div>
          <span className="hidden h-8 w-px bg-nirwana-border sm:block" />
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${
              online
                ? "border-nirwana-normal/25 bg-nirwana-normalSoft text-nirwana-normal"
                : "border-nirwana-hipoksia/25 bg-nirwana-hipoksiaSoft text-nirwana-hipoksia"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-nirwana-normal" : "bg-nirwana-hipoksia"}`}
            />
            {online ? "Online" : connectionStatus}
          </div>
          <Bell className="text-nirwana-muted" size={19} />
          <CircleUserRound className="text-nirwana-muted" size={20} />
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
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"> 
      <Card className="!border-l-4 !border-l-nirwana-waspada">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">
          Signal Quality Index
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <strong className="text-2xl font-semibold text-nirwana-waspada">
            {toDisplayValue(current.sqi, "%")}
          </strong>
          <div className="mb-2 h-1.5 w-24 overflow-hidden rounded-full bg-nirwana-surfaceMuted">
            <div
              className="h-full bg-nirwana-waspada"
              style={{ width: `${Math.min(100, Math.max(0, signal))}%` }}
            />
          </div>
        </div>
        <p className="mt-1 text-[10px] text-nirwana-muted">
          {signal >= 80 ? "Excellent probe coupling" : "Periksa posisi probe"}
        </p>
      </Card>

      <Card className="!border-l-4 !border-l-nirwana-accent">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">
          Motion Index
        </p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <strong className="truncate text-2xl font-semibold text-nirwana-text">
            {motion}
          </strong>
          <CheckCircle2 size={21} className="shrink-0 text-nirwana-muted" />
        </div>
        <p className="mt-1 text-[10px] text-nirwana-muted">
          Minimal sensor movement
        </p>
      </Card>

      <Card
        className={`!border-l-4 ${critical ? "!border-l-nirwana-hipoksia" : "!border-l-nirwana-normal"}`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">
          Alert Status
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div
            className={`grid h-8 w-8 place-items-center rounded ${critical ? "bg-nirwana-hipoksiaSoft text-nirwana-hipoksia" : "bg-nirwana-normalSoft text-nirwana-normal"}`}
          >
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <strong
              className={`block truncate text-sm ${critical ? status.tone : "text-nirwana-text"}`}
            >
              {critical ? "Critical Alarm" : "No Critical Alarms"}
            </strong>
            <p className="mt-0.5 text-[10px] text-nirwana-muted">
              Status: {status.label}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

function WaveformCard({
  title,
  wavelength,
  data,
  dataKey,
  color,
  currentValue,
  baseline,
}) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-nirwana-muted">
            {title}
          </h3>
          {title.includes("rSO2") ? (
            <p className="mt-1 text-[10px] text-nirwana-muted">
              Renal Tissue Oxygen Saturation
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-5">
          {baseline ? (
            <div className="hidden items-center gap-4 text-[10px] uppercase text-nirwana-muted sm:flex">
              <span className="flex items-center gap-2">
                <i className="h-1 w-3 bg-nirwana-accent" />
                Current
              </span>
              <span className="flex items-center gap-2">
                <i className="h-px w-3 border-t border-dashed border-nirwana-border" />
                Baseline (65%)
              </span>
            </div>
          ) : null}
          {currentValue !== undefined ? (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">
                Current rSO2
              </p>
              <p className="text-2xl font-semibold text-nirwana-accent">
                {formatRso2(currentValue)} <span className="text-base">%</span>
              </p>
            </div>
          ) : (
            <span className="rounded bg-nirwana-accentSoft px-2 py-1 text-[10px] font-semibold text-nirwana-accent">
              {wavelength}
            </span>
          )}
        </div>
      </div>

      <div className="h-[320px] w-full rounded-lg border border-nirwana-border sm:h-[420px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={0}
          initialDimension={{ width: 1000, height: 500 }}
        >
          <LineChart
            data={data}
            margin={{ top: 22, right: 18, bottom: 18, left: 4 }}
          >
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis
              dataKey="second"
              axisLine={{ stroke: "#e4e7eb" }}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickFormatter={(value) => `${value}s`}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              width={46}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#14181b", fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => `${value}%`}
            />
            {baseline ? (
              <ReferenceLine y={65} stroke="#e4e7eb" strokeDasharray="6 6" />
            ) : null}
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e4e7eb",
                borderRadius: "8px",
                color: "#14181b",
              }}
              labelStyle={{ color: "#6b7280" }}
              labelFormatter={(value) => `Waktu: ${value} detik`}
              formatter={(value) => {
                const numericValue = Number(value);
                return Number.isFinite(numericValue)
                  ? numericValue.toFixed(2)
                  : value;
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RealtimeView({
  current,
  connectionStatus,
  chartData,
  lastError,
  topic,
  telemetryApiUrl,
}) {
  return (
    <>
      <RealtimeHeader current={current} connectionStatus={connectionStatus} />
      <div className="min-h-[calc(100vh-78px)] bg-nirwana-background px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-[1320px] space-y-4">
          <RealtimeMetrics current={current} />
          <WaveformCard
            title="Grafik rSO2 Realtime"
            data={chartData}
            dataKey="rso2"
            color="#0f766e"
            currentValue={current.rso2}
            baseline
          />
          <WaveformCard
            title="Sinyal Inframerah"
            wavelength="940 nm"
            data={chartData}
            dataKey="irLevel"
            color="#0891b2"
          />
          <WaveformCard
            title="Sinyal Cahaya Merah"
            wavelength="660 nm"
            data={chartData}
            dataKey="redLevel"
            color="#0f766e"
          />

          <div className="flex flex-wrap items-center gap-3 px-1 py-2">
            <span className="text-xs text-nirwana-muted">Topic: {topic}</span>
            <span className="text-xs text-nirwana-muted">
              Backend: {telemetryApiUrl}
            </span>
            {lastError ? (
              <span className="text-xs text-nirwana-hipoksia">{lastError}</span>
            ) : null}
          </div>
        </div>
      </div>
      <footer className="bg-nirwana-surface p-6 text-center text-[9px] uppercase tracking-wide text-nirwana-muted">
        NIRWANA-AI System V2.4.1 | Prototype Clinical Research Project | 2026
      </footer>
    </>
  );
}