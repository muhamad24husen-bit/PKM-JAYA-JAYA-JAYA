import { Radio } from "lucide-react";
import { DEFAULT_DEVICE_ID, HISTORY_LIMIT } from "@/lib/telemetry";
import { profile } from "@/lib/profile";

export function SettingsView({ topic, telemetryApiUrl, connectionStatus, simulationEnabled, onToggleSimulation }) {
  const mqttConnected = connectionStatus === "connected";
  const configRows = [
    ["Topic MQTT", topic],
    ["Backend Telemetry", telemetryApiUrl],
    ["Batas Riwayat", `${HISTORY_LIMIT} data`],
    ["Device ID Default", DEFAULT_DEVICE_ID],
  ];
  const profileRows = [
    ["Pasien", `${profile.patientName} (${profile.patientCode})`],
    ["Subjek", profile.patientSubject],
    ["ID Monitor", profile.monitorId],
    ["Klinisi", `${profile.clinicianName} ${profile.clinicianTitle}`],
  ];

  return (
    <section className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-[#161b26] p-5">
        <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
          Konfigurasi Sistem
        </h3>
        <dl className="mt-5 space-y-3">
          {configRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded bg-black/15 px-4 py-3">
              <dt className="text-sm text-[#849495]">{label}</dt>
              <dd className="break-all font-mono text-sm text-[#dce4e4]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[#849495]">
          Konfigurasi diambil dari environment variable. Ubah melalui file .env lalu mulai ulang aplikasi.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#161b26] p-5">
        <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
          Profil Pasien &amp; Klinisi
        </h3>
        <dl className="mt-5 space-y-3">
          {profileRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded bg-black/15 px-4 py-3">
              <dt className="text-sm text-[#849495]">{label}</dt>
              <dd className="break-all font-mono text-sm text-[#dce4e4]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[#849495]">
          Atur melalui variabel NEXT_PUBLIC_PATIENT_NAME, NEXT_PUBLIC_CLINICIAN_NAME, dll di file .env.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#161b26] p-5">
        <h3 className="border-b border-[#3a494b]/45 pb-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">
          Mode Simulasi
        </h3>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-[#dce4e4]">Data Simulasi</p>
            <p className="mt-1 text-xs text-[#849495]">
              {mqttConnected
                ? "MQTT aktif — simulasi dinonaktifkan."
                : "Hasilkan data dummy ketika perangkat tidak terhubung."}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleSimulation}
            disabled={mqttConnected}
            className="inline-flex items-center gap-2 rounded border border-[#00f2ff]/35 bg-[#00f2ff]/10 px-4 py-2 text-sm font-semibold text-[#00f2ff] transition hover:bg-[#00f2ff]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Radio size={16} className={simulationEnabled && !mqttConnected ? "animate-pulse" : ""} />
            {mqttConnected ? "MQTT Aktif" : simulationEnabled ? "Hentikan Simulasi" : "Mulai Simulasi"}
          </button>
        </div>
      </section>
    </section>
  );
}
