import { Wifi, WifiOff } from "lucide-react";
import { shortDateTime } from "@/lib/format";
import { DEFAULT_DEVICE_ID, toDisplayValue } from "@/lib/telemetry";
import { profile } from "@/lib/profile";

export function DeviceView({ current, connectionStatus, lastError, topic, telemetryApiUrl }) {
  const online = connectionStatus === "connected";
  const rows = [
    ["Subjek", profile.patientSubject],
    ["Device ID", current.deviceId || DEFAULT_DEVICE_ID],
    ["Mode", "Prototype"],
    ["Topic MQTT", topic],
    ["Backend", telemetryApiUrl],
    ["Baterai", toDisplayValue(current.battery, "%")],
  ];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="rounded-lg border border-white/10 bg-[#161b26] p-5 lg:col-span-2">
        <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
          Informasi Perangkat
        </h3>
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded bg-black/15 p-3">
              <dt className="text-xs text-[#849495]">{label}</dt>
              <dd className="mt-1 break-all font-medium text-[#dce4e4]">{value}</dd>
            </div>
          ))}
          <div className="rounded bg-black/15 p-3">
            <dt className="text-xs text-[#849495]">TinyML</dt>
            <dd className="mt-1 w-max rounded border border-[#dce4e4]/30 bg-[#dce4e4]/10 px-2 py-0.5 text-xs font-bold text-[#dce4e4]">
              Aktif
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#161b26] p-5">
        <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
          Status Koneksi
        </h3>
        <div className="mt-5 flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-full ${online ? "bg-emerald-500/10 text-emerald-400" : "bg-[#ffb4ab]/10 text-[#ffb4ab]"}`}>
            {online ? <Wifi size={24} /> : <WifiOff size={24} />}
          </div>
          <div>
            <p className={`font-display text-lg font-bold ${online ? "text-emerald-400" : "text-[#ffb4ab]"}`}>
              {online ? "ONLINE" : connectionStatus}
            </p>
            <p className="text-xs text-[#849495]">Update: {shortDateTime(current.timestamp)}</p>
          </div>
        </div>
        {lastError ? (
          <p className="mt-5 rounded border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
            {lastError}
          </p>
        ) : null}
      </section>
    </section>
  );
}
