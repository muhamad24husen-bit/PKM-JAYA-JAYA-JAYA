import { Wifi, WifiOff } from "lucide-react";
import { shortDateTime } from "@/lib/format";
import { DEFAULT_DEVICE_ID, toDisplayValue } from "@/lib/telemetry";
import { profile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";

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
      <Card title="Informasi Perangkat" className="lg:col-span-2">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded bg-nirwana-surfaceMuted p-3">
              <dt className="text-xs text-nirwana-muted">{label}</dt>
              <dd className="mt-1 break-all font-medium text-nirwana-text">{value}</dd>
            </div>
          ))}
          <div className="rounded bg-nirwana-surfaceMuted p-3">
            <dt className="text-xs text-nirwana-muted">TinyML</dt>
            <dd className="mt-1 w-max rounded border border-nirwana-border bg-nirwana-surface px-2 py-0.5 text-xs font-semibold text-nirwana-text">
              Aktif
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Status Koneksi">
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-full ${online ? "bg-nirwana-normalSoft text-nirwana-normal" : "bg-nirwana-hipoksiaSoft text-nirwana-hipoksia"}`}>
            {online ? <Wifi size={24} /> : <WifiOff size={24} />}
          </div>
          <div>
            <p className={`text-lg font-semibold ${online ? "text-nirwana-normal" : "text-nirwana-hipoksia"}`}>
              {online ? "ONLINE" : connectionStatus}
            </p>
            <p className="text-xs text-nirwana-muted">Update: {shortDateTime(current.timestamp)}</p>
          </div>
        </div>
        {lastError ? (
          <p className="mt-5 rounded border border-nirwana-waspada/25 bg-nirwana-waspadaSoft px-3 py-2 text-sm text-nirwana-waspada">
            {lastError}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
