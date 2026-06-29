import { Bell, CheckCircle2, CircleUserRound, Radio, Shield } from "lucide-react";
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

function RealtimeHeader({ current, connectionStatus, simulationEnabled }) {
  const online = connectionStatus === "connected";
  const simulationActive = simulationEnabled && !online;

  return (
    <header className="sticky top-0 z-20 border-b border-[#3a494b] bg-[#0d1515]/90 px-5 py-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#dce4e4]">Monitoring Realtime</h2>
          <p className="mt-1 text-xs text-[#849495]">Pasien: {profile.patientCode} ({profile.patientName})</p>
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

export function RealtimeView({ current, connectionStatus, chartData, lastError, topic, telemetryApiUrl, simulationEnabled, onToggleSimulation }) {
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
            <span className="text-xs text-[#849495]">Backend: {telemetryApiUrl}</span>
            {lastError ? <span className="text-xs text-[#ffb4ab]">{lastError}</span> : null}
          </div>
        </div>
      </div>
      <footer className="bg-[#080f10] p-6 text-center font-display text-[9px] uppercase text-[#3a494b]">NIRWANA-AI System V2.4.1 | Prototype Clinical Research Project | 2026</footer>
    </>
  );
}
